import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';

const MIME_BY_EXTENSION = new Map([
  ['.pdf', 'application/pdf'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.png', 'image/png'],
]);

export function createSoilUploadMiddleware(uploadRoot) {
  const storage = multer.diskStorage({
    destination(req, file, callback) {
      const userDir = path.join(uploadRoot, String(req.session.userId));
      mkdir(userDir, { recursive: true, mode: 0o700 }).then(() => callback(null, userDir), callback);
    },
    filename(req, file, callback) { callback(null, randomUUID()); },
  });
  const upload = multer({
    storage,
    preservePath: false,
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0, parts: 1, fieldNameSize: 80, headerPairs: 100 },
    fileFilter(req, file, callback) {
      const extension = path.extname(file.originalname).toLowerCase();
      const expectedMime = MIME_BY_EXTENSION.get(extension);
      if (!expectedMime || expectedMime !== file.mimetype) {
        const error = new Error('INVALID_FILE_TYPE');
        error.status = 415;
        callback(error);
        return;
      }
      callback(null, true);
    },
  });
  return (req, res, next) => upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: { code: 'FILE_TOO_LARGE' } });
      return res.status(400).json({ error: { code: 'INVALID_UPLOAD' } });
    }
    if (error.status === 415) return res.status(415).json({ error: { code: 'INVALID_FILE_TYPE' } });
    return next(error);
  });
}
