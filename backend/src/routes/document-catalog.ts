import { Router } from 'express';
import {
  getCatalogItem,
  getCatalogMeta,
  searchCatalog,
  suggestCatalog,
} from '../controllers/document-catalog.controller';
import { requireAuth, requirePasswordReady } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth, requirePasswordReady);
router.get('/search', searchCatalog);
router.get('/meta', getCatalogMeta);
router.post('/suggest', suggestCatalog);
router.get('/:code', getCatalogItem);

export default router;
