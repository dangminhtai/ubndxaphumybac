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
  postReturnReport,
  postRecallReport
} from '../controllers/report.controller';
import { requireAuth, requirePasswordReady, requireRole, type AuthenticatedRequest } from '../middleware/auth.middleware';
import { getReportMapping, updateReportMapping } from '../services/report-field-mapping.service';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordReady);

router.get('/', getMyReports);
router.get('/recent', requireRole('admin', 'viewer', 'department_lead'), getReports);
router.get('/weekly/current', getWeeklyCurrent);
router.get('/:id/field-mapping', requireRole('admin'), async (req, res, next) => { try { res.json(await getReportMapping(String(req.params.id))); } catch (error) { next(error); } });
router.patch('/:id/field-mapping', requireRole('admin'), async (req: AuthenticatedRequest, res, next) => { try { res.json(await updateReportMapping(String(req.params.id), req.body.fieldCodes, req.user!, req.body.revision)); } catch (error) { next(error); } });
router.post('/weekly', postWeeklyReport);
router.post('/weekly/export-docx', exportWeeklyReport);
router.post('/:id/submit', submitWeekly);
router.post('/:id/export-docx', exportWeeklyReportById);

router.get('/monthly-staff/current', getMonthlyStaffCurrent);
router.post('/monthly-staff', postMonthlyStaffReport);
router.post('/:id/submit-monthly', submitMonthlyStaff);
router.post('/:id/return', requireRole('admin'), postReturnReport);
router.post('/:id/recall', postRecallReport);

export default router;
