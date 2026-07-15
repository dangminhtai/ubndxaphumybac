import ReportPeriod from '../models/ReportPeriod';
import Report from '../models/Report';
import WeeklySummary from '../models/WeeklySummary';
import { notifyAllUsers } from './notification.service';
import User from '../models/User';

async function getExpectedWeeklyReporterIds() {
  const users = await User.find({ role: 'staff', isActive: true }).select('_id').lean();
  return users.map((user) => user._id);
}

/* ── helpers ── */

function getVietnamCivilDate(d: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day)));
}

function getMonday(d: Date) {
  const date = getVietnamCivilDate(d);
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

function endOfVietnamDay(civilDate: Date) {
  const end = new Date(civilDate);
  end.setUTCHours(16, 59, 59, 999);
  return end;
}

export function parsePeriodDueDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return endOfVietnamDay(new Date(Date.UTC(year, month - 1, day)));
  }
  return new Date(value);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function weekLabelFromThursday(thu: Date) {
  const weekNum = Math.floor((thu.getUTCDate() - 1) / 7) + 1;
  return `Tuần ${String(weekNum).padStart(2, '0')} tháng ${thu.getUTCMonth() + 1} năm ${thu.getUTCFullYear()}`;
}

export function getWeeklyPeriodWindow(now: Date) {
  const startDate = getMonday(now);
  const thursday = addDays(startDate, 3);
  return {
    startDate,
    dueDate: endOfVietnamDay(thursday),
    thursday,
  };
}

/* ── auto-generate current week period ── */

export async function ensureCurrentWeekPeriod() {
  const now = new Date();
  const { startDate: monday, dueDate, thursday } = getWeeklyPeriodWindow(now);

  const weekNum = Math.floor((thursday.getUTCDate() - 1) / 7) + 1;
  const month = thursday.getUTCMonth() + 1;
  const year = thursday.getUTCFullYear();

  const existing = await ReportPeriod.findOne({
    type: 'weekly',
    startDate: monday,
    status: { $ne: 'archived' },
  });

  if (existing) {
    let shouldSave = false;
    if (existing.dueDate.getTime() === thursday.getTime()) {
      existing.dueDate = dueDate;
      shouldSave = true;
    }
    if (!existing.expectedReporterIds?.length && existing.status === 'open') {
      existing.expectedReporterIds = await getExpectedWeeklyReporterIds();
      shouldSave = true;
    }
    if (shouldSave) await existing.save();
    return existing;
  }

  const title = weekLabelFromThursday(thursday);

  const period = await ReportPeriod.create({
    type: 'weekly',
    title,
    weekNumber: weekNum,
    month,
    year,
    startDate: monday,
    dueDate,
    status: 'open',
    createdBy: null as any,
    expectedReporterIds: await getExpectedWeeklyReporterIds(),
  });

  void notifyAllUsers({
    title: 'Kỳ báo cáo mới',
    message: `Kỳ báo cáo "${period.title}" đã tự động mở. Hạn nộp: ${dueDate.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
    type: 'period_opened',
    link: '/weekly-report',
    excludeRoles: ['admin'],
  });

  return period;
}

/* ── auto-generate current month period ── */

export async function ensureCurrentMonthPeriod() {
  const now = new Date();
  const date = new Date(now);
  date.setUTCHours(0, 0, 0, 0);
  
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();

  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const existing = await ReportPeriod.findOne({
    type: 'monthly',
    month,
    year,
    status: { $ne: 'archived' },
  });

  if (existing) return existing;

  const title = `Tháng ${month} năm ${year}`;

  const period = await ReportPeriod.create({
    type: 'monthly',
    title,
    weekNumber: 0,
    month,
    year,
    startDate: firstDay,
    dueDate: lastDay,
    status: 'open',
    createdBy: null as any,
  });

  void notifyAllUsers({
    title: 'Kỳ báo cáo tháng mới',
    message: `Kỳ báo cáo "${period.title}" đã tự động mở. Hạn nộp: ${lastDay.toLocaleDateString('vi-VN')}`,
    type: 'period_opened',
    link: '/monthly-report',
    excludeRoles: ['admin'],
  });

  return period;
}

/* ── CRUD ── */

export function listPeriods(type?: string) {
  const filter = type ? { type } : {};
  return ReportPeriod.find(filter).sort({ year: -1, month: -1, weekNumber: -1, createdAt: -1 });
}

export async function getOpenPeriod(type: 'weekly' | 'monthly') {
  if (type === 'weekly') {
    await ensureCurrentWeekPeriod();
  } else if (type === 'monthly') {
    await ensureCurrentMonthPeriod();
  }
  return ReportPeriod.findOne({ type, status: 'open' }).sort({ year: -1, month: -1, weekNumber: -1, createdAt: -1 });
}

export async function setPeriodStatus(periodId: string, status: 'open' | 'locked' | 'archived') {
  const oldPeriod = await ReportPeriod.findById(periodId);
  const period = await ReportPeriod.findByIdAndUpdate(periodId, { status }, { new: true });
  if (!period) {
    const error = new Error('Không tìm thấy kỳ báo cáo');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  if (status === 'open' && oldPeriod && oldPeriod.status !== 'open') {
    if (period.type === 'weekly' && !period.expectedReporterIds?.length) {
      period.expectedReporterIds = await getExpectedWeeklyReporterIds();
      await period.save();
    }
    void notifyAllUsers({
      title: 'Kỳ báo cáo đã mở lại',
      message: `Kỳ báo cáo "${period.title}" vừa được mở. Hạn nộp: ${period.dueDate.toLocaleDateString('vi-VN')}`,
      type: 'period_opened',
      link: period.type === 'weekly' ? '/weekly-report' : '/monthly-report',
      excludeRoles: ['admin'],
    });
  }

  return period;
}

export async function updatePeriodDueDate(periodId: string, newDueDate: string) {
  const period = await ReportPeriod.findByIdAndUpdate(
    periodId,
    { dueDate: parsePeriodDueDate(newDueDate) },
    { new: true },
  );
  if (!period) {
    const error = new Error('Không tìm thấy kỳ báo cáo');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }
  return period;
}

export async function deletePeriod(periodId: string) {
  const period = await ReportPeriod.findById(periodId);
  if (!period) {
    const error = new Error('Không tìm thấy kỳ báo cáo');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  // Delete all reports belonging to this period
  await Report.deleteMany({ periodId });
  await WeeklySummary.deleteMany({ periodId });
  
  // Delete the period itself
  await period.deleteOne();
  return period;
}

export async function createPeriodManually(input: {
  type: 'weekly' | 'monthly';
  title: string;
  startDate: string;
  dueDate: string;
  weekNumber?: number;
  month?: number;
  year: number;
  createdBy?: any;
}) {
  if (!input.title || !input.startDate || !input.dueDate || !input.year) {
    const error = new Error('Vui lòng điền đầy đủ tiêu đề, ngày bắt đầu, ngày kết thúc và năm');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  // Check unique constraints (if not archived)
  const existing = await ReportPeriod.findOne({
    type: input.type,
    year: input.year,
    month: input.month,
    weekNumber: input.weekNumber,
    status: { $ne: 'archived' },
  });

  if (existing) {
    const error = new Error('Kỳ báo cáo có cấu hình tương tự đã tồn tại và chưa được lưu trữ.');
    Object.assign(error, { statusCode: 409 });
    throw error;
  }

  const period = await ReportPeriod.create({
    type: input.type,
    title: input.title,
    weekNumber: input.weekNumber || 0,
    month: input.month || 0,
    year: input.year,
    startDate: new Date(input.startDate),
    dueDate: parsePeriodDueDate(input.dueDate),
    status: 'open',
    createdBy: input.createdBy,
    expectedReporterIds: input.type === 'weekly' ? await getExpectedWeeklyReporterIds() : [],
  });

  void notifyAllUsers({
    title: 'Kỳ báo cáo mới',
    message: `Kỳ báo cáo "${period.title}" đã được tạo thủ công. Hạn nộp: ${new Date(period.dueDate).toLocaleDateString('vi-VN')}`,
    type: 'period_opened',
    link: period.type === 'weekly' ? '/weekly-report' : '/monthly-report',
    excludeRoles: ['admin'],
  });

  return period;
}

export async function forceGeneratePeriod(type: 'weekly' | 'monthly') {
  if (type === 'weekly') {
    return ensureCurrentWeekPeriod();
  } else {
    return ensureCurrentMonthPeriod();
  }
}
