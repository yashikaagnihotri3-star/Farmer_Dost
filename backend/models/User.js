
import mongoose from 'mongoose';
import { languages } from '../utils/validation.js';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  },

  // Google accounts may not have provided a mobile number.
  mobile: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },

  // Google accounts authenticate through Google, not a local password.
  passwordHash: {
    type: String,
    select: false,
  },

  // Google's stable, unique account identifier.
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },

  preferredLanguage: {
    type: String,
    enum: languages,
    required: true,
    default: 'en',
  },

  termsAcceptedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  versionKey: false,
});

export const User = mongoose.model('User', userSchema);

export function toPublicUser(user) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    preferredLanguage: user.preferredLanguage,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

