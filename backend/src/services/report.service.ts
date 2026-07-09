import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Report from '../models/Report';
import ReportPeriod from '../models/ReportPeriod';
import type { AuthUser } from '../middleware/auth.middleware';
import { createNotification, notifyUsersByRole } from './notification.service';

export interface WeeklyReportInput {
  periodId?: string;
  period: string;
  reportTitle: string;
  startDate?: string;
  endDate?: string;
  nextPeriod?: string;
  field: string;
  sender: string;
  department: string;
  content: string;
  administrativeReform?: string;
  digitalTransformation?: string;
  nextTasks?: string;
  difficulties?: string;
  proposals?: string;
  dueDate?: string;
  status: 'draft' | 'pending';
}

export interface MonthlyStaffInput {
  periodId?: string;
  period: string;
  sender: string;
  department: string;
  status: 'draft' | 'pending';
  content: string;
  difficulties?: string;
  proposals?: string;
  nextTasks?: string;
}

export function listRecentReports() {
  return Report.find().sort({ createdAt: -1 }).limit(10);
}

export function listReportsForUser(user: AuthUser) {
  if (user.role === 'admin' || user.role === 'viewer' || user.role === 'department_lead') {
    return Report.find().sort({ createdAt: -1 }).limit(50);
  }
  return Report.find({ ownerId: user.id }).sort({ createdAt: -1 }).limit(50);
}

function resolveWeeklyTemplatePath() {
  const rootDir = process.cwd();
  return path.join(rootDir, 'src', 'templates', 'weekly_template.docx');
}

function validateWeeklyReportInput(input: WeeklyReportInput) {
  if (!input.period || !input.reportTitle || !input.field || !input.content) {
    const error = new Error('Vui lòng nhập đầy đủ tuần báo cáo, lĩnh vực và kết quả thực hiện');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }
}

function requireReportValue(value: string | undefined, message: string) {
  if (!value) {
    const error = new Error(message);
    Object.assign(error, { statusCode: 400 });
    throw error;
  }
  return value;
}

async function resolveWeeklyPeriod(periodId?: string) {
  const period = periodId
    ? await ReportPeriod.findById(periodId)
    : await ReportPeriod.findOne({ type: 'weekly', status: 'open' }).sort({ year: -1, month: -1, weekNumber: -1, createdAt: -1 });

  if (!period) {
    const error = new Error('Chưa có kỳ báo cáo tuần đang mở');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  if (period.status !== 'open') {
    const error = new Error('Kỳ báo cáo đã khóa hoặc chưa mở');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  return period;
}

export async function getCurrentWeeklyReport(user: AuthUser, periodId?: string) {
  const period = await resolveWeeklyPeriod(periodId);
  const report = await Report.findOne({ ownerId: user.id, periodId: period.id, reportType: 'weekly' });
  return { period, report };
}

export async function createWeeklyReport(input: WeeklyReportInput, user: AuthUser) {
  validateWeeklyReportInput(input);
  const period = await resolveWeeklyPeriod(input.periodId);

  const title = input.reportTitle;
  if (!title) {
    const error = new Error('Thiếu tiêu đề báo cáo tuần');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }
  const existing = await Report.findOne({ ownerId: user.id, periodId: period.id, reportType: 'weekly' });

  if (existing && existing.status !== 'draft') {
    const error = new Error('Báo cáo kỳ này đã nộp, không thể ghi đè');
    Object.assign(error, { statusCode: 409 });
    throw error;
  }

  const data = {
    title,
    reportType: 'weekly',
    ownerId: user.id,
    periodId: period.id,
    period: input.period,
    reportTitle: title,
    startDate: input.startDate ? new Date(input.startDate) : undefined,
    endDate: input.endDate ? new Date(input.endDate) : undefined,
    field: input.field,
    department: user.department,
    sender: user.fullName,
    status: input.status,
    content: input.content,
    administrativeReform: input.administrativeReform,
    digitalTransformation: input.digitalTransformation,
    nextTasks: input.nextTasks,
    difficulties: input.difficulties,
    proposals: input.proposals,
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    submittedAt: input.status === 'pending' ? new Date() : undefined,
  };

  if (existing) {
    Object.assign(existing, data);
    return existing.save();
  }

  return Report.create(data);
}

export async function submitWeeklyReport(reportId: string, user: AuthUser) {
  const report = await Report.findById(reportId).populate('periodId');

  if (!report || report.reportType !== 'weekly') {
    const error = new Error('Không tìm thấy báo cáo tuần');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  const period: any = report.periodId;
  if (period && period.status === 'archived') {
    const error = new Error('Kỳ báo cáo đã được lưu trữ, không thể thay đổi');
    Object.assign(error, { statusCode: 403 });
    throw error;
  }

  if (user.role !== 'admin' && report.ownerId?.toString() !== user.id) {
    const error = new Error('Bạn không có quyền nộp báo cáo này');
    Object.assign(error, { statusCode: 403 });
    throw error;
  }

  if (report.status !== 'draft') {
    const error = new Error('Báo cáo đã nộp trước đó');
    Object.assign(error, { statusCode: 409 });
    throw error;
  }

  report.status = 'pending';
  report.submittedAt = new Date();
  await report.save();

  void notifyUsersByRole({
    roles: ['admin', 'office_clerk'],
    title: 'Có báo cáo tuần mới',
    message: `${user.fullName} vừa nộp báo cáo tuần.`,
    type: 'report_submitted',
    link: '/archive',
  });

  return report;
}

export async function returnReport(reportId: string, reason: string, adminUser: AuthUser) {
  if (adminUser.role !== 'admin') {
    const error = new Error('Chỉ admin mới có quyền trả lại báo cáo');
    Object.assign(error, { statusCode: 403 });
    throw error;
  }

  const report = await Report.findById(reportId).populate('periodId');
  if (!report) {
    const error = new Error('Không tìm thấy báo cáo');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  const period: any = report.periodId;
  if (period && period.status === 'archived') {
    const error = new Error('Kỳ báo cáo đã được lưu trữ, không thể trả lại báo cáo');
    Object.assign(error, { statusCode: 403 });
    throw error;
  }

  if (report.status !== 'pending' && report.status !== 'approved') {
    const error = new Error('Chỉ có thể trả lại báo cáo đã nộp');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  report.status = 'draft';
  // Remove submittedAt if it exists
  if (report.submittedAt) {
    report.submittedAt = undefined;
  }
  await report.save();

  if (report.ownerId) {
    void createNotification({
      recipientId: report.ownerId.toString(),
      title: 'Báo cáo bị trả lại',
      message: `Quản trị viên đã trả lại báo cáo "${report.title}" của bạn với lý do: ${reason}`,
      type: 'report_returned',
      link: report.reportType === 'weekly' ? '/employee-report' : '/monthly-report',
    });
  }

  return report;
}

export async function recallReport(reportId: string, user: AuthUser) {
  const report = await Report.findById(reportId).populate('periodId');
  if (!report) {
    const error = new Error('Không tìm thấy báo cáo');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  const period: any = report.periodId;
  if (period && period.status !== 'open') {
    const error = new Error('Kỳ báo cáo đã bị khóa hoặc lưu trữ, không thể thu hồi');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  if (report.ownerId?.toString() !== user.id && user.role !== 'admin') {
    const error = new Error('Bạn không có quyền thu hồi báo cáo này');
    Object.assign(error, { statusCode: 403 });
    throw error;
  }

  if (report.status !== 'pending') {
    const error = new Error('Chỉ có thể thu hồi báo cáo ở trạng thái chờ duyệt (pending)');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  report.status = 'draft';
  if (report.submittedAt) {
    report.submittedAt = undefined;
  }
  await report.save();

  return report;
}

async function resolveMonthlyPeriod(periodId?: string) {
  const period = periodId
    ? await ReportPeriod.findById(periodId)
    : await ReportPeriod.findOne({ type: 'monthly', status: 'open' }).sort({ year: -1, month: -1, createdAt: -1 });

  if (!period) {
    const error = new Error('Chưa có kỳ báo cáo tháng đang mở');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  if (period.status !== 'open') {
    const error = new Error('Kỳ báo cáo đã khóa hoặc chưa mở');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  return period;
}

export async function getCurrentMonthlyStaffReport(user: AuthUser, periodId?: string) {
  const period = await resolveMonthlyPeriod(periodId);
  const report = await Report.findOne({ ownerId: user.id, periodId: period.id, reportType: 'monthly_staff' });
  return { period, report };
}

export async function createMonthlyStaffReport(input: MonthlyStaffInput, user: AuthUser) {
  if (!input.period || !input.content) {
    const error = new Error('Vui lòng nhập kết quả thực hiện');
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  const period = await resolveMonthlyPeriod(input.periodId);
  const existing = await Report.findOne({ ownerId: user.id, periodId: period.id, reportType: 'monthly_staff' });

  if (existing && existing.status !== 'draft') {
    const error = new Error('Báo cáo kỳ này đã nộp, không thể ghi đè');
    Object.assign(error, { statusCode: 409 });
    throw error;
  }

  const data = {
    title: `BÁO CÁO CHUYÊN VIÊN ${input.period.toUpperCase()}`,
    reportType: 'monthly_staff',
    ownerId: user.id,
    periodId: period.id,
    period: input.period,
    department: user.department,
    sender: user.fullName,
    status: input.status,
    content: input.content,
    difficulties: input.difficulties,
    proposals: input.proposals,
    nextTasks: input.nextTasks,
    submittedAt: input.status === 'pending' ? new Date() : undefined,
  };

  if (existing) {
    Object.assign(existing, data);
    return existing.save();
  }

  return Report.create(data);
}

export async function submitMonthlyStaffReport(reportId: string, user: AuthUser) {
  const report = await Report.findById(reportId).populate('periodId');

  if (!report || report.reportType !== 'monthly_staff') {
    const error = new Error('Không tìm thấy báo cáo tháng');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  const period: any = report.periodId;
  if (period && period.status === 'archived') {
    const error = new Error('Kỳ báo cáo đã được lưu trữ, không thể thay đổi');
    Object.assign(error, { statusCode: 403 });
    throw error;
  }

  if (user.role !== 'admin' && report.ownerId?.toString() !== user.id) {
    const error = new Error('Bạn không có quyền nộp báo cáo này');
    Object.assign(error, { statusCode: 403 });
    throw error;
  }

  if (report.status !== 'draft') {
    const error = new Error('Báo cáo đã nộp trước đó');
    Object.assign(error, { statusCode: 409 });
    throw error;
  }

  report.status = 'pending';
  report.submittedAt = new Date();
  await report.save();

  void notifyUsersByRole({
    roles: ['admin', 'office_clerk'],
    title: 'Có báo cáo tháng mới',
    message: `${user.fullName} vừa nộp báo cáo tháng.`,
    type: 'report_submitted',
    link: '/archive',
  });

  return report;
}

export async function exportWeeklyReportDocx(input: WeeklyReportInput) {
  validateWeeklyReportInput(input);

  const templatePath = resolveWeeklyTemplatePath();
  const scriptPath = path.resolve(process.cwd(), 'src', 'scripts', 'generate_weekly_docx.py');
  const outputPath = path.join(os.tmpdir(), `bao-cao-tuan-${Date.now()}.docx`);

  if (!fs.existsSync(templatePath)) {
    const error = new Error('Không tìm thấy file mẫu DOCX');
    Object.assign(error, { statusCode: 500 });
    throw error;
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn('python', [scriptPath, templatePath, outputPath], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve();
        return;
      }
      console.error('Python Script Failed. Code:', code, 'Stderr:', stderr);
      reject(new Error(stderr));
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });

  return outputPath;
}

export async function exportWeeklyReportDocxById(reportId: string, user: AuthUser) {
  const report = await Report.findById(reportId);
  if (!report || report.reportType !== 'weekly') {
    const error = new Error('Không tìm thấy báo cáo tuần');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  if (user.role !== 'admin' && user.role !== 'viewer' && report.ownerId?.toString() !== user.id) {
    const error = new Error('Bạn không có quyền xuất báo cáo này');
    Object.assign(error, { statusCode: 403 });
    throw error;
  }

  return exportWeeklyReportDocx({
    period: requireReportValue(report.period, 'Báo cáo thiếu kỳ báo cáo'),
    reportTitle: requireReportValue(report.reportTitle, 'Báo cáo thiếu tiêu đề theo template DOCX'),
    startDate: report.startDate?.toISOString(),
    endDate: report.endDate?.toISOString(),
    field: requireReportValue(report.field, 'Báo cáo thiếu lĩnh vực'),
    sender: requireReportValue(report.sender, 'Báo cáo thiếu người báo cáo'),
    department: requireReportValue(report.department, 'Báo cáo thiếu đơn vị báo cáo'),
    content: requireReportValue(report.content, 'Báo cáo thiếu kết quả thực hiện'),
    administrativeReform: report.administrativeReform,
    digitalTransformation: report.digitalTransformation,
    nextTasks: report.nextTasks,
    difficulties: report.difficulties,
    proposals: report.proposals,
    dueDate: report.dueDate?.toISOString(),
    status: report.status === 'draft' ? 'draft' : 'pending',
  });
}
