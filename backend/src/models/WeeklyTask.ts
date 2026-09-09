import mongoose, { Document, Schema } from 'mongoose';

export interface IWeeklyTask extends Document {
  userId: mongoose.Types.ObjectId;
  targetWeekStart: Date;
  weekLabel: string;
  content: string;
  deadline: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskRegistrationOverride extends Document {
  targetWeekStart: Date;
  openedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const weeklyTaskSchema = new Schema<IWeeklyTask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetWeekStart: { type: Date, required: true, index: true },
    weekLabel: { type: String, required: true },
    content: { type: String, required: true },
    deadline: { type: String, default: '' },
  },
  { timestamps: true }
);

weeklyTaskSchema.index({ userId: 1, targetWeekStart: 1 }, { unique: true });

const overrideSchema = new Schema<ITaskRegistrationOverride>(
  {
    targetWeekStart: { type: Date, required: true, unique: true },
    openedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const WeeklyTask = mongoose.model<IWeeklyTask>('WeeklyTask', weeklyTaskSchema);
export const TaskRegistrationOverride = mongoose.model<ITaskRegistrationOverride>(
  'TaskRegistrationOverride',
  overrideSchema
);
