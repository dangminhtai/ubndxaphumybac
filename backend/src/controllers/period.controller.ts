import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getOpenPeriod, listPeriods, setPeriodStatus, updatePeriodDueDate, ensureCurrentWeekPeriod, deletePeriod, createPeriodManually, forceGeneratePeriod } from '../services/period.service';
import { writeAuditLog } from '../services/audit.service';

export async function getPeriods(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await ensureCurrentWeekPeriod();
    res.json(await listPeriods(req.query.type?.toString()));
  } catch (err) {
    next(err);
  }
}

export async function getCurrentPeriod(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const type = req.query.type === 'monthly' ? 'monthly' : 'weekly';
    const period = await getOpenPeriod(type);
    res.json(period);
  } catch (err) {
    next(err);
  }
}

export async function patchPeriodDueDate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { dueDate } = req.body;
    if (!dueDate) {
      const error = new Error('Cần cung cấp hạn nộp mới');
      Object.assign(error, { statusCode: 400 });
      throw error;
    }
    const period = await updatePeriodDueDate(String(req.params.id), dueDate);
    void writeAuditLog({
      action: 'EDIT',
      category: 'period',
      user: req.user,
      targetType: 'ReportPeriod',
      targetId: String(req.params.id),
      details: `Gia hạn kỳ báo cáo "${period.title}" đến ${new Date(dueDate).toLocaleDateString('vi-VN')}`,
    });
    res.json(period);
  } catch (err) {
    next(err);
  }
}

export async function openPeriod(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const period = await setPeriodStatus(String(req.params.id), 'open');
    void writeAuditLog({
      action: 'UNLOCK',
      category: 'period',
      user: req.user,
      targetType: 'ReportPeriod',
      targetId: String(req.params.id),
      details: `Mở kỳ báo cáo: ${period.title}`,
    });
    res.json(period);
  } catch (err) {
    next(err);
  }
}

export async function lockPeriod(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const period = await setPeriodStatus(String(req.params.id), 'locked');
    void writeAuditLog({
      action: 'LOCK',
      category: 'period',
      user: req.user,
      targetType: 'ReportPeriod',
      targetId: String(req.params.id),
      details: `Khóa kỳ báo cáo: ${period.title}`,
    });
    res.json(period);
  } catch (err) {
    next(err);
  }
}

export async function archivePeriod(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const period = await setPeriodStatus(String(req.params.id), 'archived');
    void writeAuditLog({
      action: 'ARCHIVE',
      category: 'period',
      user: req.user,
      targetType: 'ReportPeriod',
      targetId: String(req.params.id),
      details: `Lưu trữ kỳ báo cáo: ${period.title}`,
    });
    res.json(period);
  } catch (err) {
    next(err);
  }
}

export async function deletePeriodController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const period = await deletePeriod(String(req.params.id));
    void writeAuditLog({
      action: 'DELETE',
      category: 'period',
      user: req.user,
      targetType: 'ReportPeriod',
      targetId: String(req.params.id),
      details: `Xóa kỳ báo cáo: ${period.title}`,
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function postCreatePeriodManually(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const creatorId = req.user ? req.user.id : null;
    const period = await createPeriodManually({
      ...req.body,
      createdBy: creatorId,
    });
    void writeAuditLog({
      action: 'CREATE',
      category: 'period',
      user: req.user,
      targetType: 'ReportPeriod',
      targetId: String(period._id),
      details: `Tạo kỳ báo cáo thủ công: ${period.title}`,
    });
    res.status(201).json(period);
  } catch (err) {
    next(err);
  }
}

export async function postForceGeneratePeriod(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { type } = req.body;
    if (type !== 'weekly' && type !== 'monthly') {
      const error = new Error('Loại kỳ báo cáo không hợp lệ');
      Object.assign(error, { statusCode: 400 });
      throw error;
    }
    const period = await forceGeneratePeriod(type);
    void writeAuditLog({
      action: 'CREATE',
      category: 'period',
      user: req.user,
      targetType: 'ReportPeriod',
      targetId: String(period._id),
      details: `Tự động tạo kỳ báo cáo (${type}): ${period.title}`,
    });
    res.status(201).json(period);
  } catch (err) {
    next(err);
  }
}
