import mongoose, { Document, Schema } from 'mongoose';

export interface IGlobalNotification extends Document {
  title: string;
  message: string;
  type: string;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const globalNotificationSchema = new Schema<IGlobalNotification>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true, default: 'system' },
    link: { type: String },
  },
  {
    timestamps: true,
  }
);

globalNotificationSchema.index({ createdAt: -1 });

export default mongoose.models.GlobalNotification || mongoose.model<IGlobalNotification>('GlobalNotification', globalNotificationSchema);
