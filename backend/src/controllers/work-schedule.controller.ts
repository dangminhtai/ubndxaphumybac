import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  createWorkSchedule,
  deleteWorkSchedule,
  getWorkScheduleById,
  getWorkScheduleStats,
  listWorkSchedules,
  updateWorkSchedule,
  updateWorkScheduleStatus,
} from '../services/work-schedule.service';
import { writeAuditLog } from '../services/audit.service';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) {
    const error = new Error('Bạn cần đăng nhập');
    Object.assign(error, { statusCode: 401 });
    throw error;
  }
  return req.user;
}

function readPagination(value: unknown) {
  if (!value) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

export async function getWorkSchedules(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const result = await listWorkSchedules({
      from: req.query.from?.toString(),
      to: req.query.to?.toString(),
      status: req.query.status as any,
      field: req.query.field?.toString(),
      executorId: req.query.executorId?.toString(),
      search: req.query.search?.toString(),
      page: readPagination(req.query.page),
      limit: readPagination(req.query.limit),
    }, user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getWorkSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const result = await getWorkScheduleById(String(req.params.id), user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postWorkSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const result = await createWorkSchedule(req.body, user);
    void writeAuditLog({
      action: 'CREATE',
      category: 'schedule',
      user,
      targetType: 'WorkSchedule',
      targetId: String(result._id),
      details: `Tạo lịch công tác: ${result.title}`,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function patchWorkSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const result = await updateWorkSchedule(String(req.params.id), req.body, user);
    void writeAuditLog({
      action: 'UPDATE',
      category: 'schedule',
      user,
      targetType: 'WorkSchedule',
      targetId: String(result._id),
      details: `Cập nhật lịch công tác: ${result.title}`,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function patchWorkScheduleStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const result = await updateWorkScheduleStatus(String(req.params.id), req.body, user);
    void writeAuditLog({
      action: result.status === 'cancelled' ? 'CANCEL' : 'CHANGE_STATUS',
      category: 'schedule',
      user,
      targetType: 'WorkSchedule',
      targetId: String(result._id),
      details: `Đổi trạng thái lịch công tác: ${result.title} -> ${result.status}`,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function removeWorkSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const result = await deleteWorkSchedule(String(req.params.id), user);
    void writeAuditLog({
      action: 'DELETE',
      category: 'schedule',
      user,
      targetType: 'WorkSchedule',
      targetId: String(result._id),
      details: `Xóa lịch công tác: ${result.title}`,
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getWorkScheduleStatistics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const result = await getWorkScheduleStats({
      from: req.query.from?.toString(),
      to: req.query.to?.toString(),
    }, user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
