import Report from '../models/Report';
import ReportPeriod from '../models/ReportPeriod';
import User from '../models/User';

export async function getDashboardOverview() {
  // Lấy các kỳ báo cáo đang mở
  const openPeriods = await ReportPeriod.find({ status: 'open' });
  const openPeriodIds = openPeriods.map(p => p._id);

  if (openPeriodIds.length === 0) {
    return {
      totalReports: 0,
      pendingReports: 0,
      approvedReports: 0,
      weeklySubmitted: 0,
    };
  }

  const filter = { periodId: { $in: openPeriodIds } };

  const pendingReports = await Report.countDocuments({ ...filter, status: 'pending' });
  const approvedReports = await Report.countDocuments({ ...filter, status: 'approved' });
  const totalReports = await Report.countDocuments({ ...filter, status: { $ne: 'draft' } }); // Tổng đã nộp

  const openWeeklyPeriod = openPeriods.find(p => p.type === 'weekly');
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
  
  // Lấy danh sách các phòng ban thực tế từ User collection (chỉ lấy staff và department_lead đang active)
  const users = await User.find({ isActive: true, role: { $in: ['staff', 'department_lead'] } }).select('department');
  
  // Loại bỏ trùng lặp phòng ban
  const uniqueDepartments = Array.from(new Set(users.map(u => u.department).filter(Boolean)));

  if (!openWeeklyPeriod || uniqueDepartments.length === 0) {
    return [];
  }

  // Get reports submitted for this period
  const reports = await Report.find({ periodId: openWeeklyPeriod._id, reportType: 'weekly' });
  
  return uniqueDepartments.map((dep) => {
    // Đếm số user trong phòng ban
    const usersInDep = users.filter(u => u.department === dep).length;
    // Đếm số báo cáo đã nộp của phòng ban
    const submittedReports = reports.filter((r) => r.department === dep && r.status !== 'draft').length;

    // Giả sử mỗi user 1 báo cáo, nếu có 1 user thì total=1. Tạm thời lấy total = usersInDep hoặc 1.
    // Thực tế nếu gộp phòng ban thì có thể chỉ 1 báo cáo đại diện. Ta tính theo 1 báo cáo/phòng ban để dễ nhìn bar chart.
    const isSubmitted = submittedReports > 0;
    
    // Tìm báo cáo gần nhất của phòng ban để lấy status
    const report = reports.find((r) => r.department === dep && r.status !== 'draft');

    return {
      department: dep,
      submitted: isSubmitted ? 1 : 0,
      total: 1, 
      status: report ? report.status : 'not_submitted'
    };
  });
}
