import ReportPeriod from '../models/ReportPeriod';
import { notifyAllUsers } from './notification.service';

/* ── helpers ── */

function getMonday(d: Date) {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
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

/* ── auto-generate current week period ── */

export async function ensureCurrentWeekPeriod() {
  const now = new Date();
  const monday = getMonday(now);
  const thursday = addDays(monday, 3);

  const weekNum = Math.floor((thursday.getUTCDate() - 1) / 7) + 1;
  const month = thursday.getUTCMonth() + 1;
  const year = thursday.getUTCFullYear();

  const existing = await ReportPeriod.findOne({
    type: 'weekly',
    startDate: monday,
    status: { $ne: 'archived' },
  });

  if (existing) return existing;

  const title = weekLabelFromThursday(thursday);

  const period = await ReportPeriod.create({
    type: 'weekly',
    title,
    weekNumber: weekNum,
    month,
    year,
    startDate: monday,
    dueDate: thursday,
    status: 'open',
    createdBy: null as any,
  });

  void notifyAllUsers({
    title: 'Kỳ báo cáo mới',
    message: `Kỳ báo cáo "${period.title}" đã tự động mở. Hạn nộp: ${thursday.toLocaleDateString('vi-VN')}`,
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
    { dueDate: new Date(newDueDate) },
    { new: true },
  );
  if (!period) {
    const error = new Error('Không tìm thấy kỳ báo cáo');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }
  return period;
}
