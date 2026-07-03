import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: string; // 'system', 'period_opened', 'report_returned'
  link?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true, default: 'system' },
    link: { type: String },
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
