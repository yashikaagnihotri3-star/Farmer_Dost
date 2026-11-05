import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireAuth, requireCsrf } from '../middleware/authMiddleware.js';
import { createSoilReportController } from '../controllers/soilReportController.js';
import { createSoilReportService } from '../services/soilReportService.js';
import { createSoilUploadMiddleware } from '../middleware/soilReportUpload.js';

export function createSoilReportRouter({ uploadRoot }) {
  const router = Router();
  const service = createSoilReportService({ uploadRoot });
  const controller = createSoilReportController(service);
  const upload = createSoilUploadMiddleware(uploadRoot);
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED' } }),
  });
  router.use(requireAuth);
  router.get('/', controller.list);
  router.post('/', requireCsrf, controller.create);
  router.post('/upload', requireCsrf, uploadLimiter, upload, controller.upload);
  router.get('/:id/file', controller.file);
  router.get('/:id', controller.get);
  router.put('/:id', requireCsrf, controller.update);
  router.delete('/:id', requireCsrf, controller.remove);
  return router;
}
