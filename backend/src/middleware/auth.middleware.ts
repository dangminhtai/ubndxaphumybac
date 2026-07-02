import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { env } from '../config/env';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  fullName: string;
  department: string;
  mustChangePassword: boolean;
}

export type AuthenticatedRequest = Request & { user?: AuthUser };

export async function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      const error = new Error('Bạn cần đăng nhập');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }

    const payload = jwt.verify(token, env.jwtSecret) as { id?: string };
    if (!payload.id) {
      const error = new Error('Token không hợp lệ');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }

    const user = await User.findById(payload.id);
    if (!user || !user.isActive) {
      const error = new Error('Tài khoản không còn hoạt động');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      department: user.department,
      mustChangePassword: user.mustChangePassword,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requirePasswordReady(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword) {
    const error = new Error('Bạn cần đổi mật khẩu trước khi sử dụng hệ thống');
    Object.assign(error, { statusCode: 403, code: 'MUST_CHANGE_PASSWORD' });
    next(error);
    return;
  }

  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      const error = new Error('Bạn cần đăng nhập');
      Object.assign(error, { statusCode: 401 });
      next(error);
      return;
    }

    if (!roles.includes(req.user.role)) {
      const error = new Error('Bạn không có quyền thực hiện thao tác này');
      Object.assign(error, { statusCode: 403 });
      next(error);
      return;
    }

    next();
  };
}
