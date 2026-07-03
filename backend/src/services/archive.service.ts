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

export async function getArchivedReports(query: ArchiveQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  // Find all archived periods matching the date filters
  const periodFilter: any = { status: 'archived' };
  if (query.year) periodFilter.year = query.year;
  if (query.month) periodFilter.month = query.month;
  if (query.weekNumber) periodFilter.weekNumber = query.weekNumber;

  // We can optimize by narrowing down the period type based on reportType if specified
  if (query.reportType === 'weekly') {
    periodFilter.type = 'weekly';
  } else if (query.reportType === 'monthly_staff' || query.reportType === 'monthly_summary') {
    periodFilter.type = 'monthly';
  }

  const periods = await ReportPeriod.find(periodFilter).select('_id title type year month weekNumber');
  const periodIds = periods.map(p => p._id);
  const periodMap = new Map(periods.map(p => [p._id.toString(), p]));

  if (periodIds.length === 0) {
    return { data: [], total: 0, page, limit, totalPages: 0 };
  }

  // If reportType is monthly_summary, we query MonthlySummary instead of Report
  if (query.reportType === 'monthly_summary') {
    const filter: any = { periodId: { $in: periodIds } };
    
    // Monthly summary doesn't have sender in the same way, but we can filter by author
    const summaries = await MonthlySummary.find(filter)
      .populate('authorId', 'fullName username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await MonthlySummary.countDocuments(filter);
    
    const formattedData = summaries.map((s: any) => ({
      _id: s._id,
      title: `Tổng hợp tháng - ${s.periodTitle}`,
      reportType: 'monthly_summary',
      periodId: s.periodId,
      periodInfo: periodMap.get(s.periodId.toString()),
      sender: s.authorId?.fullName || s.authorId?.username || 'Hệ thống',
      department: 'PHÒNG VĂN HÓA - XÃ HỘI',
      status: 'archived',
      submittedAt: s.updatedAt,
    }));

    return { data: formattedData, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Otherwise, we query Reports (weekly or monthly_staff)
  const reportFilter: any = { periodId: { $in: periodIds }, status: { $ne: 'draft' } }; // Only submitted/approved reports
  
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
    periodInfo: periodMap.get(r.periodId.toString()),
    sender: r.sender,
    department: r.department,
    status: 'archived',
    submittedAt: r.submittedAt || r.updatedAt,
  }));

  return { data: formattedData, total, page, limit, totalPages: Math.ceil(total / limit) };
}
