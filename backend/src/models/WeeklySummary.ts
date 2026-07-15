import mongoose, { Document, Schema } from 'mongoose';

export interface IWeeklySummary extends Document {
  periodId: mongoose.Types.ObjectId;
  periodTitle: string;
  sourceReportIds: mongoose.Types.ObjectId[];
  sourceGeneratedAt?: Date;
  content: string;
  difficulties: string;
  proposals: string;
  nextTasks: string;
  status: 'draft' | 'published' | 'archived';
  authorId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const weeklySummarySchema = new Schema<IWeeklySummary>({
  periodId: { type: Schema.Types.ObjectId, ref: 'ReportPeriod', required: true, unique: true },
  periodTitle: { type: String, required: true },
  sourceReportIds: [{ type: Schema.Types.ObjectId, ref: 'Report' }],
  sourceGeneratedAt: { type: Date },
  content: { type: String, default: '' },
  difficulties: { type: String, default: '' },
  proposals: { type: String, default: '' },
  nextTasks: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, collection: 'weekly_summaries' });

export default mongoose.model<IWeeklySummary>('WeeklySummary', weeklySummarySchema);
