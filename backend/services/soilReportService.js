import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { SoilReport } from '../models/SoilReport.js';

const UPLOAD_ID = /^[a-f0-9-]{36}$/i;

export function createSoilReportService({ uploadRoot }) {
  const userDir = (userId) => path.join(uploadRoot, String(userId));
  const uploadPath = (userId, id) => path.join(userDir(userId), id);
  const metadataPath = (userId, id) => path.join(userDir(userId), `${id}.json`);
  const consumeUpload = (userId, id) => fs.rm(metadataPath(userId, id), { force: true });

  async function readUpload(userId, id) {
    if (typeof id !== 'string' || !UPLOAD_ID.test(id)) return null;
    try {
      const metadata = JSON.parse(await fs.readFile(metadataPath(userId, id), 'utf8'));
      await fs.access(uploadPath(userId, id));
      return metadata;
    } catch { return null; }
  }

  async function removeFile(userId, file) {
    if (!file?.storageId || !UPLOAD_ID.test(file.storageId)) return;
    await Promise.all([
      fs.rm(uploadPath(userId, file.storageId), { force: true }),
      fs.rm(metadataPath(userId, file.storageId), { force: true }),
    ]);
  }

  async function cleanupExpiredUploads(userId) {
    const dir = userDir(userId);
    let names;
    try { names = await fs.readdir(dir); } catch { return; }
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const name of names) {
      if (!name.endsWith('.json')) continue;
      const id = name.slice(0, -5);
      if (!UPLOAD_ID.test(id)) continue;
      try {
        const info = await fs.stat(metadataPath(userId, id));
        if (info.mtimeMs < cutoff) await removeFile(userId, { storageId: id });
      } catch { /* Ignore files removed by another request. */ }
    }
  }

  return {
    list: (userId) => SoilReport.find({ userId }).sort({ updatedAt: -1 }).lean(),
    get: (userId, id) => SoilReport.findOne({ _id: id, userId }).lean(),
    async create(userId, data) {
      const reportFile = data.uploadId ? await readUpload(userId, data.uploadId) : undefined;
      if (data.uploadId && !reportFile) throw Object.assign(new Error('UPLOAD_NOT_FOUND'), { status: 400 });
      const { uploadId, ...fields } = data;
      const report = await SoilReport.create({ ...fields, userId, reportFile, entryMethod: reportFile ? 'upload' : 'manual' });
      if (uploadId) await consumeUpload(userId, uploadId);
      return report.toObject();
    },
    async update(userId, id, data) {
      const current = await SoilReport.findOne({ _id: id, userId });
      if (!current) return null;
      const previousFile = current.reportFile?.toObject?.() ?? current.reportFile;
      let reportFile = current.reportFile?.toObject?.() ?? current.reportFile;
      if (data.uploadId) {
        reportFile = await readUpload(userId, data.uploadId);
        if (!reportFile) throw Object.assign(new Error('UPLOAD_NOT_FOUND'), { status: 400 });
      } else if (data.removeReportFile) reportFile = undefined;
      const { uploadId, removeReportFile, ...fields } = data;
      Object.assign(current, fields, { reportFile, entryMethod: reportFile ? 'upload' : 'manual' });
      await current.save();
      if (data.uploadId) await consumeUpload(userId, data.uploadId);
      if (removeReportFile || (data.uploadId && reportFile?.storageId !== previousFile?.storageId)) {
        await removeFile(userId, previousFile);
      }
      return current.toObject();
    },
    async remove(userId, id) {
      const report = await SoilReport.findOneAndDelete({ _id: id, userId });
      if (!report) return null;
      await removeFile(userId, report.reportFile);
      return report.toObject();
    },
    async saveUploadedFile(userId, file) {
      await cleanupExpiredUploads(userId);
      const allowed = new Map([
        ['application/pdf', { extension: '.pdf', signature: Buffer.from('%PDF-') }],
        ['image/jpeg', { extension: '.jpg', signature: Buffer.from([0xff, 0xd8, 0xff]) }],
        ['image/png', { extension: '.png', signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
      ]);
      const spec = allowed.get(file.mimetype);
      const handle = await fs.open(file.path, 'r');
      let valid = false;
      try {
        const header = Buffer.alloc(spec.signature.length);
        const { bytesRead } = await handle.read(header, 0, header.length, 0);
        valid = bytesRead === header.length && header.equals(spec.signature);
      } finally { await handle.close(); }
      if (!valid) {
        await removeFile(userId, { storageId: file.filename });
        throw Object.assign(new Error('INVALID_FILE_CONTENT'), { status: 415 });
      }
      const originalName = path.basename(file.originalname).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || `soil-report${spec.extension}`;
      const metadata = { storageId: file.filename, originalName, mimeType: file.mimetype, size: file.size };
      try { await fs.writeFile(metadataPath(userId, file.filename), JSON.stringify(metadata), { flag: 'wx', mode: 0o600 }); }
      catch (error) { await fs.rm(file.path, { force: true }); throw error; }
      return metadata;
    },
    async openReportFile(userId, id) {
      const report = await SoilReport.findOne({ _id: id, userId }).select('reportFile').lean();
      if (!report?.reportFile) return null;
      const fullPath = uploadPath(userId, report.reportFile.storageId);
      try { await fs.access(fullPath); } catch { return null; }
      return { stream: createReadStream(fullPath), ...report.reportFile };
    },
  };
}
