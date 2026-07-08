import { Router } from 'express';
import {
  getWorkSchedule,
  getWorkScheduleStatistics,
  getWorkSchedules,
  patchWorkSchedule,
  patchWorkScheduleStatus,
  postWorkSchedule,
  removeWorkSchedule,
  postUploadFile,
  getAttachmentSignedUrl,
  removeAttachment,
} from '../controllers/work-schedule.controller';
import { requireAuth, requirePasswordReady } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordReady);

router.get('/', getWorkSchedules);
router.get('/stats', getWorkScheduleStatistics);
router.get('/:id', getWorkSchedule);
router.post('/', postWorkSchedule);
router.patch('/:id', patchWorkSchedule);
router.patch('/:id/status', patchWorkScheduleStatus);
router.delete('/:id', removeWorkSchedule);

router.post('/upload', upload.single('file'), postUploadFile);
router.get('/:id/attachment', getAttachmentSignedUrl);
router.delete('/:id/attachment', removeAttachment);

export default router;
