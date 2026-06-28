import Report from '../models/Report';

export function listRecentReports() {
  return Report.find().sort({ createdAt: -1 }).limit(10);
}

export async function seedReportsIfEmpty() {
  const count = await Report.countDocuments();
  if (count > 0) {
    return { message: 'Already seeded' };
  }

  await Report.insertMany([
    {
      title: 'Báo cáo an ninh trật tự Tuần 32',
      department: 'Công an xã',
      sender: 'Đại úy Trần Văn B',
      status: 'approved',
      content: 'Nội dung báo cáo an ninh trật tự tuần 32',
      submittedAt: new Date(),
    },
    {
      title: 'Báo cáo y tế dự phòng Tháng 10',
      department: 'Trạm Y tế',
      sender: 'Bs. Lê Thị C',
      status: 'pending',
      content: 'Nội dung báo cáo y tế dự phòng tháng 10',
      submittedAt: new Date(),
    },
    {
      title: 'Báo cáo thu ngân sách quý III',
      department: 'Bộ phận Tài chính',
      sender: 'Kế toán Phạm D',
      status: 'draft',
      content: 'Nội dung báo cáo thu ngân sách quý III',
    },
  ]);

  return { message: 'Seeded successfully' };
}
