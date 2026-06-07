import mongoose from 'mongoose';

const BlueprintFindSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, default: '' },
    blueprintId: { type: String, required: true, index: true },
    blueprintName: { type: String, required: true, index: true },
    blueprintImageUrl: { type: String, default: '' },
    rarity: { type: String, default: 'Any' },
    map: { type: String, default: '' },
    condition: { type: String, default: 'Any' },
    container: { type: String, default: '' },
    location: { type: String, default: '' },
    locked: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    source: {
      type: String,
      default: 'manual',
      enum: ['manual', 'sync', 'discord'],
    },
    votes: {
      up: { type: Number, default: 0 },
      down: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

BlueprintFindSchema.index({ blueprintId: 1, createdAt: -1 });
BlueprintFindSchema.index({ map: 1, container: 1 });

export const BlueprintFind = mongoose.model(
  'BlueprintFind',
  BlueprintFindSchema,
);
