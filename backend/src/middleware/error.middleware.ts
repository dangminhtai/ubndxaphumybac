import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

interface HttpError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  
  if (statusCode >= 500) {
    logger.error(`${err.message}\n${err.stack}`);
  }

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
  });
}
