import { Router } from 'express';
import {
  archivePeriod,
  getCurrentPeriod,
  getPeriods,
  lockPeriod,
  openPeriod,
  patchPeriodDueDate,
  deletePeriodController,
  postCreatePeriodManually,
  postForceGeneratePeriod
} from '../controllers/period.controller';
import { requireAuth, requirePasswordReady, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordReady);

router.get('/', getPeriods);
router.get('/current', getCurrentPeriod);
router.patch('/:id/due-date', requireRole('admin'), patchPeriodDueDate);
router.patch('/:id/open', requireRole('admin'), openPeriod);
router.patch('/:id/lock', requireRole('admin'), lockPeriod);
router.patch('/:id/archive', requireRole('admin'), archivePeriod);
router.delete('/:id', requireRole('admin'), deletePeriodController);
router.post('/manual', requireRole('admin'), postCreatePeriodManually);
router.post('/auto-generate', requireRole('admin'), postForceGeneratePeriod);

export default router;
