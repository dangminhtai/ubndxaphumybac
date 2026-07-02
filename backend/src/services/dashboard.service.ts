import Report from '../models/Report';
import ReportPeriod from '../models/ReportPeriod';

export async function getDashboardOverview() {
  const totalReports = await Report.countDocuments();
  const pendingReports = await Report.countDocuments({ status: 'pending' });
  const approvedReports = await Report.countDocuments({ status: 'approved' });

  // Weekly reports this week
  const openWeeklyPeriod = await ReportPeriod.findOne({ type: 'weekly', status: 'open' });
  let weeklySubmitted = 0;
  if (openWeeklyPeriod) {
    weeklySubmitted = await Report.countDocuments({ periodId: openWeeklyPeriod._id, reportType: 'weekly', status: { $ne: 'draft' } });
  }

  return {
    totalReports,
    pendingReports,
    approvedReports,
    weeklySubmitted,
  };
}

export async function getSubmissionProgress() {
  const openWeeklyPeriod = await ReportPeriod.findOne({ type: 'weekly', status: 'open' });
  if (!openWeeklyPeriod) {
    return [];
  }

  // Get reports submitted for this period, grouped by department
  const reports = await Report.find({ periodId: openWeeklyPeriod._id, reportType: 'weekly' });
  
  // Hardcoded departments for demonstration, normally would be derived from user list
  const departments = ['Trạm Y tế', 'Công an xã', 'Bộ phận Tài chính', 'Văn phòng HĐND-UBND', 'Bộ phận Tư pháp'];
  
  return departments.map((dep) => {
    const report = reports.find((r) => r.department === dep);
    return {
      department: dep,
      submitted: report && report.status !== 'draft' ? 1 : 0,
      total: 1, // Assume 1 report per department
      status: report && report.status !== 'draft' ? report.status : 'not_submitted'
    };
  });
}
