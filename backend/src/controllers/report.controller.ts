import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import {
  createWeeklyReport,
  exportWeeklyReportDocx,
  exportWeeklyReportDocxById,
  getCurrentWeeklyReport,
  listRecentReports,
  listReportsForUser,
  submitWeeklyReport,
  getCurrentMonthlyStaffReport,
  createMonthlyStaffReport,
  submitMonthlyStaffReport,
} from '../services/report.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getReports(_req: Request, res: Response, next: NextFunction) {
  try {
    const reports = await listRecentReports();
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

export async function getMyReports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error = new Error('Bạn cần đăng nhập');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }
    const reports = await listReportsForUser(req.user);
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

export async function getWeeklyCurrent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error = new Error('Bạn cần đăng nhập');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }
    const result = await getCurrentWeeklyReport(req.user, req.query.periodId?.toString());
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postWeeklyReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error = new Error('Bạn cần đăng nhập');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }
    const report = await createWeeklyReport(req.body, req.user);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
}

export async function submitWeekly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error = new Error('Bạn cần đăng nhập');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }
    res.json(await submitWeeklyReport(String(req.params.id), req.user));
  } catch (err) {
    next(err);
  }
}

export async function getMonthlyStaffCurrent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error = new Error('Bạn cần đăng nhập');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }
    const periodId = req.query.periodId as string | undefined;
    const result = await getCurrentMonthlyStaffReport(req.user, periodId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postMonthlyStaffReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error = new Error('Bạn cần đăng nhập');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }
    const report = await createMonthlyStaffReport(req.body, req.user);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
}

export async function submitMonthlyStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error = new Error('Bạn cần đăng nhập');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }
    const report = await submitMonthlyStaffReport(String(req.params.id), req.user);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function exportWeeklyReport(req: Request, res: Response, next: NextFunction) {
  try {
    const filePath = await exportWeeklyReportDocx(req.body);
    res.download(filePath, 'bao-cao-tuan.docx', (err) => {
      fs.unlink(filePath, () => undefined);
      if (err) {
        next(err);
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function exportWeeklyReportById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error = new Error('Bạn cần đăng nhập');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }
    const filePath = await exportWeeklyReportDocxById(String(req.params.id), req.user);
    res.download(filePath, 'bao-cao-tuan.docx', (err) => {
      fs.unlink(filePath, () => undefined);
      if (err) {
        next(err);
      }
    });
  } catch (err) {
    next(err);
  }
}
