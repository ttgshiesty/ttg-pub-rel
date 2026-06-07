import mongoose from 'mongoose';

/* =========================================================
   MarketplacePriceSnapshot
   One row per listing event (created OR sold). Used to build
   per-item price history charts and detect undercuts.
   ========================================================= */

const MarketplacePriceSnapshotSchema = new mongoose.Schema({
  itemId: { type: String, required: true, index: true },
  itemName: { type: String, default: '' },
  itemrarity: { type: String, default: '' },

  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, default: 1, min: 1 },
  currency: { type: String, default: 'credits' },

  // What event produced this snapshot.
  event: {
    type: String,
    enum: ['listed', 'sold', 'cancelled', 'expired'],
    default: 'listed',
    index: true,
  },

  // Cross-references for forensics
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketplaceListing',
  },
  sellerId: { type: String, default: '' },

  createdAt: { type: Date, default: Date.now, index: true },
});

// Most queries: "give me the last N snapshots for itemId X".
MarketplacePriceSnapshotSchema.index({ itemId: 1, createdAt: -1 });

export const MarketplacePriceSnapshot = mongoose.model(
  'MarketplacePriceSnapshot',
  MarketplacePriceSnapshotSchema,
);

export default MarketplacePriceSnapshot;
