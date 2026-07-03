import { Router } from 'express';
import { archivePeriod, getCurrentPeriod, getPeriods, lockPeriod, openPeriod, postPeriod } from '../controllers/period.controller';
import { requireAuth, requirePasswordReady, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordReady);

router.get('/', getPeriods);
router.get('/current', getCurrentPeriod);
router.post('/', requireRole('admin'), postPeriod);
router.patch('/:id/open', requireRole('admin'), openPeriod);
router.patch('/:id/lock', requireRole('admin'), lockPeriod);
router.patch('/:id/archive', requireRole('admin'), archivePeriod);

export default router;
