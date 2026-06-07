import mongoose from 'mongoose';

const MarketplaceListingSchema = new mongoose.Schema({
  sellerId: { type: String, required: true, index: true }, // Discord user ID
  sellerName: { type: String, required: true },
  sellerSlug: { type: String, default: null }, // Public profile slug for profile links

  // Item details from Embark stash
  itemId: { type: String, required: true },
  itemName: { type: String, required: true },
  itemType: { type: String }, // weapon, gear, consumable, material, etc.
  itemrarity: { type: String }, // common, uncommon, rare, epic, legendary
  itemIconUrl: { type: String },
  itemQuantity: { type: Number, default: 1 },
  itemStats: { type: mongoose.Schema.Types.Mixed }, // Flexible stats object

  // Listing details
  price: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'credits', enum: ['credits', 'tokens'] },
  description: { type: String, default: '' },
  condition: {
    type: String,
    default: 'mint',
    enum: ['mint', 'used', 'damaged'],
  },

  // Status
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'sold', 'cancelled', 'expired'],
  },

  // Embark stash reference (so we can verify ownership)
  stashItemRef: { type: String }, // Reference to the original stash item ID

  // Transaction
  buyerId: { type: String },
  buyerName: { type: String },
  soldAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }, // 7 days default
});

// Auto-expire listings after 7 days
MarketplaceListingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
MarketplaceListingSchema.index({ status: 1, itemType: 1 });
MarketplaceListingSchema.index({ status: 1, itemrarity: 1 });
MarketplaceListingSchema.index({ price: 1 });

export const MarketplaceListing = mongoose.model(
  'MarketplaceListing',
  MarketplaceListingSchema,
);
