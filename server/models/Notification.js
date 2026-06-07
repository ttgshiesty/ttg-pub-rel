import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        'wanted_alert',
        'sale',
        'offer_received',
        'offer_accepted',
        'offer_declined',
        'raid',
        'level_up',
        'system',
      ],
      default: 'system',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    link: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { id: false },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });

export const Notification = mongoose.model('Notification', NotificationSchema);

export async function pushNotification(
  userId,
  { type = 'system', title, message, link = null, meta = {} },
) {
  try {
    await Notification.create({ userId, type, title, message, link, meta });
  } catch (err) {
    console.error('[Notification] Failed to push:', err.message);
  }
}
