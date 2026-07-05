import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getOpenPeriod, listPeriods, setPeriodStatus, updatePeriodDueDate, ensureCurrentWeekPeriod } from '../services/period.service';
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
