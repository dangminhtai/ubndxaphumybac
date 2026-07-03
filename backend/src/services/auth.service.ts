import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { env } from '../config/env';
import { writeAuditLog } from './audit.service';

const SALT_ROUNDS = 10;

export interface RegisterInput {
  username: string;
  password: string;
  fullName: string;
  department: string;
  role?: string;
  position?: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

function buildAuthResponse(user: {
  _id: unknown;
  username: string;
  fullName: string;
  role: string;
  department: string;
  position?: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
}) {
  const token = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    env.jwtSecret,
    { expiresIn: '8h' }
  );

  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      position: user.position,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

function normalizeRole(role?: string) {
  const allowed = ['admin', 'staff', 'viewer', 'department_lead', 'office_clerk'];
  return role && allowed.includes(role) ? role : 'staff';
}

export async function createUser(input: RegisterInput, options: { mustChangePassword?: boolean } = {}) {
  const { username, password, fullName, department, role, position } = input;

  if (!username || !password || !fullName || !department) {
    const error = new Error('Vui lòng điền đầy đủ thông tin bắt buộc');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  if (password.length < 6) {
    const error = new Error('Mật khẩu phải có ít nhất 6 ký tự');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  const existing = await User.findOne({ username });
  if (existing) {
    const error = new Error('Tên đăng nhập đã tồn tại');
    Object.assign(error, { statusCode: 409 });
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    username,
    passwordHash,
    fullName,
    department,
    position,
    role: normalizeRole(role),
    mustChangePassword: Boolean(options.mustChangePassword),
  });
  void writeAuditLog({
    action: 'ADD',
    category: 'user',
    targetType: 'User',
    targetId: String(user._id),
    details: `Tạo tài khoản: ${username} (${normalizeRole(role)})`,
  });

  return buildAuthResponse(user);
}

export async function loginUser(input: LoginInput) {
  const { username, password } = input;

  if (!username || !password) {
    const error = new Error('Vui lòng nhập tên đăng nhập và mật khẩu');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  const user = await User.findOne({ username });
  if (!user || !user.isActive) {
    const error = new Error('Tên đăng nhập hoặc mật khẩu không đúng');
    Object.assign(error, { statusCode: 401 });
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    void writeAuditLog({ action: 'LOGIN_FAILED', category: 'auth', details: `Sai mật khẩu cho user: ${username}` });
    const error = new Error('Tên đăng nhập hoặc mật khẩu không đúng');
    Object.assign(error, { statusCode: 401 });
    throw error;
  }

  return buildAuthResponse(user);
}

export async function getAuthUser(userId: string) {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user || !user.isActive) {
    const error = new Error('Phiên đăng nhập không hợp lệ');
    Object.assign(error, { statusCode: 401 });
    throw error;
  }

  return user;
}

export async function seedDefaultAdmin() {
  const existingAdmin = await User.findOne({ username: 'admin' });
  if (existingAdmin) {
    if (existingAdmin.mustChangePassword) {
      existingAdmin.passwordHash = await bcrypt.hash('admin', SALT_ROUNDS);
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      await existingAdmin.save();
    }
    return;
  }

  const passwordHash = await bcrypt.hash('admin', SALT_ROUNDS);
  await User.create({
    username: 'admin',
    passwordHash,
    fullName: 'Quản trị hệ thống',
    department: 'UBND Cấp Xã',
    role: 'admin',
    position: 'Administrator',
    isActive: true,
    mustChangePassword: true,
  });
}

export async function listUsers() {
  return User.find().select('-passwordHash').sort({ createdAt: -1 });
}

export async function createManagedUser(input: RegisterInput) {
  const result = await createUser(input, { mustChangePassword: true });
  return result.user;
}

export async function updateManagedUser(userId: string, input: Partial<RegisterInput> & { isActive?: boolean }) {
  const update: Record<string, unknown> = {};

  if (input.fullName) update.fullName = input.fullName;
  if (input.department) update.department = input.department;
  if (input.position !== undefined) update.position = input.position;
  if (input.role) update.role = normalizeRole(input.role);
  if (typeof input.isActive === 'boolean') update.isActive = input.isActive;

  const user = await User.findByIdAndUpdate(userId, update, { new: true }).select('-passwordHash');
  if (!user) {
    const error = new Error('Không tìm thấy tài khoản');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  return user;
}

export async function disableManagedUser(userId: string, actor?: { id: string; username: string; fullName: string }) {
  const result = await updateManagedUser(userId, { isActive: false });
  void writeAuditLog({
    action: 'DISABLE',
    category: 'user',
    user: actor ? { ...actor, role: '', department: '', mustChangePassword: false } : undefined,
    targetType: 'User',
    targetId: userId,
    details: `Khóa tài khoản: ${result.username}`,
  });
  return result;
}

export async function resetManagedUserPassword(userId: string, password = '123456') {
  if (password.length < 6) {
    const error = new Error('Mật khẩu phải có ít nhất 6 ký tự');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.findByIdAndUpdate(
    userId,
    { passwordHash, mustChangePassword: true },
    { new: true }
  ).select('-passwordHash');

  if (!user) {
    const error = new Error('Không tìm thấy tài khoản');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }
  void writeAuditLog({
    action: 'RESET_PASSWORD',
    category: 'user',
    targetType: 'User',
    targetId: userId,
    details: `Reset mật khẩu cho: ${user.username}`,
  });

  return user;
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const { currentPassword, newPassword } = input;

  if (!currentPassword || !newPassword) {
    const error = new Error('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  if (newPassword.length < 6) {
    const error = new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    const error = new Error('Không tìm thấy tài khoản');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Mật khẩu hiện tại không đúng');
    Object.assign(error, { statusCode: 401 });
    throw error;
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.mustChangePassword = false;
  await user.save();

  void writeAuditLog({
    action: 'CHANGE_PASSWORD',
    category: 'auth',
    user: { id: userId, username: user.username, fullName: user.fullName, role: user.role, department: user.department, mustChangePassword: false },
    details: 'Đổi mật khẩu thành công',
  });

  return buildAuthResponse(user);
}
