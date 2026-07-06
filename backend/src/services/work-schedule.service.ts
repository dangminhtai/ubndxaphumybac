import mongoose from 'mongoose';
import WorkSchedule, { WorkSchedulePriority, WorkScheduleStatus } from '../models/WorkSchedule';
import type { AuthUser } from '../middleware/auth.middleware';
import { createNotification, notifyUsersByRole } from './notification.service';

export interface WorkScheduleQuery {
  from?: string;
  to?: string;
  status?: WorkScheduleStatus;
  field?: string;
  executorId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WorkScheduleInput {
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  field: string;
  priority: WorkSchedulePriority;
  status: WorkScheduleStatus;
  chairPerson?: string;
  executorIds?: string[];
  participantText?: string;
  content?: string;
  notes?: string;
  cancelReason?: string;
}

export interface WorkScheduleStatusInput {
  status: WorkScheduleStatus;
  cancelReason?: string;
}

const VIEW_ALL_ROLES = new Set(['admin', 'department_lead', 'viewer']);
const MANAGE_ROLES = new Set(['admin', 'department_lead']);
const VALID_PRIORITIES = new Set<WorkSchedulePriority>(['low', 'medium', 'high', 'urgent']);
const VALID_STATUSES = new Set<WorkScheduleStatus>(['not_started', 'in_progress', 'completed', 'postponed', 'cancelled']);

function isViewAll(user: AuthUser) {
  return VIEW_ALL_ROLES.has(user.role);
}

function isManager(user: AuthUser) {
  return MANAGE_ROLES.has(user.role);
}

function makeError(message: string, statusCode: number) {
  const error = new Error(message);
  Object.assign(error, { statusCode });
  return error;
}

function requireManager(user: AuthUser) {
  if (!isManager(user)) {
    throw makeError('Bạn không có quyền quản lý lịch công tác', 403);
  }
}

function assertObjectId(id: string, message: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw makeError(message, 400);
  }
}

function trimText(value?: string) {
  return typeof value === 'string' ? value.trim() : undefined;
}

function requireText(value: string | undefined, message: string) {
  const text = trimText(value);
  if (!text) {
    throw makeError(message, 400);
  }
  return text;
}

function parseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw makeError('Ngày thực hiện không hợp lệ', 400);
  }
  return date;
}

function parseExecutorIds(executorIds?: string[]) {
  if (!executorIds) return [];
  const uniqueIds = [...new Set(executorIds.filter(Boolean))];
  uniqueIds.forEach((id) => assertObjectId(id, 'Người thực hiện không hợp lệ'));
  return uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function visibilityFilter(user: AuthUser) {
  if (isViewAll(user)) return {};

  const userId = new mongoose.Types.ObjectId(user.id);
  return {
    $or: [
      { createdBy: userId },
      { executorIds: userId },
    ],
  };
}

function buildQueryFilter(query: WorkScheduleQuery, user: AuthUser) {
  const filter: Record<string, unknown> = {
    isDeleted: false,
  };
  const andFilters: Record<string, unknown>[] = [visibilityFilter(user)];

  if (query.from || query.to) {
    const dateFilter: Record<string, Date> = {};
    if (query.from) dateFilter.$gte = parseDate(query.from);
    if (query.to) {
      const endDate = parseDate(query.to);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = endDate;
    }
    filter.date = dateFilter;
  }

  if (query.status) {
    if (!VALID_STATUSES.has(query.status)) throw makeError('Trạng thái lịch công tác không hợp lệ', 400);
    filter.status = query.status;
  }

  if (query.field) filter.field = query.field;

  if (query.executorId) {
    assertObjectId(query.executorId, 'Người thực hiện không hợp lệ');
    filter.executorIds = new mongoose.Types.ObjectId(query.executorId);
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    andFilters.push({
      $or: [
      { title: regex },
      { location: regex },
      { content: regex },
      ],
    });
  }

  const effectiveAndFilters = andFilters.filter((item) => Object.keys(item).length > 0);
  if (effectiveAndFilters.length > 0) {
    filter.$and = effectiveAndFilters;
  }

  return filter;
}

function validatePayload(input: WorkScheduleInput) {
  const title = requireText(input.title, 'Vui lòng nhập tiêu đề công việc');
  const startTime = requireText(input.startTime, 'Vui lòng nhập giờ bắt đầu');
  const field = requireText(input.field, 'Vui lòng chọn lĩnh vực');
  const date = parseDate(input.date);

  if (!VALID_PRIORITIES.has(input.priority)) {
    throw makeError('Mức độ ưu tiên không hợp lệ', 400);
  }

  if (!VALID_STATUSES.has(input.status)) {
    throw makeError('Trạng thái lịch công tác không hợp lệ', 400);
  }

  if (input.status === 'cancelled' && !trimText(input.cancelReason)) {
    throw makeError('Vui lòng nhập lý do hủy lịch', 400);
  }

  return {
    title,
    date,
    startTime,
    field,
    priority: input.priority,
    status: input.status,
    endTime: trimText(input.endTime),
    location: trimText(input.location),
    chairPerson: trimText(input.chairPerson),
    executorIds: parseExecutorIds(input.executorIds),
    participantText: trimText(input.participantText),
    content: trimText(input.content),
    notes: trimText(input.notes),
    cancelReason: trimText(input.cancelReason),
    completedAt: input.status === 'completed' ? new Date() : undefined,
  };
}

async function ensureCanRead(scheduleId: string, user: AuthUser) {
  assertObjectId(scheduleId, 'Lịch công tác không hợp lệ');
  const schedule = await WorkSchedule.findOne({ _id: scheduleId, isDeleted: false });
  if (!schedule) throw makeError('Không tìm thấy lịch công tác', 404);

  if (isViewAll(user)) return schedule;

  const canRead = schedule.createdBy.toString() === user.id
    || schedule.executorIds.some((id) => id.toString() === user.id);
  if (!canRead) throw makeError('Bạn không có quyền xem lịch công tác này', 403);

  return schedule;
}

async function notifyExecutors(executorIds: mongoose.Types.ObjectId[], payload: {
  title: string;
  message: string;
  link: string;
}) {
  await Promise.all(
    executorIds.map((id) => createNotification({
      recipientId: id.toString(),
      title: payload.title,
      message: payload.message,
      type: 'work_schedule',
      link: payload.link,
    }))
  );
}

export async function listWorkSchedules(query: WorkScheduleQuery, user: AuthUser) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;
  const filter = buildQueryFilter(query, user);

  const [data, total] = await Promise.all([
    WorkSchedule.find(filter)
      .populate('executorIds', 'fullName username department position')
      .populate('createdBy', 'fullName username department')
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(limit),
    WorkSchedule.countDocuments(filter),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getWorkScheduleById(scheduleId: string, user: AuthUser) {
  const schedule = await ensureCanRead(scheduleId, user);
  return schedule.populate([
    { path: 'executorIds', select: 'fullName username department position' },
    { path: 'createdBy', select: 'fullName username department' },
  ]);
}

export async function createWorkSchedule(input: WorkScheduleInput, user: AuthUser) {
  requireManager(user);
  const payload = validatePayload(input);
  const schedule = await WorkSchedule.create({
    ...payload,
    createdBy: user.id,
  });

  if (schedule.executorIds.length > 0) {
    void notifyExecutors(schedule.executorIds, {
      title: 'Có lịch công tác mới',
      message: `${user.fullName} vừa tạo lịch: ${schedule.title}`,
      link: `/work-schedules/${schedule._id}`,
    });
  }

  return schedule;
}

export async function updateWorkSchedule(scheduleId: string, input: WorkScheduleInput, user: AuthUser) {
  requireManager(user);
  const schedule = await ensureCanRead(scheduleId, user);
  const payload = validatePayload(input);
  Object.assign(schedule, payload);
  const saved = await schedule.save();

  if (saved.executorIds.length > 0) {
    void notifyExecutors(saved.executorIds, {
      title: 'Lịch công tác được cập nhật',
      message: `${user.fullName} vừa cập nhật lịch: ${saved.title}`,
      link: `/work-schedules/${saved._id}`,
    });
  }

  return saved;
}

export async function updateWorkScheduleStatus(scheduleId: string, input: WorkScheduleStatusInput, user: AuthUser) {
  const schedule = await ensureCanRead(scheduleId, user);
  const isExecutor = schedule.executorIds.some((id) => id.toString() === user.id);
  if (!isManager(user) && !isExecutor) {
    throw makeError('Bạn không có quyền cập nhật trạng thái lịch này', 403);
  }

  if (!VALID_STATUSES.has(input.status)) {
    throw makeError('Trạng thái lịch công tác không hợp lệ', 400);
  }

  if (input.status === 'cancelled' && !trimText(input.cancelReason)) {
    throw makeError('Vui lòng nhập lý do hủy lịch', 400);
  }

  schedule.status = input.status;
  schedule.cancelReason = trimText(input.cancelReason);
  schedule.completedAt = input.status === 'completed' ? new Date() : undefined;
  const saved = await schedule.save();

  if (!isManager(user)) {
    void notifyUsersByRole({
      roles: ['admin', 'department_lead'],
      title: 'Trạng thái lịch công tác thay đổi',
      message: `${user.fullName} cập nhật lịch "${saved.title}" thành ${saved.status}.`,
      type: 'work_schedule',
      link: `/work-schedules/${saved._id}`,
    });
  }

  return saved;
}

export async function deleteWorkSchedule(scheduleId: string, user: AuthUser) {
  if (user.role !== 'admin') {
    throw makeError('Chỉ admin mới có quyền xóa lịch công tác', 403);
  }

  const schedule = await ensureCanRead(scheduleId, user);
  schedule.isDeleted = true;
  await schedule.save();
  return schedule;
}

export async function getWorkScheduleStats(query: Pick<WorkScheduleQuery, 'from' | 'to'>, user: AuthUser) {
  const filter = buildQueryFilter(query, user);
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [total, todayCount, weekCount, monthCount, completedCount, byStatus, byField] = await Promise.all([
    WorkSchedule.countDocuments(filter),
    WorkSchedule.countDocuments({ ...filter, date: { $gte: todayStart, $lte: todayEnd } }),
    WorkSchedule.countDocuments({ ...filter, date: { $gte: weekStart, $lte: weekEnd } }),
    WorkSchedule.countDocuments({ ...filter, date: { $gte: monthStart, $lte: monthEnd } }),
    WorkSchedule.countDocuments({ ...filter, status: 'completed' }),
    WorkSchedule.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    WorkSchedule.aggregate([
      { $match: filter },
      { $group: { _id: '$field', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    total,
    todayCount,
    weekCount,
    monthCount,
    completedCount,
    completionRate: total > 0 ? Math.round((completedCount / total) * 100) : 0,
    byStatus: byStatus.map((item) => ({ status: item._id, count: item.count })),
    byField: byField.map((item) => ({ field: item._id, count: item.count })),
  };
}
