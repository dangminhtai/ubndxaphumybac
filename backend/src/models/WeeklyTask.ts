import mongoose, { Document, Schema } from 'mongoose';

/* ── Sub-document: a single task item ── */
export interface ITaskItem {
  content: string;
  deadline: string;
}

const taskItemSchema = new Schema<ITaskItem>(
  {
    content: { type: String, required: true },
    deadline: { type: String, default: '' },
  },
  { _id: false }
);

/* ── Main document ── */
export interface IWeeklyTask extends Document {
  userId: mongoose.Types.ObjectId;
  targetWeekStart: Date;
  weekLabel: string;
  items: ITaskItem[];
  /** @deprecated kept for backward-compat with old docs that have single content/deadline */
  content?: string;
  /** @deprecated */
  deadline?: string;
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
    items: { type: [taskItemSchema], default: [] },
    // Legacy single-value fields (kept for reading old data)
    content: { type: String },
    deadline: { type: String },
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
