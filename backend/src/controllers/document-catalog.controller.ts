import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  getDocumentCatalogItem,
  getDocumentCatalogMeta,
  searchDocumentCatalog,
} from '../services/document-catalog.service';

export function searchCatalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const group = typeof req.query.group === 'string' ? req.query.group : undefined;
    const outputProduct = typeof req.query.outputProduct === 'string'
      ? req.query.outputProduct
      : undefined;
    const parsedLimit = typeof req.query.limit === 'string'
      ? Number.parseInt(req.query.limit, 10)
      : undefined;

    res.json(searchDocumentCatalog({
      query,
      group,
      outputProduct,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    }));
  } catch (error) {
    next(error);
  }
}

export function getCatalogMeta(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    res.json(getDocumentCatalogMeta());
  } catch (error) {
    next(error);
  }
}

export function getCatalogItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    res.json(getDocumentCatalogItem(String(req.params.code)));
  } catch (error) {
    next(error);
  }
}
