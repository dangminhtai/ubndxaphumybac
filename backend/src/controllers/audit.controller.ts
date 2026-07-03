import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { queryAuditLogs } from '../services/audit.service';

export async function getLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await queryAuditLogs({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      category: req.query.category as string | undefined,
      action: req.query.action as string | undefined,
      userId: req.query.userId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
