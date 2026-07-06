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

  // --- Function to fetch and format MonthlySummary ---
  const fetchMonthlySummaries = async () => {
    const filter: any = periodIds.length > 0 ? { periodId: { $in: periodIds } } : {};
    const summaries = await MonthlySummary.find(filter).populate('authorId', 'fullName username department');
    return summaries.map((s: any) => ({
      _id: s._id,
      title: `Tổng hợp tháng - ${s.periodTitle}`,
      reportType: 'monthly_summary',
      periodId: s.periodId,
      periodInfo: periodMap.get(s.periodId?.toString()),
      sender: s.authorId?.fullName || 'Hệ thống',
      department: s.authorId?.department || 'UBND Xã',
      status: s.status || 'draft',
      submittedAt: s.updatedAt,
    }));
  };

  // --- Function to fetch and format Report ---
  const fetchReports = async () => {
    const reportFilter: any = { status: { $in: ['pending', 'approved'] } };
    if (periodIds.length > 0) reportFilter.periodId = { $in: periodIds };
    if (query.reportType) reportFilter.reportType = query.reportType;
    if (query.sender) reportFilter.sender = { $regex: query.sender, $options: 'i' };

    const reports = await Report.find(reportFilter);
    return reports.map((r: any) => ({
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
  };

  let allData: any[] = [];

  if (query.reportType === 'monthly_summary') {
    allData = await fetchMonthlySummaries();
    if (query.sender) {
      allData = allData.filter(item => item.sender.toLowerCase().includes(query.sender!.toLowerCase()));
    }
  } else if (query.reportType === 'weekly' || query.reportType === 'monthly_staff') {
    allData = await fetchReports();
  } else {
    // Both
    const [summaries, reports] = await Promise.all([fetchMonthlySummaries(), fetchReports()]);
    allData = [...summaries, ...reports];
    if (query.sender) {
      allData = allData.filter(item => item.sender.toLowerCase().includes(query.sender!.toLowerCase()));
    }
  }

  // Sort by submittedAt desc
  allData.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const total = allData.length;
  const paginatedData = allData.slice(skip, skip + limit);

  return { data: paginatedData, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getArchivedReportById(id: string, type: string) {
  let reportData;
  let periodId;

  if (type === 'monthly_summary') {
    const summary = await MonthlySummary.findById(id).populate('authorId', 'fullName username department');
    if (!summary) throw new Error('Không tìm thấy bản tổng hợp');
    reportData = summary.toObject();
    periodId = summary.periodId;
  } else {
    const report = await Report.findById(id);
    if (!report) throw new Error('Không tìm thấy báo cáo');
    reportData = report.toObject();
    periodId = report.periodId;
  }

  const period = await ReportPeriod.findById(periodId);
  return { ...reportData, periodInfo: period };
}
