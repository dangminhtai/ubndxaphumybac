export interface DocumentCatalogItem {
  order: number;
  code: string;
  group: string;
  groupName: string;
  taskName: string;
  outputProduct: string;
  classification: number | null;
  maxScoreFrame: number | null;
  score: number | null;
  conversionFactor: number | null;
  description: string;
  sourcePage: number;
}

export interface DocumentCatalogPayload {
  schemaVersion: number;
  catalogVersion: string;
  sourceFile: string;
  sourceSha256: string;
  items: DocumentCatalogItem[];
}

export interface DocumentCatalogSearchResult extends DocumentCatalogItem {
  relevanceScore: number;
  matchedFields: string[];
}

export interface DocumentCatalogSearchQuery {
  query: string;
  group?: string;
  outputProduct?: string;
  limit?: number;
}
