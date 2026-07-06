import Report from '../models/Report';
import ReportPeriod from '../models/ReportPeriod';
import { MonthlySummary } from '../models/MonthlySummary';

export interface ArchiveQuery {
  page?: number;
  limit?: number;
  year?: number;
  month?: number;
  weekNumber?: number;
  reportType?: string; // 'weekly' | 'monthly_staff' | 'monthly_summary'
  sender?: string;
}

function requireArchiveValue(value: string | undefined, message: string) {
  if (!value) {
    const error = new Error(message);
    Object.assign(error, { statusCode: 400 });
    throw error;
  }
  return value;
}

export async function getArchivedReports(query: ArchiveQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  // Find periods matching date filters (all statuses, not just archived)
  const periodFilter: any = {};
  if (query.year) periodFilter.year = query.year;
  if (query.month) periodFilter.month = query.month;
  if (query.weekNumber) periodFilter.weekNumber = query.weekNumber;

  if (query.reportType === 'weekly') {
    periodFilter.type = 'weekly';
  } else if (query.reportType === 'monthly_staff' || query.reportType === 'monthly_summary') {
    periodFilter.type = 'monthly';
  }

  const periods = await ReportPeriod.find(periodFilter).select('_id title type year month weekNumber');
  const periodIds = periods.map(p => p._id);
  const periodMap = new Map(periods.map(p => [p._id.toString(), p]));

  // If reportType is monthly_summary, query MonthlySummary
  if (query.reportType === 'monthly_summary') {
    const filter: any = periodIds.length > 0 ? { periodId: { $in: periodIds } } : {};

    const summaries = await MonthlySummary.find(filter)
      .populate('authorId', 'fullName username department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MonthlySummary.countDocuments(filter);

    const formattedData = summaries.map((s: any) => ({
      _id: s._id,
      title: `Tổng hợp tháng - ${s.periodTitle}`,
      reportType: 'monthly_summary',
      periodId: s.periodId,
      periodInfo: periodMap.get(s.periodId?.toString()),
      sender: requireArchiveValue(s.authorId?.fullName, 'Bản tổng hợp tháng thiếu người tạo'),
      department: requireArchiveValue(s.authorId?.department, 'Bản tổng hợp tháng thiếu đơn vị người tạo'),
      status: requireArchiveValue(s.status, 'Bản tổng hợp tháng thiếu trạng thái'),
      submittedAt: s.updatedAt,
    }));

    return { data: formattedData, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Query Reports (weekly or monthly_staff) — show pending/approved reports
  const reportFilter: any = { status: { $in: ['pending', 'approved'] } };

  if (periodIds.length > 0) {
    reportFilter.periodId = { $in: periodIds };
  }

  if (query.reportType) {
    reportFilter.reportType = query.reportType;
  }

  if (query.sender) {
    reportFilter.sender = { $regex: query.sender, $options: 'i' };
  }

  const reports = await Report.find(reportFilter)
    .sort({ submittedAt: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Report.countDocuments(reportFilter);

  const formattedData = reports.map((r: any) => ({
    _id: r._id,
    title: r.title,
    reportType: r.reportType,
    periodId: r.periodId,
    periodInfo: periodMap.get(r.periodId?.toString()),
    sender: r.sender,
    department: r.department,
    status: r.status,
    submittedAt: r.submittedAt || r.updatedAt,
  }));

  return { data: formattedData, total, page, limit, totalPages: Math.ceil(total / limit) };
}
