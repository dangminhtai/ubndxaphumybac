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

export interface DocumentCatalogSearchResult extends DocumentCatalogItem {
  relevanceScore: number;
  matchedFields: string[];
}

export interface DocumentCatalogSearchResponse {
  query: string;
  normalizedQuery: string;
  searchMode: 'lexical';
  catalogVersion: string;
  total: number;
  results: DocumentCatalogSearchResult[];
}

export interface DocumentCatalogMeta {
  catalogVersion: string;
  sourceFile: string;
  sourceSha256: string;
  total: number;
  groups: Array<{ value: string; label: string }>;
  outputProducts: string[];
}

export interface DocumentCatalogSearchParams {
  query: string;
  group?: string;
  outputProduct?: string;
  limit?: number;
}
