import { Router } from 'express';
import { login, logout, me, postChangePassword, postSkipPasswordChange } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);
router.post('/change-password', requireAuth, postChangePassword);
router.post('/skip-password-change', requireAuth, postSkipPasswordChange);

export default router;
