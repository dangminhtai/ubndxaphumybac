import ReportPeriod from '../models/ReportPeriod';
import type { AuthUser } from '../middleware/auth.middleware';

export interface PeriodInput {
  type: 'weekly' | 'monthly';
  title?: string;
  weekNumber?: number;
  month?: number;
  year: number;
  startDate: string;
  dueDate: string;
  status?: 'draft' | 'open' | 'locked' | 'archived';
}

function validatePeriodInput(input: PeriodInput) {
  if (!input.type || !input.year || !input.startDate || !input.dueDate) {
    const error = new Error('Vui lòng nhập đầy đủ loại kỳ, năm, ngày bắt đầu và hạn nộp');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  if (input.type === 'weekly' && !input.weekNumber) {
    const error = new Error('Kỳ tuần cần có số tuần');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  if (input.type === 'monthly' && !input.month) {
    const error = new Error('Kỳ tháng cần có tháng');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }
}

function buildTitle(input: PeriodInput) {
  if (input.title) return input.title;
  if (input.type === 'weekly') return `Tuần ${String(input.weekNumber).padStart(2, '0')} tháng ${input.month || ''} năm ${input.year}`.replace(' tháng  năm', ` năm`);
  return `Tháng ${input.month} năm ${input.year}`;
}

export function listPeriods(type?: string) {
  const filter = type ? { type } : {};
  return ReportPeriod.find(filter).sort({ year: -1, month: -1, weekNumber: -1, createdAt: -1 });
}

export async function createPeriod(input: PeriodInput, user: AuthUser) {
  validatePeriodInput(input);

  return ReportPeriod.create({
    type: input.type,
    title: buildTitle(input),
    weekNumber: input.weekNumber,
    month: input.month,
    year: input.year,
    startDate: new Date(input.startDate),
    dueDate: new Date(input.dueDate),
    status: input.status || 'draft',
    createdBy: user.id,
  });
}

export async function setPeriodStatus(periodId: string, status: 'open' | 'locked') {
  const period = await ReportPeriod.findByIdAndUpdate(periodId, { status }, { new: true });
  if (!period) {
    const error = new Error('Không tìm thấy kỳ báo cáo');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }
  return period;
}

export async function getOpenPeriod(type: 'weekly' | 'monthly') {
  return ReportPeriod.findOne({ type, status: 'open' }).sort({ year: -1, month: -1, weekNumber: -1, createdAt: -1 });
}
