import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createPeriod, getOpenPeriod, listPeriods, setPeriodStatus } from '../services/period.service';

export async function getPeriods(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
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

export async function postPeriod(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      const error = new Error('Bạn cần đăng nhập');
      Object.assign(error, { statusCode: 401 });
      throw error;
    }
    const period = await createPeriod(req.body, req.user);
    res.status(201).json(period);
  } catch (err) {
    next(err);
  }
}

export async function openPeriod(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    res.json(await setPeriodStatus(String(req.params.id), 'open'));
  } catch (err) {
    next(err);
  }
}

export async function lockPeriod(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    res.json(await setPeriodStatus(String(req.params.id), 'locked'));
  } catch (err) {
    next(err);
  }
}
