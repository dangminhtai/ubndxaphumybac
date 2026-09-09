import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/weekly-task.controller';

const router = Router();

router.use(requireAuth);

// Static paths first (before any parameterised routes)
router.get('/status', ctrl.getRegistrationStatus);
router.get('/weeks', ctrl.getAvailableWeeks);
router.get('/mine', ctrl.getMyTask);
router.get('/export', requireRole('admin', 'department_lead'), ctrl.exportExcel);
router.get('/', ctrl.listTasks);

router.post('/open-early', requireRole('admin'), ctrl.openEarly);
router.post('/close-early', requireRole('admin'), ctrl.closeEarly);
router.post('/', ctrl.upsertTask);

router.delete('/:id', ctrl.deleteTask);

export default router;
