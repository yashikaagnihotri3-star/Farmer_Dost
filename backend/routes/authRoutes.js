
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createAuthController } from '../controllers/authController.js';
import { requireAuth, requireCsrf } from '../middleware/authMiddleware.js';

export function createAuthRouter(options = {}) {
  const router = Router();
  const controller = createAuthController(options);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.authLimit ?? 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
      error: { code: 'RATE_LIMITED' },
    }),
  });

  router.get('/csrf', controller.csrf);

  router.post(
    '/register',
    authLimiter,
    requireCsrf,
    controller.register
  );

  router.post(
    '/login',
    authLimiter,
    requireCsrf,
    controller.login
  );

  // Google sign-in endpoint.
  router.post(
    '/google',
    authLimiter,
    requireCsrf,
    controller.googleLogin
  );

  router.post('/logout', requireCsrf, controller.logout);

  router.get('/me', requireAuth, controller.me);

  router.patch(
    '/me/preferences',
    requireAuth,
    requireCsrf,
    controller.updatePreferences
  );

  return router;
}

