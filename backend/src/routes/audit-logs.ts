import { Router } from 'express';
import { getLogs } from '../controllers/audit.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.use(requireRole('admin', 'viewer'));

router.get('/', getLogs);

export default router;
