import { Router } from 'express';
import {
  getCatalogItem,
  getCatalogMeta,
  searchCatalog,
} from '../controllers/document-catalog.controller';
import { requireAuth, requirePasswordReady } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth, requirePasswordReady);
router.get('/search', searchCatalog);
router.get('/meta', getCatalogMeta);
router.get('/:code', getCatalogItem);

export default router;
