import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.header('x-request-id')?.trim();
  const requestId = incomingId && incomingId.length <= 100 ? incomingId : randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
