import { NextFunction, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { writeAuditLog } from '../services/audit.service';
import {
  exportWeeklySummaryFile,
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
    const format = req.path.endsWith('/export-pdf') ? 'pdf' : 'docx';
    const filePath = await exportWeeklySummaryFile(req.params.periodId as string, format);
    void writeAuditLog({
      action: 'EXPORT',
      category: 'export',
      user: req.user,
      targetType: 'WeeklySummary',
      details: `Xuất ${format.toUpperCase()} tổng hợp tuần kỳ: ${req.params.periodId}`,
    });
    res.download(filePath, filePath.split(/[\\/]/).pop()!, (error) => {
      fs.unlink(filePath, () => fs.rmdir(path.dirname(filePath), () => undefined));
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
}
