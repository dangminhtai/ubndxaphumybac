import mongoose, { Schema, Document } from 'mongoose';

export type ReportPeriodType = 'weekly' | 'monthly';
export type ReportPeriodStatus = 'draft' | 'open' | 'locked' | 'archived';

export interface IReportPeriod extends Document {
  type: ReportPeriodType;
  title: string;
  weekNumber?: number;
  month?: number;
  year: number;
  startDate: Date;
  dueDate: Date;
  status: ReportPeriodStatus;
  createdBy: mongoose.Types.ObjectId;
}

const ReportPeriodSchema = new Schema<IReportPeriod>({
  type: { type: String, required: true, enum: ['weekly', 'monthly'] },
  title: { type: String, required: true },
  weekNumber: { type: Number },
  month: { type: Number },
  year: { type: Number, required: true },
  startDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, required: true, enum: ['draft', 'open', 'locked', 'archived'], default: 'draft' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ReportPeriodSchema.index(
  { type: 1, year: 1, month: 1, weekNumber: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'archived' } } }
);

export default mongoose.model<IReportPeriod>('ReportPeriod', ReportPeriodSchema);
