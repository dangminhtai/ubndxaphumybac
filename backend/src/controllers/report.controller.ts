import { Request, Response, NextFunction } from 'express';
import { listRecentReports, seedReportsIfEmpty } from '../services/report.service';

export async function getReports(_req: Request, res: Response, next: NextFunction) {
  try {
    const reports = await listRecentReports();
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

export async function seedReports(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await seedReportsIfEmpty();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
