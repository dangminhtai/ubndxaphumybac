import { Router } from 'express';
import { getArchive, getArchiveById } from '../controllers/archive.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/reports', getArchive);
router.get('/reports/:type/:id', getArchiveById);

export default router;
