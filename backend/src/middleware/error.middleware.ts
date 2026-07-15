import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { recordOperationalError } from '../services/operational-error.service';

interface HttpError extends Error {
  statusCode?: number;
  code?: string;
}

interface ClassifiedError {
  statusCode: number;
  code: string;
  publicMessage: string;
  retryable: boolean;
}

function isDatabaseError(error: HttpError) {
  const signature = `${error.name} ${error.message}`.toLowerCase();
  return signature.includes('mongoose')
    || signature.includes('mongo')
    || signature.includes('buffering timed out')
    || signature.includes('server selection');
}

export function classifyError(error: HttpError): ClassifiedError {
  if (isDatabaseError(error)) {
    return {
      statusCode: 503,
      code: 'DATABASE_UNAVAILABLE',
      publicMessage: 'Dữ liệu đang tạm thời mất kết nối. Vui lòng thử lại sau.',
      retryable: true,
    };
  }

  const statusCode = Number(error.statusCode) || 500;
  if (statusCode >= 500) {
    return {
      statusCode,
      code: error.code || 'INTERNAL_ERROR',
      publicMessage: 'Máy chủ không xử lý được yêu cầu.',
      retryable: statusCode === 502 || statusCode === 503 || statusCode === 504,
    };
  }

  return {
    statusCode,
    code: error.code || `HTTP_${statusCode}`,
    publicMessage: error.message || 'Yêu cầu không hợp lệ.',
    retryable: statusCode === 408 || statusCode === 429,
  };
}

export function errorHandler(
  err: HttpError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const classified = classifyError(err);
  const requestId = String(res.locals.requestId || 'unknown');

  if (classified.statusCode >= 500) {
    logger.error(`[${requestId}] ${req.method} ${req.originalUrl} ${classified.code}: ${err.message}\n${err.stack || ''}`);
    recordOperationalError({
      requestId,
      timestamp: new Date().toISOString(),
      code: classified.code,
      statusCode: classified.statusCode,
      method: req.method,
      path: req.originalUrl,
      message: classified.publicMessage,
    });
  }

  res.status(classified.statusCode).json({
    error: classified.publicMessage,
    code: classified.code,
    requestId,
    retryable: classified.retryable,
  });
}
