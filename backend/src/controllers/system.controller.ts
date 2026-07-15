import type { NextFunction, Response } from 'express';
import { getDatabaseStatus } from '../config/db';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getRecentOperationalErrors } from '../services/operational-error.service';

export function getSystemDiagnostics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const requestedLimit = Number.parseInt(String(req.query.limit || '20'), 10);
    res.json({
      status: getDatabaseStatus() === 'connected' ? 'healthy' : 'degraded',
      mongodb: getDatabaseStatus(),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      recentErrors: getRecentOperationalErrors(Number.isFinite(requestedLimit) ? requestedLimit : 20),
    });
  } catch (error) {
    next(error);
  }
}
