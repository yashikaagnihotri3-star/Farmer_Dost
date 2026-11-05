import mongoose from 'mongoose';

const reportFileSchema = new mongoose.Schema({
  storageId: { type: String, match: /^[a-f0-9-]{36}$/i, required: true },
  originalName: { type: String, required: true, maxlength: 180 },
  mimeType: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'], required: true },
  size: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024 },
}, { _id: false });

const soilReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reportName: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  farmerName: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  soilType: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
  soilPH: { type: Number, min: 0, max: 14 },
  nitrogen: { type: Number, min: 0, max: 100000 },
  phosphorus: { type: Number, min: 0, max: 100000 },
  potassium: { type: Number, min: 0, max: 100000 },
  organicCarbon: { type: Number, min: 0, max: 100 },
  moisture: { type: Number, min: 0, max: 100 },
  electricalConductivity: { type: Number, min: 0, max: 100000 },
  testDate: { type: Date, required: true },
  location: { type: String, required: true, trim: true, minlength: 1, maxlength: 180 },
  reportFile: { type: reportFileSchema, default: undefined },
  entryMethod: { type: String, enum: ['manual', 'upload'], required: true, default: 'manual' },
  extractionStatus: { type: String, enum: ['not_requested', 'unavailable', 'manual_review'], default: 'not_requested' },
}, { timestamps: true, versionKey: false });

soilReportSchema.index({ userId: 1, updatedAt: -1 });

export const SoilReport = mongoose.model('SoilReport', soilReportSchema);
