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

export type DocumentScope = 'internal' | 'cross_agency' | 'province_central' | 'unknown';
export type SuggestionPriority = 'high' | 'medium' | 'low';

export interface DocumentCatalogSuggestQuery {
  title: string;
  group?: string;
  outputProduct?: string;
  scope?: DocumentScope;
  legalBasis?: string;
}

export interface DocumentCatalogRankedCandidate extends DocumentCatalogItem {
  rank: number;
  priority: SuggestionPriority;
  reason: string;
  applicableWhen: string;
}
