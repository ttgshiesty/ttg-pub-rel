import mongoose from 'mongoose';

const SyncDataSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  source: {
    type: String,
    required: true,
  },
  xboxIp: {
    type: String,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  syncedAt: { type: Date, default: Date.now },
});

export const SyncData = mongoose.model('SyncData', SyncDataSchema);
