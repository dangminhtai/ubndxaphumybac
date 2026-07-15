import { Router } from 'express';
import { disableUser, getUsers, patchUser, postUser, resetPassword, deleteUser } from '../controllers/auth.controller';
import { requireAuth, requirePasswordReady, requireRole } from '../middleware/auth.middleware';
import { getSystemDiagnostics } from '../controllers/system.controller';

const router = Router();

router.use(requireAuth, requirePasswordReady, requireRole('admin'));

router.get('/users', getUsers);
router.get('/diagnostics', getSystemDiagnostics);
router.post('/users', postUser);
router.patch('/users/:id', patchUser);
router.patch('/users/:id/disable', disableUser);
router.post('/users/:id/reset-password', resetPassword);
router.delete('/users/:id', deleteUser);

export default router;
