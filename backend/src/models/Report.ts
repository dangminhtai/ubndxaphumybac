import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  title: string;
  department: string;
  sender: string;
  status: string; // 'draft', 'pending', 'approved', 'rejected'
  content: string;
  dueDate?: Date;
  submittedAt?: Date;
}

const ReportSchema: Schema = new Schema({
  title: { type: String, required: true },
  department: { type: String, required: true },
  sender: { type: String, required: true },
  status: { type: String, required: true, default: 'draft' },
  content: { type: String, required: true },
  dueDate: { type: Date },
  submittedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model<IReport>('Report', ReportSchema);
