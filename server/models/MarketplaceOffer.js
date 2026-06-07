import mongoose from 'mongoose';

const MarketplaceOfferSchema = new mongoose.Schema({
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    ref: 'MarketplaceListing',
  },
  sellerId: { type: String, required: true, index: true },
  sellerName: { type: String, required: true },

  buyerId: { type: String, required: true, index: true },
  buyerName: { type: String, required: true },

  itemName: { type: String, required: true },
  itemType: { type: String, default: 'unknown' },
  itemrarity: { type: String, default: 'common' },
  itemQuantity: { type: Number, default: 1 },
  itemIconUrl: { type: String, default: '' },

  offeredPrice: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'credits', enum: ['credits', 'tokens'] },
  message: { type: String, default: '' },

  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'accepted', 'declined', 'withdrawn', 'expired'],
    index: true,
  },

  respondedAt: { type: Date },
  acceptedAt: { type: Date },
  declinedAt: { type: Date },
  withdrawnAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
});

MarketplaceOfferSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
MarketplaceOfferSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
MarketplaceOfferSchema.index({ buyerId: 1, status: 1, createdAt: -1 });

MarketplaceOfferSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const MarketplaceOffer = mongoose.model(
  'MarketplaceOffer',
  MarketplaceOfferSchema,
);
