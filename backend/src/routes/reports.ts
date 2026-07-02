import { Router } from 'express';
import {
  exportWeeklyReport,
  exportWeeklyReportById,
  getMyReports,
  getReports,
  getWeeklyCurrent,
  postWeeklyReport,
  submitWeekly,
  getMonthlyStaffCurrent,
  postMonthlyStaffReport,
  submitMonthlyStaff,
} from '../controllers/report.controller';
import { requireAuth, requirePasswordReady, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordReady);

router.get('/', getMyReports);
router.get('/recent', requireRole('admin', 'viewer', 'department_lead'), getReports);
router.get('/weekly/current', getWeeklyCurrent);
router.post('/weekly', postWeeklyReport);
router.post('/weekly/export-docx', exportWeeklyReport);
router.post('/:id/submit', submitWeekly);
router.post('/:id/export-docx', exportWeeklyReportById);

router.get('/monthly-staff/current', getMonthlyStaffCurrent);
router.post('/monthly-staff', postMonthlyStaffReport);
router.post('/:id/submit-monthly', submitMonthlyStaff);

export default router;
