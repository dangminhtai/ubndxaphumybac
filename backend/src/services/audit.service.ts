import AuditLog from '../models/AuditLog';
import type { AuthUser } from '../middleware/auth.middleware';
import { logger } from '../config/logger';

export interface AuditLogInput {
  action: string;
  category: 'auth' | 'report' | 'period' | 'user' | 'export' | 'summary' | 'schedule';
  user?: AuthUser | null;
  targetType?: string;
  targetId?: string;
  details?: string;
  ip?: string;
}

export async function writeAuditLog(input: AuditLogInput) {
  try {
    await AuditLog.create({
      action: input.action,
      category: input.category,
      userId: input.user?.id,
      username: input.user?.username,
      fullName: input.user?.fullName,
      targetType: input.targetType,
      targetId: input.targetId,
      details: input.details,
      ip: input.ip,
    });

    // Ghi log ra terminal để tiện theo dõi trong quá trình dev / vận hành
    const userDisplay = input.user ? `[${input.user.username}]` : '[SYSTEM]';
    logger.info(`[AUDIT] ${userDisplay} ${input.action} - ${input.details || ''}`);
  } catch (err: any) {
    logger.error(`Failed to write audit log: ${err.message}`);
  }
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  category?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export async function queryAuditLogs(query: AuditLogQuery) {
  const filter: Record<string, unknown> = {};

  if (query.category) filter.category = query.category;
  if (query.action) filter.action = { $regex: query.action, $options: 'i' };
  if (query.userId) filter.userId = query.userId;

  if (query.startDate || query.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (query.startDate) dateFilter.$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    filter.createdAt = dateFilter;
  }

  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
