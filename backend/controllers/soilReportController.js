import mongoose from 'mongoose';
import { z } from 'zod';
import { formatValidationError } from '../utils/validation.js';

const optionalNumber = (min, max) => z.preprocess(
  (value) => value === '' || value === null ? undefined : typeof value === 'string' ? Number(value) : value,
  z.number().finite().min(min).max(max).optional(),
);
const testDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, 'invalid_date').transform((value) => new Date(`${value}T00:00:00.000Z`));
const createSchema = z.object({
  reportName: z.string().trim().min(1).max(120),
  farmerName: z.string().trim().min(1).max(100),
  soilType: z.string().trim().min(1).max(80),
  soilPH: optionalNumber(0, 14),
  nitrogen: optionalNumber(0, 100000),
  phosphorus: optionalNumber(0, 100000),
  potassium: optionalNumber(0, 100000),
  organicCarbon: optionalNumber(0, 100),
  moisture: optionalNumber(0, 100),
  electricalConductivity: optionalNumber(0, 100000),
  testDate,
  location: z.string().trim().min(1).max(180),
  uploadId: z.string().regex(/^[a-f0-9-]{36}$/i).optional(),
  extractionStatus: z.enum(['not_requested', 'unavailable', 'manual_review']).optional(),
}).strict();
const updateSchema = createSchema.partial().extend({ removeReportFile: z.boolean().optional() });

function reportId(value) { return mongoose.isValidObjectId(value); }
function validBody(schema, body, res) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', fields: formatValidationError(parsed.error) } });
    return null;
  }
  return parsed.data;
}
function publicReport(report) {
  if (!report) return report;
  const value = { ...report, id: String(report._id) };
  delete value._id;
  delete value.userId;
  if (value.reportFile) {
    value.reportFile = { originalName: value.reportFile.originalName, mimeType: value.reportFile.mimeType, size: value.reportFile.size };
  }
  return value;
}

export function createSoilReportController(service) {
  return {
    async list(req, res, next) {
      try { return res.json({ reports: (await service.list(req.session.userId)).map(publicReport) }); }
      catch (error) { return next(error); }
    },
    async get(req, res, next) {
      if (!reportId(req.params.id)) return res.status(400).json({ error: { code: 'INVALID_REPORT_ID' } });
      try {
        const report = await service.get(req.session.userId, req.params.id);
        return report ? res.json({ report: publicReport(report) }) : res.status(404).json({ error: { code: 'REPORT_NOT_FOUND' } });
      } catch (error) { return next(error); }
    },
    async create(req, res, next) {
      const data = validBody(createSchema, req.body, res);
      if (!data) return;
      try { return res.status(201).json({ report: publicReport(await service.create(req.session.userId, data)) }); }
      catch (error) { return next(error); }
    },
    async update(req, res, next) {
      if (!reportId(req.params.id)) return res.status(400).json({ error: { code: 'INVALID_REPORT_ID' } });
      const data = validBody(updateSchema, req.body, res);
      if (!data) return;
      try {
        const report = await service.update(req.session.userId, req.params.id, data);
        return report ? res.json({ report: publicReport(report) }) : res.status(404).json({ error: { code: 'REPORT_NOT_FOUND' } });
      } catch (error) { return next(error); }
    },
    async remove(req, res, next) {
      if (!reportId(req.params.id)) return res.status(400).json({ error: { code: 'INVALID_REPORT_ID' } });
      try {
        const report = await service.remove(req.session.userId, req.params.id);
        return report ? res.status(204).end() : res.status(404).json({ error: { code: 'REPORT_NOT_FOUND' } });
      } catch (error) { return next(error); }
    },
    async upload(req, res, next) {
      if (!req.file) return res.status(400).json({ error: { code: 'FILE_REQUIRED' } });
      try {
        const { storageId, ...metadata } = await service.saveUploadedFile(req.session.userId, req.file);
        return res.status(201).json({ file: { ...metadata, uploadId: storageId } });
      }
      catch (error) { return next(error); }
    },
    async file(req, res, next) {
      if (!reportId(req.params.id)) return res.status(400).json({ error: { code: 'INVALID_REPORT_ID' } });
      try {
        const file = await service.openReportFile(req.session.userId, req.params.id);
        if (!file) return res.status(404).json({ error: { code: 'REPORT_FILE_NOT_FOUND' } });
        const safeName = encodeURIComponent(file.originalName).replace(/['()]/g, escape);
        res.set({ 'Content-Type': file.mimeType, 'Content-Length': String(file.size), 'Content-Disposition': `inline; filename*=UTF-8''${safeName}`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' });
        file.stream.on('error', () => res.destroy());
        return file.stream.pipe(res);
      } catch (error) { return next(error); }
    },
  };
}
