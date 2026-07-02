import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  fullName: string;
  role: string;
  department: string;
  departmentId?: string;
  position?: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  fullName: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'staff', 'viewer', 'department_lead', 'office_clerk'],
    default: 'staff',
  },
  department: { type: String, required: true },
  departmentId: { type: String },
  position: { type: String },
  isActive: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
