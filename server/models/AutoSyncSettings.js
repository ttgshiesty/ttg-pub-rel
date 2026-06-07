import mongoose from 'mongoose';

const AutoSyncSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  embarkId: { type: String, default: null, index: true },
  enabled: { type: Boolean, default: false },
  intervalMinutes: { type: Number, default: 30 },
  source: {
    type: String,
    enum: ['extension', 'arctracker', 'both'],
    default: 'both',
  },
  lastSyncedAt: { type: Date, default: null },
  nextSyncAt: { type: Date, default: null },
  disabledReason: { type: String, default: null },
  consecutiveFailures: { type: Number, default: 0 },
  lastErrorMessage: { type: String, default: null },
  lastErrorAt: { type: Date, default: null },
});

export const AutoSyncSettings = mongoose.model(
  'AutoSyncSettings',
  AutoSyncSettingsSchema,
);
