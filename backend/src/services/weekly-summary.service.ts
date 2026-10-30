import fs from 'fs';
import os from 'os';
import path from 'path';
import mongoose from 'mongoose';
import { weeklyLabel } from '../utils/weeklyLabel';
import { runPythonScript } from '../utils/pythonRunner';
import ReportPeriod, { type IReportPeriod } from '../models/ReportPeriod';
import Report from '../models/Report';
import User from '../models/User';
import WeeklySummary from '../models/WeeklySummary';
import { getDocumentConfig } from '../config/document';
import { WEEKLY_GROUPS, buildWeeklyEntries, combineWeeklyEntries, inspectWeeklyFieldSources, summaryEntriesSchema, type SummaryEntry } from './weekly-summary-groups';
import type { FieldReport } from '../domain/fields';
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
  fieldReports?: FieldReport[];
  administrativeReform?: string;
  digitalTransformation?: string;
  difficulties?: string;
  proposals?: string;
  nextTasks?: string;
  submittedAt?: Date;
  updatedAt?: Date;
}

export interface WeeklySummaryUpdate {
  sourceReportIds?: string[];
  entries?: SummaryEntry[];
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
  const reporters = await User.find({ role: 'staff', isActive: true, 'fieldCodes.0': { $exists: true } }).select('_id').lean();
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

function canAutoFill(summary: { entries?: SummaryEntry[]; content?: string; nextTasks?: string; status: string; sourceGeneratedAt?: Date; manuallyEditedAt?: Date; autoUpdateFromSources?: boolean } | null) {
  return !summary || (summary.status === 'draft' && !summary.manuallyEditedAt && (summary.autoUpdateFromSources === true || (!summary.sourceGeneratedAt && !summary.entries?.some((entry) => entry.text.trim()) && !summary.content?.trim() && !summary.nextTasks?.trim())));
}

export async function getWeeklySummaryByPeriod(periodId: string) {
  const source = await getEligibleWeeklyReports(periodId);
  const summary = await WeeklySummary.findOne({ periodId });
  const sourceIssues = inspectWeeklyFieldSources(source.reports);
  const autoFilled = source.period.status !== 'archived' && canAutoFill(summary) && !sourceIssues.length && !source.submissionStats.duplicateReports;
  const previewEntries = autoFilled ? buildWeeklyEntries(source.reports) : undefined;
  return {
    autoFilled,
    summary: summary ? {
      _id: summary._id, periodId: summary.periodId,
      periodTitle: weeklyLabel(source.period.startDate).title,
      entries: previewEntries || summary.entries || [], sourceReportIds: autoFilled ? source.reports.map((report) => report._id) : summary.sourceReportIds,
      sourceGeneratedAt: summary.sourceGeneratedAt, status: summary.status,
    } : {
      periodId: source.period.id,
      periodTitle: weeklyLabel(source.period.startDate).title,
      sourceReportIds: autoFilled ? source.reports.map((report) => report._id) : [],
      entries: previewEntries || [],
      status: 'draft',
    },
    period: { ...source.period.toObject(), title: weeklyLabel(source.period.startDate).title },
    nextPeriodTitle: weeklyLabel(source.period.startDate, 1).title,
    submissionStats: source.submissionStats,
    groups: WEEKLY_GROUPS.map(({ id, title }) => ({ id, title })),
    sourceIssues,
    fieldCoverage: {
      expected: 8,
      submitted: new Set(source.reports.flatMap((report) => (report.fieldReports || []).map((field) => field.fieldCode))).size,
    },
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

  const entries = buildWeeklyEntries(source.reports);
  if (inspectWeeklyFieldSources(source.reports).length) throw appError('Nguồn báo cáo thiếu mã hoặc trùng lĩnh vực. Admin cần đối soát nguồn trước khi tổng hợp.', 409, 'WEEKLY_SOURCE_FIELD_CONFLICT');

  await WeeklySummary.findOneAndUpdate(
    { periodId: source.period._id },
    {
      $set: {
        periodTitle: weeklyLabel(source.period.startDate).title,
        sourceReportIds: source.reports.map((report) => report._id),
        sourceGeneratedAt: new Date(),
        autoUpdateFromSources: true,
        entries,
        content: combineWeeklyEntries(entries, 'results'),
        nextTasks: combineWeeklyEntries(entries, 'nextTasks'),
        authorId: user.id,
      },
      $setOnInsert: { status: 'draft' },
      $unset: { difficulties: '', proposals: '', manuallyEditedAt: '' },
    },
    { upsert: true, new: true, runValidators: true, strict: false },
  );
  return getWeeklySummaryByPeriod(periodId);
}

export async function updateWeeklySummary(periodId: string, data: WeeklySummaryUpdate, user: AuthUser) {
  const period = await resolveWeeklyPeriod(periodId);
  if (period.status === 'archived') {
    throw appError('Kỳ báo cáo đã lưu trữ, không thể cập nhật', 409, 'WEEKLY_PERIOD_ARCHIVED');
  }
  const allowed: WeeklySummaryUpdate = {};
  let previewSourceIds: mongoose.Types.ObjectId[] | undefined;
  if (data.entries !== undefined) {
    const parsed = summaryEntriesSchema.safeParse(data.entries);
    if (!parsed.success) throw appError('Nội dung phân nhóm không hợp lệ', 400, 'WEEKLY_SUMMARY_INVALID_ENTRIES');
    const existing = await WeeklySummary.findOne({ periodId });
    const sources = new Set(existing?.sourceReportIds.map(String) || []);
    if (canAutoFill(existing)) {
      const eligible = await getEligibleWeeklyReports(periodId);
      if (!inspectWeeklyFieldSources(eligible.reports).length && !eligible.submissionStats.duplicateReports) {
        const ids = eligible.reports.map((report) => report._id);
        const submittedIds = data.sourceReportIds;
        if (Array.isArray(submittedIds) && submittedIds.length === ids.length && ids.every((id) => submittedIds.includes(String(id)))) {
          previewSourceIds = ids;
          ids.forEach((id) => sources.add(String(id)));
        }
      }
    }
    if (parsed.data.some((entry) => entry.sourceReportId && !sources.has(entry.sourceReportId))) {
      throw appError('Nguồn nội dung không thuộc bản tổng hợp đã lưu', 400, 'WEEKLY_SUMMARY_INVALID_SOURCE');
    }
    allowed.entries = parsed.data;
  }
  if (data.status === 'draft' || data.status === 'published') allowed.status = data.status;

  await WeeklySummary.findOneAndUpdate(
    { periodId: period._id },
    {
      $set: {
        ...allowed, periodTitle: weeklyLabel(period.startDate).title, authorId: user.id,
        manuallyEditedAt: new Date(),
        autoUpdateFromSources: false,
        ...(previewSourceIds ? { sourceReportIds: previewSourceIds, sourceGeneratedAt: new Date() } : {}),
        ...(allowed.entries ? { content: combineWeeklyEntries(allowed.entries, 'results'), nextTasks: combineWeeklyEntries(allowed.entries, 'nextTasks') } : {}),
      },
      $unset: { difficulties: '', proposals: '' },
    },
    { upsert: true, new: true, runValidators: true, strict: false },
  );
  return getWeeklySummaryByPeriod(periodId);
}

function resolveWeeklySummaryScriptPath() {
  const candidates = [
    path.resolve(process.cwd(), 'src/scripts/generate_weekly_summary_docx.py'),
    path.resolve(process.cwd(), 'backend/src/scripts/generate_weekly_summary_docx.py'),
    path.resolve(__dirname, '../scripts/generate_weekly_summary_docx.py'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

export async function exportWeeklySummaryFile(periodId: string, format: 'docx' | 'pdf' = 'docx') {
  const period = await resolveWeeklyPeriod(periodId);
  const summary = await WeeklySummary.findOne({ periodId });
  if (!summary) throw appError('Chưa có bản tổng hợp tuần để xuất', 404, 'WEEKLY_SUMMARY_NOT_FOUND');
  if (!summary.entries) throw appError('Hãy tạo tổng hợp theo mẫu và lưu trước khi xuất.', 409, 'WEEKLY_SUMMARY_GROUPING_REQUIRED');
  if (summary.entries.some((entry) => entry.text.trim() && !entry.groupId)) {
    throw appError('Còn nội dung chưa phân nhóm. Hãy chọn lĩnh vực trước khi xuất.', 409, 'WEEKLY_SUMMARY_GROUPING_REQUIRED');
  }
  const config = getDocumentConfig();
  const scriptPath = resolveWeeklySummaryScriptPath();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-summary-'));
  const label = weeklyLabel(period.startDate);
  const outputPath = path.join(tempDir, `tong-hop-bao-cao-tuan-${label.week}-${label.year}.${format}`);
  try {
    await runPythonScript({
      scriptPath,
      args: [outputPath],
      stdinPayload: {
        config,
        startDate: period.startDate.toISOString(),
        dueDate: period.dueDate.toISOString(),
        sourceGeneratedAt: summary.sourceGeneratedAt?.toISOString(),
        entries: summary.entries,
        groups: WEEKLY_GROUPS.map(({ id, title }) => ({ id, title })),
      },
      cwd: path.dirname(scriptPath),
    });
    const header = fs.readFileSync(outputPath).subarray(0, 5).toString('ascii');
    if (format === 'pdf' ? header !== '%PDF-' : !header.startsWith('PK')) throw new Error('File đầu ra không hợp lệ');
    return outputPath;
  } catch (error: unknown) {
    for (const file of fs.readdirSync(tempDir)) fs.unlinkSync(path.join(tempDir, file));
    fs.rmdirSync(tempDir);
    const message = error instanceof Error ? error.message : String(error);
    throw appError(`Không tạo được ${format.toUpperCase()}: ${message}`, 500, 'WEEKLY_SUMMARY_EXPORT_FAILED');
  }
}

export const exportWeeklySummaryDocx = (periodId: string) => exportWeeklySummaryFile(periodId, 'docx');
