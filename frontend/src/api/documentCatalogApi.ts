import { apiClient } from './client';
import type {
  DocumentCatalogItem,
  DocumentCatalogMeta,
  DocumentCatalogSearchParams,
  DocumentCatalogSearchResponse,
  DocumentCatalogSuggestParams,
  DocumentCatalogSuggestResponse,
} from '../types/documentCatalog';

export async function searchDocumentCatalog(params: DocumentCatalogSearchParams) {
  const response = await apiClient.get<DocumentCatalogSearchResponse>('/document-catalog/search', {
    params: {
      q: params.query,
      group: params.group || undefined,
      outputProduct: params.outputProduct || undefined,
      limit: params.limit ?? 20,
    },
  });
  return response.data;
}

export async function suggestDocumentCatalog(params: DocumentCatalogSuggestParams) {
  const response = await apiClient.post<DocumentCatalogSuggestResponse>('/document-catalog/suggest', params);
  return response.data;
}

export async function getDocumentCatalogMeta() {
  const response = await apiClient.get<DocumentCatalogMeta>('/document-catalog/meta');
  return response.data;
}

export async function getDocumentCatalogItem(code: string) {
  const response = await apiClient.get<DocumentCatalogItem>(`/document-catalog/${encodeURIComponent(code)}`);
  return response.data;
}
