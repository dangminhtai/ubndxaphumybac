import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  getDocumentCatalogItem,
  getDocumentCatalogMeta,
  searchDocumentCatalog,
} from '../services/document-catalog.service';
import { suggestDocumentCatalog } from '../services/document-catalog-reranker.service';
import type { DocumentScope } from '../types/document-catalog';

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

export async function suggestCatalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await suggestDocumentCatalog({
      title: typeof req.body.title === 'string' ? req.body.title : '',
      group: typeof req.body.group === 'string' ? req.body.group : undefined,
      outputProduct: typeof req.body.outputProduct === 'string' ? req.body.outputProduct : undefined,
      scope: typeof req.body.scope === 'string' ? req.body.scope as DocumentScope : undefined,
      legalBasis: typeof req.body.legalBasis === 'string' ? req.body.legalBasis : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}
