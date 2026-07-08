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
  removeWorkScheduleAttachment,
} from '../services/work-schedule.service';
import { writeAuditLog } from '../services/audit.service';
import { UploadService } from '../services/upload.service';
import WorkSchedule from '../models/WorkSchedule';

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

export async function postUploadFile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    // Only admin or department_lead can upload
    if (user.role !== 'admin' && user.role !== 'department_lead') {
      return res.status(403).json({ error: 'Không có quyền tải lên file' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Không tìm thấy file' });
    }

    const filePath = await UploadService.uploadDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({ path: filePath, name: req.file.originalname });
  } catch (err) {
    next(err);
  }
}

export async function getAttachmentSignedUrl(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    requireUser(req); // Any authenticated user can view attachment if they can view schedule
    
    // First, verify the schedule exists and has this attachment
    const schedule = await WorkSchedule.findById(req.params.id);
    if (!schedule || !schedule.attachmentUrl) {
      return res.status(404).json({ error: 'Không tìm thấy file đính kèm' });
    }

    // Get signed URL from Supabase
    const signedUrl = await UploadService.getSignedUrl(schedule.attachmentUrl);
    
    res.json({ url: signedUrl });
  } catch (err) {
    next(err);
  }
}

export async function removeAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const result = await removeWorkScheduleAttachment(String(req.params.id), user);
    void writeAuditLog({
      action: 'UPDATE',
      category: 'schedule',
      user,
      targetType: 'WorkSchedule',
      targetId: String(result._id),
      details: `Xóa tài liệu đính kèm lịch công tác: ${result.title}`,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
