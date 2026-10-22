
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { User, toPublicUser } from '../models/User.js';
import { normalizeEmail, normalizeMobile } from '../utils/validation.js';

export function createAuthService({
  UserModel = User,
  bcryptRounds = 12,
} = {}) {
  const dummyHash = bcrypt.hash(
    randomBytes(32).toString('hex'),
    bcryptRounds
  );

  return {
    async register(input) {
      const email = normalizeEmail(input.email);
      const mobile = normalizeMobile(input.mobile);
      const passwordHash = await bcrypt.hash(
        input.password,
        bcryptRounds
      );

      try {
        const user = await UserModel.create({
          fullName: input.fullName.trim(),
          email,
          mobile,
          passwordHash,
          preferredLanguage: input.preferredLanguage,
          termsAcceptedAt: new Date(),
        });

        return toPublicUser(user);
      } catch (error) {
        if (error?.code === 11000) {
          const field = error.keyPattern?.email
            ? 'email'
            : error.keyPattern?.mobile
              ? 'mobile'
              : 'account';

          const duplicate = new Error(
            field === 'account'
              ? 'ACCOUNT_EXISTS'
              : `${field.toUpperCase()}_TAKEN`
          );

          duplicate.status = 409;
          throw duplicate;
        }

        throw error;
      }
    },

    async login(identifier, plainPassword) {
      const normalizedEmail = normalizeEmail(identifier);

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      );

      const selector = isEmail
        ? { email: normalizedEmail }
        : { mobile: normalizeMobile(identifier) };

      const user = await UserModel.findOne(selector)
        .select('+passwordHash');

      const matches = await bcrypt.compare(
        plainPassword,
        user?.passwordHash ?? await dummyHash
      );

      if (!user || !matches) {
        const error = new Error('INVALID_CREDENTIALS');
        error.status = 401;
        throw error;
      }

      return toPublicUser(user);
    },

    async googleLogin({
      googleId,
      email,
      emailVerified,
      fullName,
      preferredLanguage = 'en',
      acceptTerms,
    }) {
      if (
        !googleId ||
        !email ||
        emailVerified !== true ||
        typeof fullName !== 'string' ||
        !fullName.trim()
      ) {
        const error = new Error('GOOGLE_AUTH_FAILED');
        error.status = 401;
        throw error;
      }

      const normalizedEmail = normalizeEmail(email);

      // Recognize returning Google users.
      const existingGoogleUser = await UserModel.findOne({
        googleId,
      });

      if (existingGoogleUser) {
        return toPublicUser(existingGoogleUser);
      }

      // Never silently link a Google identity to an existing account.
      const existingEmailUser = await UserModel.findOne({
        email: normalizedEmail,
      });

      if (existingEmailUser) {
        const error = new Error('GOOGLE_EMAIL_EXISTS');
        error.status = 409;
        throw error;
      }

      // Require explicit terms acceptance for new accounts.
      if (acceptTerms !== true) {
        const error = new Error('TERMS_REQUIRED');
        error.status = 400;
        throw error;
      }

      try {
        const user = await UserModel.create({
          fullName: fullName.trim(),
          email: normalizedEmail,
          googleId,
          preferredLanguage,
          termsAcceptedAt: new Date(),
        });

        return toPublicUser(user);
      } catch (error) {
        if (error?.code === 11000) {
          const conflict = new Error('GOOGLE_ACCOUNT_CONFLICT');
          conflict.status = 409;
          throw conflict;
        }

        throw error;
      }
    },

    async findPublicById(id) {
      const user = await UserModel.findById(id);
      return user ? toPublicUser(user) : null;
    },

    async updateLanguage(id, preferredLanguage) {
      const user = await UserModel.findByIdAndUpdate(
        id,
        { preferredLanguage },
        {
          returnDocument: 'after',
          runValidators: true,
        }
      );

      return user ? toPublicUser(user) : null;
    },
  };
}

