import { Response, NextFunction } from 'express';
import fs from 'fs';
import {
  getMonthlySummaryByPeriod,
  generateMonthlySummaryFromStaff,
  updateMonthlySummary,
  exportMonthlySummaryDocx,
} from '../services/monthly-summary.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { writeAuditLog } from '../services/audit.service';

export async function getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const summary = await getMonthlySummaryByPeriod(req.params.periodId as string);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function generateSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const summary = await generateMonthlySummaryFromStaff(req.params.periodId as string, req.user!);
    void writeAuditLog({
      action: 'summary_generated',
      category: 'summary',
      user: req.user,
      targetType: 'MonthlySummary',
      targetId: String(summary._id),
      details: `Tạo bản tổng hợp tháng kỳ: ${req.params.periodId}`,
    });
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function updateSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const summary = await updateMonthlySummary(req.params.periodId as string, req.body, req.user!);
    void writeAuditLog({
      action: 'summary_updated',
      category: 'summary',
      user: req.user,
      targetType: 'MonthlySummary',
      targetId: String(summary._id),
      details: `Cập nhật bản tổng hợp tháng`,
    });
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function exportSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const filePath = await exportMonthlySummaryDocx(req.params.periodId as string);
    void writeAuditLog({
      action: 'docx_exported',
      category: 'export',
      user: req.user,
      targetType: 'MonthlySummary',
      details: `Xuất DOCX báo cáo tháng cấp phòng`,
    });
    res.download(filePath, 'tong-hop-bao-cao-thang.docx', (err) => {
      fs.unlink(filePath, () => undefined);
      if (err) {
        next(err);
      }
    });
  } catch (err) {
    next(err);
  }
}
