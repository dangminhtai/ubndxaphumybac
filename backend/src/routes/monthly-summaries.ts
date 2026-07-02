import { Router } from 'express';
import {
  getSummary,
  generateSummary,
  updateSummary,
  exportSummary,
} from '../controllers/monthly-summary.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/:periodId', requireRole('admin'), getSummary);
router.post('/:periodId/generate', requireRole('admin'), generateSummary);
router.patch('/:periodId', requireRole('admin'), updateSummary);
router.post('/:periodId/export-docx', requireRole('admin'), exportSummary);

export default router;
