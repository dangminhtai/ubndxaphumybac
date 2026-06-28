import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { env } from '../config/env';

const SALT_ROUNDS = 10;

export interface RegisterInput {
  username: string;
  password: string;
  fullName: string;
  department: string;
  role?: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

function buildAuthResponse(user: {
  _id: unknown;
  username: string;
  fullName: string;
  role: string;
  department: string;
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
    },
  };
}

export async function registerUser(input: RegisterInput) {
  const { username, password, fullName, department, role } = input;

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
    role: role || 'user',
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
  if (!user) {
    const error = new Error('Tên đăng nhập hoặc mật khẩu không đúng');
    Object.assign(error, { statusCode: 401 });
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Tên đăng nhập hoặc mật khẩu không đúng');
    Object.assign(error, { statusCode: 401 });
    throw error;
  }

  return buildAuthResponse(user);
}
