import { Router } from 'express';
import { getNotifications, readAllNotifications, readNotification } from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.patch('/read-all', readAllNotifications);
router.patch('/:id/read', readNotification);

export default router;
