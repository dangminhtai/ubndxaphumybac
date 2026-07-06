import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getArchivedReports, getArchivedReportById } from '../services/archive.service';

export async function getArchive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const weekNumber = req.query.weekNumber ? parseInt(req.query.weekNumber as string) : undefined;
    
    const result = await getArchivedReports({
      page,
      limit,
      year,
      month,
      weekNumber,
      reportType: req.query.reportType as string,
      sender: req.query.sender as string,
    });
    
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getArchiveById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { type, id } = req.params;
    const result = await getArchivedReportById(String(id), String(type));
    res.json(result);
  } catch (err) {
    next(err);
  }
}
