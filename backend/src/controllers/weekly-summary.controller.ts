import { NextFunction, Response } from 'express';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { writeAuditLog } from '../services/audit.service';
import {
  exportWeeklySummaryDocx,
  generateWeeklySummary,
  getWeeklySummaryByPeriod,
  updateWeeklySummary,
} from '../services/weekly-summary.service';

function getSummaryId(summary: object) {
  return '_id' in summary ? String(summary._id) : undefined;
}

export async function getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    res.json(await getWeeklySummaryByPeriod(req.params.periodId as string));
  } catch (error) {
    next(error);
  }
}

export async function generateSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await generateWeeklySummary(req.params.periodId as string, req.user!);
    void writeAuditLog({
      action: 'ADD',
      category: 'summary',
      user: req.user,
      targetType: 'WeeklySummary',
      targetId: getSummaryId(result.summary),
      details: `Tạo bản tổng hợp tuần kỳ: ${req.params.periodId}`,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await updateWeeklySummary(req.params.periodId as string, req.body, req.user!);
    void writeAuditLog({
      action: 'MODIFY',
      category: 'summary',
      user: req.user,
      targetType: 'WeeklySummary',
      targetId: getSummaryId(result.summary),
      details: `Cập nhật bản tổng hợp tuần kỳ: ${req.params.periodId}`,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function exportSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const filePath = await exportWeeklySummaryDocx(req.params.periodId as string);
    void writeAuditLog({
      action: 'EXPORT',
      category: 'export',
      user: req.user,
      targetType: 'WeeklySummary',
      details: `Xuất DOCX tổng hợp tuần kỳ: ${req.params.periodId}`,
    });
    res.download(filePath, 'tong-hop-bao-cao-tuan.docx', (error) => {
      fs.unlink(filePath, () => undefined);
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
}
