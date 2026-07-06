import { Request, Response, NextFunction } from 'express';
import {
  changePassword,
  createManagedUser,
  deleteManagedUser,
  disableManagedUser,
  getAuthUser,
  listUsers,
  loginUser,
  resetManagedUserPassword,
  updateManagedUser,
} from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { writeAuditLog } from '../services/audit.service';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await loginUser(req.body);
    void writeAuditLog({
      action: 'LOGIN',
      category: 'auth',
      user: { id: String(result.user.id), username: result.user.username, fullName: result.user.fullName, role: result.user.role, department: result.user.department, mustChangePassword: result.user.mustChangePassword || false },
      ip: req.ip,
      details: `Đăng nhập thành công`,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const error = new Error('Bạn cần đăng nhập');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }
    const user = await getAuthUser(userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export function logout(req: AuthenticatedRequest, res: Response) {
  if (req.user) {
    void writeAuditLog({
      action: 'LOGOUT',
      category: 'auth',
      user: req.user,
      ip: req.ip,
      details: 'Đăng xuất',
    });
  }
  res.json({ message: 'Đã đăng xuất' });
}

export async function postChangePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const error = new Error('Bạn cần đăng nhập');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }
    res.json(await changePassword(userId, req.body));
  } catch (err) {
    next(err);
  }
}

export async function getUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await listUsers());
  } catch (err) {
    next(err);
  }
}

export async function postUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await createManagedUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function patchUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await updateManagedUser(String(req.params.id), req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function disableUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await disableManagedUser(String(req.params.id));
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await deleteManagedUser(String(req.params.id));
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await resetManagedUserPassword(String(req.params.id), req.body.password);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
