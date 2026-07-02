import { Router } from 'express';
import { getOverview, getProgress } from '../controllers/dashboard.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.use(requireRole('admin', 'department_lead'));

router.get('/overview', getOverview);
router.get('/submission-progress', getProgress);

export default router;
