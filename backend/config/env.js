import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').refine((value) => /^mongodb(?:\+srv)?:\/\//.test(value), 'MONGODB_URI must be a MongoDB connection string'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must contain at least 32 characters'),
  FRONTEND_ORIGIN: z.string().url().refine((value) => new URL(value).origin === value, 'FRONTEND_ORIGIN must be an origin without a path or trailing slash'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  GOOGLE_CLIENT_ID: z.string().default(''),
});

export function readConfig(env = process.env) {
  const result = schema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const config = result.data;
  if (config.COOKIE_SAME_SITE === 'none' && config.NODE_ENV !== 'production') {
    throw new Error('COOKIE_SAME_SITE=none requires NODE_ENV=production and secure cookies');
  }
  return {
    ...config,
    cookie: {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: config.COOKIE_SAME_SITE,
      path: '/',
    },
  };
}
