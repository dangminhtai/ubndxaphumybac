export interface OperationalErrorEntry {
  requestId: string;
  timestamp: string;
  code: string;
  statusCode: number;
  method: string;
  path: string;
  message: string;
}

const MAX_RECENT_ERRORS = 100;
const recentErrors: OperationalErrorEntry[] = [];

export function recordOperationalError(entry: OperationalErrorEntry) {
  recentErrors.unshift(entry);
  if (recentErrors.length > MAX_RECENT_ERRORS) recentErrors.length = MAX_RECENT_ERRORS;
}

export function getRecentOperationalErrors(limit = 20) {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  return recentErrors.slice(0, safeLimit);
}
