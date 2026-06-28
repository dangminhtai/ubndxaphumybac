import { Router } from 'express';
import { getReports, seedReports } from '../controllers/report.controller';

const router = Router();

router.get('/', getReports);
router.post('/seed', seedReports);

export default router;
