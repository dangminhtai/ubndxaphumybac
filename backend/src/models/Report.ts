import mongoose, { Schema, Document } from 'mongoose';

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
  department: { type: String, required: true },
  sender: { type: String, required: true },
  status: { type: String, required: true, default: 'draft' },
  content: { type: String, required: true },
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
