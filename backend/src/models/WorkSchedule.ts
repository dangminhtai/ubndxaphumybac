import mongoose, { Document, Schema } from 'mongoose';

export type WorkSchedulePriority = 'low' | 'medium' | 'high' | 'urgent';
export type WorkScheduleStatus = 'not_started' | 'in_progress' | 'completed' | 'postponed' | 'cancelled';

export interface IWorkSchedule extends Document {
  title: string;
  date: Date;
  startTime: string;
  endTime?: string;
  location?: string;
  field: string;
  priority: WorkSchedulePriority;
  status: WorkScheduleStatus;
  chairPerson?: string;
  executorIds: mongoose.Types.ObjectId[];
  participantText?: string;
  preparingAgency?: string;
  monitoringOfficer?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  content?: string;
  notes?: string;
  cancelReason?: string;
  completedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workScheduleSchema = new Schema<IWorkSchedule>(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true, index: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, trim: true },
    location: { type: String, trim: true },
    field: { type: String, required: true, trim: true, index: true },
    priority: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'urgent'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['not_started', 'in_progress', 'completed', 'postponed', 'cancelled'],
      index: true,
    },
    chairPerson: { type: String, trim: true },
    executorIds: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    participantText: { type: String, trim: true },
    preparingAgency: { type: String, trim: true },
    monitoringOfficer: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },
    attachmentName: { type: String, trim: true },
    content: { type: String, trim: true },
    notes: { type: String, trim: true },
    cancelReason: { type: String, trim: true },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isDeleted: { type: Boolean, required: true, default: false, index: true },
  },
  { timestamps: true }
);

workScheduleSchema.index({ date: 1, startTime: 1 });
workScheduleSchema.index({ executorIds: 1, date: 1 });
workScheduleSchema.index({ field: 1, date: 1 });

const WorkSchedule = mongoose.model<IWorkSchedule>('WorkSchedule', workScheduleSchema);
export default WorkSchedule;
