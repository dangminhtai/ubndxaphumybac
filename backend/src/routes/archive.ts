import { Router } from 'express';
import { getArchive } from '../controllers/archive.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/reports', getArchive);

export default router;
