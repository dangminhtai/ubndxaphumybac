import { Response, NextFunction } from 'express';
import { getDashboardOverview, getSubmissionProgress } from '../services/dashboard.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const overview = await getDashboardOverview();
    res.json(overview);
  } catch (err) {
    next(err);
  }
}

export async function getProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const progress = await getSubmissionProgress();
    res.json(progress);
  } catch (err) {
    next(err);
  }
}
