import { timingSafeEqual } from 'node:crypto';

export function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: { code: 'UNAUTHENTICATED' } });
  next();
}

export function requireCsrf(req, res, next) {
  const expected = req.session?.csrfToken;
  const supplied = req.get('x-csrf-token');
  if (!expected || !supplied || expected.length !== supplied.length) {
    return res.status(403).json({ error: { code: 'CSRF_INVALID' } });
  }
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) return res.status(403).json({ error: { code: 'CSRF_INVALID' } });
  next();
}

