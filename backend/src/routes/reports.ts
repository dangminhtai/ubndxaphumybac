import { Router, Request, Response } from 'express';
import Report from '../models/Report';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(10);
    res.json(reports);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(500).json({ error: message });
  }
});

router.post('/seed', async (_req: Request, res: Response) => {
  try {
    const count = await Report.countDocuments();
    if (count === 0) {
      await Report.insertMany([
        { title: 'Báo cáo an ninh trật tự Tuần 32', department: 'Công an xã', sender: 'Đại úy Trần Văn B', status: 'approved', content: 'Nội dung báo cáo an ninh trật tự tuần 32', submittedAt: new Date() },
        { title: 'Báo cáo y tế dự phòng Tháng 10', department: 'Trạm Y tế', sender: 'Bs. Lê Thị C', status: 'pending', content: 'Nội dung báo cáo y tế dự phòng tháng 10', submittedAt: new Date() },
        { title: 'Báo cáo thu ngân sách quý III', department: 'Bộ phận Tài chính', sender: 'Kế toán Phạm D', status: 'draft', content: 'Nội dung báo cáo thu ngân sách quý III' }
      ]);
      res.json({ message: 'Seeded successfully' });
    } else {
      res.json({ message: 'Already seeded' });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(500).json({ error: message });
  }
});

export default router;
