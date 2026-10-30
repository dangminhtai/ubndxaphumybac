import mongoose, { Document, Schema } from 'mongoose';
import type { SummaryEntry } from '../services/weekly-summary-groups';

export interface IWeeklySummary extends Document {
  contentFormat?: 'html-v1';
  periodId: mongoose.Types.ObjectId;
  periodTitle: string;
  sourceReportIds: mongoose.Types.ObjectId[];
  sourceGeneratedAt?: Date;
  manuallyEditedAt?: Date;
  autoUpdateFromSources?: boolean;
  entries?: SummaryEntry[];
  content: string;
  nextTasks: string;
  status: 'draft' | 'published' | 'archived';
  authorId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const weeklySummarySchema = new Schema<IWeeklySummary>({
  contentFormat: { type: String, enum: ['html-v1'] },
  periodId: { type: Schema.Types.ObjectId, ref: 'ReportPeriod', required: true, unique: true },
  periodTitle: { type: String, required: true },
  sourceReportIds: [{ type: Schema.Types.ObjectId, ref: 'Report' }],
  sourceGeneratedAt: { type: Date },
  manuallyEditedAt: { type: Date },
  autoUpdateFromSources: { type: Boolean },
  entries: { type: [new Schema({
    contentFormat: { type: String, enum: ['html-v1'] },
    id: { type: String, required: true },
    sourceReportId: { type: String },
    groupId: { type: String, default: null },
    section: { type: String, enum: ['results', 'nextTasks'], required: true },
    text: { type: String, default: '' },
  }, { _id: false })], default: undefined },
  content: { type: String, default: '' },
  nextTasks: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, collection: 'weekly_summaries' });

export default mongoose.model<IWeeklySummary>('WeeklySummary', weeklySummarySchema);
