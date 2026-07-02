import mongoose, { Document, Schema } from 'mongoose';

export interface IMonthlySummary extends Document {
  periodId: mongoose.Types.ObjectId;
  periodTitle: string; // e.g. "Tháng 6/2026"
  content: string;
  difficulties: string;
  proposals: string;
  nextTasks: string;
  status: 'draft' | 'published';
  authorId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const monthlySummarySchema = new Schema<IMonthlySummary>(
  {
    periodId: { type: Schema.Types.ObjectId, ref: 'ReportPeriod', required: true, unique: true },
    periodTitle: { type: String, required: true },
    content: { type: String, default: '' },
    difficulties: { type: String, default: '' },
    proposals: { type: String, default: '' },
    nextTasks: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const MonthlySummary = mongoose.model<IMonthlySummary>('MonthlySummary', monthlySummarySchema);
