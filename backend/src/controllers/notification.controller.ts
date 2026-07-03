import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getUserNotifications, markAllAsRead, markAsRead } from '../services/notification.service';

export async function getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await getUserNotifications(req.user!.id, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function readNotification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const notification = await markAsRead(String(req.params.id), req.user!.id);
    res.json(notification);
  } catch (err) {
    next(err);
  }
}

export async function readAllNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await markAllAsRead(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
