import mongoose from 'mongoose';

const CapturedTokenSchema = new mongoose.Schema({
  userId: { type: String, required: true, default: 'anonymous', index: true }, // Discord ID or extension ID
  token: { type: String, required: true }, // Full Authorization header value
  tokenHash: { type: String, required: true, index: true }, // Hashed for dedup
  source: { type: String }, // URL where it was captured
  isValid: { type: Boolean, default: true },
  lastUsed: { type: Date, default: Date.now },
  capturedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }, // If we can detect expiry
  linkedAt: { type: Date }, // When linked to a Discord user
  userAgent: { type: String },
  ipAddress: { type: String },
  embarkUserId: { type: String },
  embarkUsername: { type: String },
  embarkProfile: { type: mongoose.Schema.Types.Mixed, default: null },
  // Cached working endpoint for this token (discovered via probing)
  workingEndpoint: { type: String },
  endpointDiscoveredAt: { type: Date },
});

// TTL: auto-delete tokens older than 7 days
CapturedTokenSchema.index({ capturedAt: 1 }, { expireAfterSeconds: 604800 });

export const CapturedToken = mongoose.model(
  'CapturedToken',
  CapturedTokenSchema,
);
