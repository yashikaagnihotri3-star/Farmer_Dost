import { randomBytes } from 'node:crypto';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import helmet from 'helmet';
import { createAuthRouter } from './routes/authRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

export function createApp(config) {
  const app = express();
  if (config.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_ORIGIN, credentials: true, methods: ['GET', 'POST', 'PATCH'], allowedHeaders: ['Content-Type', 'X-CSRF-Token'] }));
  app.use(express.json({ limit: '16kb', strict: true }));
  const sessionStore = MongoStore.create({ mongoUrl: config.MONGODB_URI, collectionName: 'sessions', ttl: 60 * 60 * 24 * 7 });
  app.locals.sessionStore = sessionStore;
  app.use(session({
    name: 'farmerdost.sid',
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    genid: () => randomBytes(32).toString('hex'),
    store: sessionStore,
    cookie: { ...config.cookie, maxAge: 1000 * 60 * 60 * 24 * 7 },
  }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', createAuthRouter({
    bcryptRounds: config.BCRYPT_ROUNDS,
    cookieOptions: config.cookie,
    authLimit: config.NODE_ENV === 'test' ? 1000 : undefined,
    googleClientId: config.GOOGLE_CLIENT_ID,
  }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
