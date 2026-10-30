import { Router } from 'express';
import { requireAuth, requirePasswordReady, requireRole, type AuthenticatedRequest } from '../middleware/auth.middleware';
import { assignMyFields, assignStaffBatch, getFieldDirectory } from '../services/field-assignment.service';
import Report from '../models/Report';
import ReportPeriod from '../models/ReportPeriod';
const router = Router();
router.use(requireAuth, requirePasswordReady);
router.get('/', async (_req, res, next) => { try { res.json(await getFieldDirectory()); } catch (error) { next(error); } });
router.get('/review', requireRole('admin'), async (_req, res, next) => {
  try {
    const periods = await ReportPeriod.find({}).select('_id status');
    const allIds = periods.map((period) => period._id);
    const liveIds = periods.filter((period) => period.status !== 'archived').map((period) => period._id);
    const filter = { reportType: 'weekly', $and: [
      { $or: [{ fieldReports: { $exists: false } }, { fieldReports: { $size: 0 } }] },
      { $or: [{ periodId: { $in: liveIds } }, { periodId: { $nin: allIds } }] },
    ] };
    const [items, total] = await Promise.all([Report.find(filter).select('_id title sender field status periodId').sort({ _id: -1 }).limit(100).lean(), Report.countDocuments(filter)]);
    const knownPeriods = new Set(allIds.map(String));
    res.json({ items: items.map((item) => ({ ...item, periodMissing: !item.periodId || !knownPeriods.has(String(item.periodId)) })), total });
  } catch (error) { next(error); }
});
router.patch('/mine', requireRole('staff'), async (req: AuthenticatedRequest, res, next) => { try { res.json(await assignMyFields(req.user!, req.body.fieldCodes)); } catch (error) { next(error); } });
router.patch('/assignments', requireRole('admin'), async (req: AuthenticatedRequest, res, next) => { try { res.json(await assignStaffBatch(req.user!, req.body.assignments)); } catch (error) { next(error); } });
export default router;
