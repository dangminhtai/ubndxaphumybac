import { Router } from 'express';
import {
  exportSummary,
  generateSummary,
  getSummary,
  updateSummary,
} from '../controllers/weekly-summary.controller';
import { requireAuth, requirePasswordReady, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordReady);
router.use(requireRole('admin'));

router.get('/:periodId', getSummary);
router.post('/:periodId/generate', generateSummary);
router.patch('/:periodId', updateSummary);
router.post('/:periodId/export-docx', exportSummary);

export default router;
