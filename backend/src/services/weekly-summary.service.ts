import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import mongoose from 'mongoose';
import ReportPeriod, { type IReportPeriod } from '../models/ReportPeriod';
import Report from '../models/Report';
import User from '../models/User';
import WeeklySummary from '../models/WeeklySummary';
import type { AuthUser } from '../middleware/auth.middleware';

interface ReportOwner {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  department: string;
}

export interface WeeklySourceReport {
  _id: mongoose.Types.ObjectId;
  ownerId: ReportOwner | null;
  status: string;
  field?: string;
  department: string;
  sender: string;
  content: string;
  difficulties?: string;
  proposals?: string;
  nextTasks?: string;
  submittedAt?: Date;
  updatedAt?: Date;
}

export interface WeeklySummaryUpdate {
  content?: string;
  difficulties?: string;
  proposals?: string;
  nextTasks?: string;
  status?: 'draft' | 'published';
}

export function buildWeeklySourceFilter(periodId: mongoose.Types.ObjectId | string) {
  return {
    periodId,
    reportType: 'weekly',
    status: { $in: ['pending', 'approved'] },
    ownerId: { $exists: true },
  } as const;
}

function appError(message: string, statusCode: number, code: string) {
  return Object.assign(new Error(message), { statusCode, code });
}

function ownerKey(report: WeeklySourceReport) {
  return report.ownerId?._id?.toString() || '';
}

function reportTimestamp(report: WeeklySourceReport) {
  return new Date(report.submittedAt || report.updatedAt || 0).getTime();
}

export function deduplicateWeeklyReports(reports: WeeklySourceReport[]) {
  const selected = new Map<string, WeeklySourceReport>();
  let duplicateReports = 0;

  for (const report of reports) {
    const key = ownerKey(report);
    if (!key) continue;
    const current = selected.get(key);
    if (!current) {
      selected.set(key, report);
      continue;
    }

    duplicateReports += 1;
    const reportPriority = report.status === 'approved' ? 1 : 0;
    const currentPriority = current.status === 'approved' ? 1 : 0;
    if (reportPriority > currentPriority || (
      reportPriority === currentPriority && reportTimestamp(report) > reportTimestamp(current)
    )) {
      selected.set(key, report);
    }
  }

  return { reports: [...selected.values()], duplicateReports };
}

async function resolveWeeklyPeriod(periodId: string) {
  if (!mongoose.isValidObjectId(periodId)) {
    throw appError('Kỳ báo cáo không hợp lệ', 400, 'WEEKLY_PERIOD_NOT_FOUND');
  }
  const period = await ReportPeriod.findById(periodId);
  if (!period) throw appError('Không tìm thấy kỳ báo cáo', 404, 'WEEKLY_PERIOD_NOT_FOUND');
  if (period.type !== 'weekly') {
    throw appError('Chức năng tổng hợp chỉ nhận kỳ báo cáo tuần', 400, 'WEEKLY_PERIOD_REQUIRED');
  }
  return period;
}

async function ensureExpectedReporters(period: IReportPeriod) {
  if (period.expectedReporterIds?.length) return period.expectedReporterIds;
  const reporters = await User.find({ role: 'staff', isActive: true }).select('_id').lean();
  period.expectedReporterIds = reporters.map((user) => user._id);
  await period.save();
  return period.expectedReporterIds;
}

export async function getEligibleWeeklyReports(periodId: string) {
  const period = await resolveWeeklyPeriod(periodId);
  const expectedReporterIds = await ensureExpectedReporters(period);
  const expectedSet = new Set(expectedReporterIds.map((id) => id.toString()));

  const source = await Report.find(buildWeeklySourceFilter(period._id))
    .populate('ownerId', 'fullName department')
    .sort({ submittedAt: -1, updatedAt: -1 })
    .lean();

  const activeReports = (source as unknown as WeeklySourceReport[]).filter((report) => (
    report.ownerId && expectedSet.has(report.ownerId._id.toString())
  ));
  const deduplicated = deduplicateWeeklyReports(activeReports);
  deduplicated.reports.sort((left, right) => {
    const fieldCompare = (left.field || left.department).localeCompare(right.field || right.department, 'vi');
    return fieldCompare
      || left.sender.localeCompare(right.sender, 'vi')
      || left._id.toString().localeCompare(right._id.toString());
  });

  const submittedIds = new Set(deduplicated.reports.map(ownerKey));
  const expectedUsers = await User.find({ _id: { $in: expectedReporterIds } })
    .select('_id fullName department')
    .sort({ fullName: 1 })
    .lean();
  const expectedUserMap = new Map(expectedUsers.map((user) => [user._id.toString(), user]));
  const expectedEmployees = expectedReporterIds.map((id) => expectedUserMap.get(id.toString()) || {
    _id: id,
    fullName: 'Tài khoản đã xóa',
    department: 'Không còn dữ liệu tài khoản',
  });
  const missingEmployees = expectedEmployees.filter((user) => !submittedIds.has(user._id.toString()));
  const lateReportIds = deduplicated.reports
    .filter((report) => report.submittedAt && new Date(report.submittedAt) > period.dueDate)
    .map((report) => report._id.toString());

  return {
    period,
    reports: deduplicated.reports.map((report) => ({
      ...report,
      isLate: lateReportIds.includes(report._id.toString()),
    })),
    missingEmployees,
    submissionStats: {
      expected: expectedEmployees.length,
      submitted: deduplicated.reports.length,
      missing: missingEmployees.length,
      late: lateReportIds.length,
      duplicateReports: deduplicated.duplicateReports,
    },
  };
}

function formatReportHeading(report: WeeklySourceReport) {
  const heading = report.field?.trim() || report.department?.trim() || 'Chưa phân lĩnh vực';
  return `- ${heading.charAt(0).toUpperCase()}${heading.slice(1)}`;
}

function combineSection(reports: WeeklySourceReport[], field: 'content' | 'difficulties' | 'proposals' | 'nextTasks') {
  return reports
    .filter((report) => Boolean(report[field]?.trim()))
    .map((report) => `${formatReportHeading(report)}\n${report[field]!.trim()}`)
    .join('\n\n');
}

export async function getWeeklySummaryByPeriod(periodId: string) {
  const source = await getEligibleWeeklyReports(periodId);
  const summary = await WeeklySummary.findOne({ periodId });
  return {
    summary: summary?.toObject() || {
      periodId: source.period.id,
      periodTitle: source.period.title,
      sourceReportIds: [],
      content: '',
      difficulties: '',
      proposals: '',
      nextTasks: '',
      status: 'draft',
    },
    period: source.period,
    submissionStats: source.submissionStats,
    employeeReports: source.reports,
    missingEmployees: source.missingEmployees,
  };
}

export async function generateWeeklySummary(periodId: string, user: AuthUser) {
  const source = await getEligibleWeeklyReports(periodId);
  if (source.period.status === 'archived') {
    throw appError('Kỳ báo cáo đã lưu trữ, không thể tạo lại tổng hợp', 409, 'WEEKLY_PERIOD_ARCHIVED');
  }
  if (source.reports.length === 0) {
    throw appError('Chưa có báo cáo tuần hợp lệ để tổng hợp', 409, 'WEEKLY_SUMMARY_NO_SOURCE_REPORTS');
  }
  if (source.submissionStats.duplicateReports > 0) {
    throw appError('Phát hiện báo cáo trùng của cùng nhân viên trong kỳ', 409, 'WEEKLY_SUMMARY_DUPLICATE_SOURCE');
  }

  await WeeklySummary.findOneAndUpdate(
    { periodId: source.period._id },
    {
      $set: {
        periodTitle: source.period.title,
        sourceReportIds: source.reports.map((report) => report._id),
        sourceGeneratedAt: new Date(),
        content: combineSection(source.reports, 'content'),
        difficulties: combineSection(source.reports, 'difficulties'),
        proposals: combineSection(source.reports, 'proposals'),
        nextTasks: combineSection(source.reports, 'nextTasks'),
        authorId: user.id,
      },
      $setOnInsert: { status: 'draft' },
    },
    { upsert: true, new: true, runValidators: true },
  );
  return getWeeklySummaryByPeriod(periodId);
}

export async function updateWeeklySummary(periodId: string, data: WeeklySummaryUpdate, user: AuthUser) {
  const period = await resolveWeeklyPeriod(periodId);
  if (period.status === 'archived') {
    throw appError('Kỳ báo cáo đã lưu trữ, không thể cập nhật', 409, 'WEEKLY_PERIOD_ARCHIVED');
  }
  const allowed: WeeklySummaryUpdate = {};
  for (const field of ['content', 'difficulties', 'proposals', 'nextTasks'] as const) {
    if (typeof data[field] === 'string') allowed[field] = data[field];
  }
  if (data.status === 'draft' || data.status === 'published') allowed.status = data.status;

  await WeeklySummary.findOneAndUpdate(
    { periodId: period._id },
    { $set: { ...allowed, periodTitle: period.title, authorId: user.id } },
    { upsert: true, new: true, runValidators: true },
  );
  return getWeeklySummaryByPeriod(periodId);
}

export async function exportWeeklySummaryDocx(periodId: string) {
  const period = await resolveWeeklyPeriod(periodId);
  const summary = await WeeklySummary.findOne({ periodId }).populate('authorId', 'department');
  if (!summary) throw appError('Chưa có bản tổng hợp tuần để xuất', 404, 'WEEKLY_SUMMARY_NOT_FOUND');
  const author = summary.authorId as unknown as { department?: string };
  if (!author?.department) throw appError('Bản tổng hợp thiếu đơn vị người tạo', 500, 'WEEKLY_SUMMARY_AUTHOR_INVALID');

  const templatePath = path.resolve(process.cwd(), 'src/templates/weekly_template.docx');
  const scriptPath = path.resolve(process.cwd(), 'src/scripts/generate_weekly_summary_docx.py');
  const outputPath = path.join(os.tmpdir(), `tong-hop-tuan-${Date.now()}.docx`);
  if (!fs.existsSync(templatePath)) throw appError('Không tìm thấy template tổng hợp tuần', 500, 'WEEKLY_SUMMARY_TEMPLATE_MISSING');

  const payload = {
    period: period.title,
    reportTitle: `BÁO CÁO CÔNG TÁC ${period.title.toUpperCase()}`,
    department: author.department,
    startDate: period.startDate.toISOString(),
    dueDate: period.dueDate.toISOString(),
    content: summary.content,
    difficulties: summary.difficulties,
    proposals: summary.proposals,
    nextTasks: summary.nextTasks,
  };

  await new Promise<void>((resolve, reject) => {
    const child = spawn('python', [scriptPath, templatePath, outputPath], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) resolve();
      else reject(appError(`Không tạo được DOCX tổng hợp tuần: ${stderr}`, 500, 'WEEKLY_SUMMARY_EXPORT_FAILED'));
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
  return outputPath;
}
