import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as weeklyTaskService from '../services/weekly-task.service';

export async function getRegistrationStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await weeklyTaskService.getRegistrationStatus(req.user!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function openEarly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await weeklyTaskService.openRegistrationEarly(req.user!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function closeEarly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await weeklyTaskService.closeRegistrationEarly(req.user!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMyTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await weeklyTaskService.getMyTask(
      req.user!,
      req.query.targetWeekStart as string | undefined,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listTasks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await weeklyTaskService.listTasks(
      req.user!,
      req.query.targetWeekStart as string | undefined,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function upsertTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await weeklyTaskService.upsertTask(req.user!, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await weeklyTaskService.deleteTask(req.params.id as string, req.user!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAvailableWeeks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await weeklyTaskService.getAvailableWeeks();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function exportExcel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { tasks, weekLabel } = await weeklyTaskService.listTasks(
      req.user!,
      req.query.targetWeekStart as string | undefined,
    );
    const html = weeklyTaskService.buildExcelHtml(tasks, weekLabel);

    const filename = `nhiem-vu-${weekLabel.replace(/\s+/g, '-').toLowerCase()}.xls`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=UTF-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send('\ufeff' + html);
  } catch (err) {
    next(err);
  }
}
