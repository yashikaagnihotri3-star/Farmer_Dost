import { z } from 'zod';

export const languages = ['en', 'hi', 'pa'];
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const mobile = z.string().trim().transform((value) => value.replace(/[\s()-]/g, '')).refine((value) => /^(?:\+91)?[6-9]\d{9}$/.test(value), 'invalid_mobile').transform((value) => {
  const digits = value.replace(/^\+91/, '');
  return `+91${digits}`;
});
const password = z.string().min(8).max(72)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'password_too_long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 'weak_password');

export const registerSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  email,
  mobile,
  password,
  preferredLanguage: z.enum(languages),
  acceptTerms: z.literal(true),
}).strict();

export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(72),
}).strict();

export const languageSchema = z.object({ preferredLanguage: z.enum(languages) }).strict();

export function formatValidationError(error) {
  return Object.fromEntries(error.issues.map((issue) => {
    const field = issue.path[0] ?? 'request';
    let code = issue.message;
    if (code === 'Invalid email address') code = 'invalid_email';
    else if (issue.code === 'too_small') code = 'required';
    else if (field === 'acceptTerms') code = 'terms_required';
    else if (code === 'Invalid input') code = field === 'preferredLanguage' ? 'invalid_language' : 'invalid_value';
    else if (issue.code === 'too_big') code = 'too_long';
    else if (field === 'password' && issue.code === 'invalid_format') code = 'weak_password';
    return [field, code];
  }));
}

export const normalizeEmail = (value) => value.trim().toLowerCase();
export function normalizeMobile(value) {
  const digits = value.trim().replace(/[\s()-]/g, '').replace(/^\+91/, '');
  return `+91${digits}`;
}
