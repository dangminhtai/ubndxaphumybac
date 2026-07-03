import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  category: string;
  userId?: mongoose.Types.ObjectId;
  username?: string;
  fullName?: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  ip?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['auth', 'report', 'period', 'user', 'export', 'summary'],
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    username: { type: String },
    fullName: { type: String },
    targetType: { type: String },
    targetId: { type: String },
    details: { type: String },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
