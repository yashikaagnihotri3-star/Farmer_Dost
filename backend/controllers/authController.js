
import { randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { createAuthService } from '../services/authService.js';
import {
  formatValidationError,
  languageSchema,
  loginSchema,
  registerSchema,
  languages,
} from '../utils/validation.js';

const identifierSchema = z.string().trim().min(1).max(254).refine((value) => {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  return /^(?:\+91[-\s]?)?[6-9]\d{9}$/.test(
    value.replace(/[\s()-]/g, '')
  );
}, 'invalid_identifier');

const googleLoginSchema = z.object({
  credential: z.string().min(1),
  acceptTerms: z.boolean(),
  preferredLanguage: z.enum(languages).optional(),
}).strict();

function sessionCall(session, method) {
  return new Promise((resolve, reject) => {
    session[method]((error) => error ? reject(error) : resolve());
  });
}

export function createAuthController(options = {}) {
  const service = options.service ?? createAuthService(options);
  const googleClientId = options.googleClientId ?? '';
  const googleClient = googleClientId
    ? new OAuth2Client(googleClientId)
    : null;

  return {
    csrf(req, res, next) {
      try {
        if (!req.session.csrfToken) {
          req.session.csrfToken = randomBytes(32).toString('hex');
        }
        return res.json({ csrfToken: req.session.csrfToken });
      } catch (error) {
        return next(error);
      }
    },

    async register(req, res, next) {
      const parsed = registerSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            fields: formatValidationError(parsed.error),
          },
        });
      }

      try {
        const user = await service.register(parsed.data);
        return res.status(201).json({ user });
      } catch (error) {
        if ([
          'EMAIL_TAKEN',
          'MOBILE_TAKEN',
          'ACCOUNT_EXISTS',
        ].includes(error.message)) {
          return res.status(409).json({
            error: { code: error.message },
          });
        }

        return next(error);
      }
    },

    async login(req, res, next) {
      const parsed = loginSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            fields: formatValidationError(parsed.error),
          },
        });
      }

      const identifier = identifierSchema.safeParse(
        parsed.data.identifier
      );

      if (!identifier.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            fields: { identifier: 'invalid_identifier' },
          },
        });
      }

      try {
        const user = await service.login(
          identifier.data,
          parsed.data.password
        );

        await sessionCall(req.session, 'regenerate');
        req.session.userId = user.id;
        req.session.csrfToken = randomBytes(32).toString('hex');
        await sessionCall(req.session, 'save');

        return res.json({ user });
      } catch (error) {
        return next(error);
      }
    },

    async googleLogin(req, res, next) {
      if (!googleClient) {
        return res.status(503).json({
          error: { code: 'GOOGLE_AUTH_NOT_CONFIGURED' },
        });
      }

      const parsed = googleLoginSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            fields: formatValidationError(parsed.error),
          },
        });
      }

      let payload;

      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: parsed.data.credential,
          audience: googleClientId,
        });

        payload = ticket.getPayload();
      } catch {
        return res.status(401).json({
          error: { code: 'GOOGLE_AUTH_FAILED' },
        });
      }

      if (
        !payload ||
        !payload.sub ||
        !payload.email ||
        payload.email_verified !== true ||
        !payload.name
      ) {
        return res.status(401).json({
          error: { code: 'GOOGLE_AUTH_FAILED' },
        });
      }

      try {
        const user = await service.googleLogin({
          googleId: payload.sub,
          email: payload.email,
          emailVerified: payload.email_verified,
          fullName: payload.name,
          preferredLanguage: parsed.data.preferredLanguage ?? 'en',
          acceptTerms: parsed.data.acceptTerms,
        });

        await sessionCall(req.session, 'regenerate');
        req.session.userId = user.id;
        req.session.csrfToken = randomBytes(32).toString('hex');
        await sessionCall(req.session, 'save');

        return res.json({ user });
      } catch (error) {
        if ([
          'GOOGLE_EMAIL_EXISTS',
          'GOOGLE_ACCOUNT_CONFLICT',
        ].includes(error.message)) {
          return res.status(409).json({
            error: { code: error.message },
          });
        }

        if (error.message === 'TERMS_REQUIRED') {
          return res.status(400).json({
            error: { code: 'TERMS_REQUIRED' },
          });
        }

        return next(error);
      }
    },

    async me(req, res, next) {
      try {
        const user = await service.findPublicById(
          req.session.userId
        );

        if (!user) {
          await sessionCall(req.session, 'destroy');
          return res.status(401).json({
            error: { code: 'UNAUTHENTICATED' },
          });
        }

        return res.json({ user });
      } catch (error) {
        return next(error);
      }
    },

    async updatePreferences(req, res, next) {
      const parsed = languageSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            fields: formatValidationError(parsed.error),
          },
        });
      }

      try {
        const user = await service.updateLanguage(
          req.session.userId,
          parsed.data.preferredLanguage
        );

        if (!user) {
          return res.status(401).json({
            error: { code: 'UNAUTHENTICATED' },
          });
        }

        return res.json({ user });
      } catch (error) {
        return next(error);
      }
    },

    async logout(req, res, next) {
      try {
        if (req.session) {
          await sessionCall(req.session, 'destroy');
        }

        res.clearCookie(
          'farmerdost.sid',
          options.cookieOptions ?? {}
        );

        return res.status(204).end();
      } catch (error) {
        return next(error);
      }
    },
  };
}


