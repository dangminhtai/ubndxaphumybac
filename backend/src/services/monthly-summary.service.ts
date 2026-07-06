import path from 'path';
import { spawn } from 'child_process';
import { MonthlySummary } from '../models/MonthlySummary';
import Report, { IReport } from '../models/Report';
import ReportPeriod from '../models/ReportPeriod';
import User from '../models/User';
import type { AuthUser } from '../middleware/auth.middleware';

function requireSummaryValue(value: string | undefined, message: string) {
  if (!value) {
    const error = new Error(message);
    Object.assign(error, { statusCode: 400 });
    throw error;
  }
  return value;
}

export async function getMonthlySummaryByPeriod(periodId: string) {
  const period = await ReportPeriod.findById(periodId);
  if (!period) throw new Error('Không tìm thấy kỳ báo cáo');

  const periodsInMonth = await ReportPeriod.find({
    year: period.year,
    month: period.month,
  });
  const periodIdsInMonth = periodsInMonth.map(p => p._id);

  let rawEmployeeReports = await Report.find({
    periodId: { $in: periodIdsInMonth },
    status: { $in: ['pending', 'approved'] },
  }).populate('ownerId').sort({ createdAt: -1 });

  // Lọc bỏ những báo cáo của user đã bị xóa hoặc vô hiệu hóa
  const employeeReports = rawEmployeeReports.filter(r => r.ownerId && (r.ownerId as any).isActive);

  let summary = await MonthlySummary.findOne({ periodId });
  if (!summary) {
    // Return empty summary shape if it doesn't exist
    return {
      periodId: period.id,
      periodTitle: period.title,
      content: '',
      difficulties: '',
      proposals: '',
      nextTasks: '',
      status: 'draft',
      employeeReports,
    };
  }

  return { ...summary.toObject(), employeeReports };
}

export async function generateMonthlySummaryFromStaff(periodId: string, user: AuthUser) {
  if (user.role !== 'admin') {
    const error = new Error('Chỉ admin mới có quyền tổng hợp báo cáo');
    Object.assign(error, { statusCode: 403 });
    throw error;
  }

  const period = await ReportPeriod.findById(periodId);
  if (!period) throw new Error('Không tìm thấy kỳ báo cáo');
  if (period.status === 'archived') {
    const error = new Error('Kỳ báo cáo đã được lưu trữ, không thể thay đổi');
    Object.assign(error, { statusCode: 403 });
    throw error;
  }

  const periodsInMonth = await ReportPeriod.find({
    year: period.year,
    month: period.month,
  });
  const periodIdsInMonth = periodsInMonth.map(p => p._id);

  // Find all submitted or pending reports from staff for this month (both weekly and monthly_staff)
  const rawStaffReports = await Report.find({
    periodId: { $in: periodIdsInMonth },
    status: { $in: ['pending', 'approved'] },
  }).populate('ownerId');

  const staffReports = rawStaffReports.filter(r => r.ownerId && (r.ownerId as any).isActive);

  const totalStaffUsers = await User.countDocuments({ role: 'staff', isActive: true });
  const uniqueSubmitters = new Set(staffReports.map(r => r.ownerId.toString()));

  if (uniqueSubmitters.size < totalStaffUsers) {
    const error = new Error(`Chưa đủ báo cáo. Hiện có ${uniqueSubmitters.size}/${totalStaffUsers} nhân viên đã nộp báo cáo.`);
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  const combinedContent = staffReports.map((r: IReport) => `[${r.sender} - ${r.department}]\n${r.content}`).join('\n\n');
  const combinedDifficulties = staffReports.filter((r: IReport) => r.difficulties).map((r: IReport) => `[${r.sender}]\n${r.difficulties}`).join('\n\n');
  const combinedProposals = staffReports.filter((r: IReport) => r.proposals).map((r: IReport) => `[${r.sender}]\n${r.proposals}`).join('\n\n');
  const combinedNextTasks = staffReports.filter((r: IReport) => r.nextTasks).map((r: IReport) => `[${r.sender}]\n${r.nextTasks}`).join('\n\n');

  let summary = await MonthlySummary.findOne({ periodId });
  if (summary) {
    summary.content = combinedContent;
    summary.difficulties = combinedDifficulties;
    summary.proposals = combinedProposals;
    summary.nextTasks = combinedNextTasks;
    summary.authorId = user.id as any;
    return summary.save();
  }

  summary = new MonthlySummary({
    periodId,
    periodTitle: period.title,
    content: combinedContent,
    difficulties: combinedDifficulties,
    proposals: combinedProposals,
    nextTasks: combinedNextTasks,
    authorId: user.id,
    status: 'draft',
  });

  return summary.save();
}

export async function updateMonthlySummary(periodId: string, data: any, user: AuthUser) {
  if (user.role !== 'admin') {
    const error = new Error('Chỉ admin mới có quyền cập nhật bản tổng hợp');
    Object.assign(error, { statusCode: 403 });
    throw error;
  }

  const period = await ReportPeriod.findById(periodId);
  if (!period) throw new Error('Không tìm thấy kỳ báo cáo');
  if (period.status === 'archived') {
    const error = new Error('Kỳ báo cáo đã được lưu trữ, không thể thay đổi');
    Object.assign(error, { statusCode: 403 });
    throw error;
  }

  let summary = await MonthlySummary.findOne({ periodId });
  if (!summary) {
    summary = new MonthlySummary({
      periodId,
      periodTitle: period.title,
      authorId: user.id,
      ...data,
    });
  } else {
    Object.assign(summary, data);
  }

  return summary.save();
}

export async function exportMonthlySummaryDocx(periodId: string) {
  const summary = await MonthlySummary.findOne({ periodId }).populate('authorId', 'department');
  if (!summary) {
    const error = new Error('Bản tổng hợp chưa được tạo');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  const author = summary.authorId as any;

  const payload = {
    period: summary.periodTitle,
    reportTitle: `BÁO CÁO CÔNG TÁC ${summary.periodTitle.toUpperCase()}`,
    content: summary.content,
    difficulties: summary.difficulties,
    proposals: summary.proposals,
    nextTasks: summary.nextTasks,
    department: requireSummaryValue(author?.department, 'Bản tổng hợp thiếu đơn vị người tạo'),
  };

  const templatePath = path.resolve(__dirname, '../../../../template_docx/Báo cáo tháng 6 và phương hướng, nhiệm vụ tháng 7.docx');
  const tempId = Math.random().toString(36).slice(2);
  const outputPath = path.resolve(__dirname, `../../../../tmp/summary_${tempId}.docx`);
  const scriptPath = path.resolve(__dirname, '../scripts/generate_monthly_summary_docx.py');

  return new Promise<string>((resolve, reject) => {
    const py = spawn('python', [scriptPath, templatePath, outputPath]);
    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();

    let errData = '';
    py.stderr.on('data', (data) => {
      errData += data.toString();
    });

    py.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`Python script failed with code ${code}. Error: ${errData}`));
      }
    });
  });
}
