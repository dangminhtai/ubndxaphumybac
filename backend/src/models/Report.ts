import mongoose, { Schema, Document } from 'mongoose';
import type { FieldReport } from '../domain/fields';

export interface IReport extends Document {
  title: string;
  ownerId?: mongoose.Types.ObjectId;
  periodId?: mongoose.Types.ObjectId;
  reportType?: string;
  period?: string;
  reportTitle?: string;
  startDate?: Date;
  endDate?: Date;
  field?: string;
  fieldReports?: FieldReport[];
  department: string;
  sender: string;
  status: string; // 'draft', 'pending', 'approved', 'rejected'
  content: string;
  administrativeReform?: string;
  digitalTransformation?: string;
  nextTasks?: string;
  difficulties?: string;
  proposals?: string;
  dueDate?: Date;
  submittedAt?: Date;
}

const ReportSchema: Schema = new Schema({
  title: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
  periodId: { type: Schema.Types.ObjectId, ref: 'ReportPeriod' },
  reportType: { type: String, default: 'general' },
  period: { type: String },
  reportTitle: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  field: { type: String },
  fieldReports: { type: [new Schema({
    fieldCode: { type: String, enum: ['LV1', 'LV2', 'LV3', 'LV4', 'LV5', 'LV6', 'LV7', 'LV8'], required: true },
    fieldName: { type: String, required: true },
    content: { type: String, default: '' }, difficulties: { type: String, default: '' },
    proposals: { type: String, default: '' }, nextTasks: { type: String, default: '' },
  }, { _id: false })], default: undefined },
  department: { type: String, required: true },
  sender: { type: String, required: true },
  status: { type: String, required: true, default: 'draft' },
  content: { type: String, required: function(this: { reportType?: string; status?: string }) { return !(this.reportType === 'weekly' && this.status === 'draft'); } },
  administrativeReform: { type: String },
  digitalTransformation: { type: String },
  nextTasks: { type: String },
  difficulties: { type: String },
  proposals: { type: String },
  dueDate: { type: Date },
  submittedAt: { type: Date }
}, { timestamps: true });

ReportSchema.index(
  { ownerId: 1, periodId: 1, reportType: 1 },
  { unique: true, partialFilterExpression: { ownerId: { $exists: true }, periodId: { $exists: true } } }
);

export default mongoose.model<IReport>('Report', ReportSchema);
