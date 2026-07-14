import {
  getDocumentCatalogItems,
  getDocumentCatalogPayload,
} from '../repositories/document-catalog.repository';
import type {
  DocumentCatalogItem,
  DocumentCatalogSearchQuery,
  DocumentCatalogSearchResult,
} from '../types/document-catalog';
import {
  diceSimilarity,
  normalizeCatalogCode,
  normalizeSearchText,
  tokenizeSearchText,
} from '../utils/vietnamese-search';

type SearchField = 'code' | 'taskName' | 'outputProduct' | 'description' | 'groupName';

interface IndexedItem {
  item: DocumentCatalogItem;
  fields: Record<SearchField, string>;
  tokens: Record<SearchField, Set<string>>;
  allTokens: Set<string>;
}

const FIELD_WEIGHTS: Record<SearchField, number> = {
  code: 10,
  taskName: 6,
  outputProduct: 3,
  description: 2,
  groupName: 1,
};

const SEARCH_FIELDS = Object.keys(FIELD_WEIGHTS) as SearchField[];
const catalogItems = getDocumentCatalogItems();

const index: IndexedItem[] = catalogItems.map((item) => {
  const fields: Record<SearchField, string> = {
    code: normalizeSearchText(item.code),
    taskName: normalizeSearchText(item.taskName),
    outputProduct: normalizeSearchText(item.outputProduct),
    description: normalizeSearchText(item.description),
    groupName: normalizeSearchText(`${item.group} ${item.groupName}`),
  };
  const tokens = Object.fromEntries(
    SEARCH_FIELDS.map((field) => [field, new Set(tokenizeSearchText(fields[field]))]),
  ) as Record<SearchField, Set<string>>;
  return {
    item,
    fields,
    tokens,
    allTokens: new Set(SEARCH_FIELDS.flatMap((field) => [...tokens[field]])),
  };
});

const documentFrequency = new Map<string, number>();
for (const indexedItem of index) {
  for (const token of indexedItem.allTokens) {
    documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  }
}

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message);
  Object.assign(error, { statusCode });
  return error;
}

function inverseDocumentFrequency(token: string) {
  const frequency = documentFrequency.get(token) ?? 0;
  return Math.log((index.length + 1) / (frequency + 1)) + 1;
}

function tokenMatchScore(queryToken: string, fieldTokens: Set<string>) {
  if (fieldTokens.has(queryToken)) return 1;
  if (queryToken.length < 3) return 0;

  let best = 0;
  for (const fieldToken of fieldTokens) {
    if (fieldToken.startsWith(queryToken) || queryToken.startsWith(fieldToken)) {
      best = Math.max(best, 0.72);
      continue;
    }
    if (queryToken.length >= 4 && fieldToken.length >= 4) {
      const similarity = diceSimilarity(queryToken, fieldToken);
      if (similarity >= 0.62) best = Math.max(best, similarity * 0.65);
    }
  }
  return best;
}

function scoreItem(indexedItem: IndexedItem, normalizedQuery: string, queryTokens: string[]) {
  let relevanceScore = 0;
  const matchedFields = new Set<string>();

  for (const field of SEARCH_FIELDS) {
    const fieldValue = indexedItem.fields[field];
    if (normalizedQuery.length >= 3 && fieldValue.includes(normalizedQuery)) {
      relevanceScore += FIELD_WEIGHTS[field] * 3;
      matchedFields.add(field);
    }

    for (const queryToken of queryTokens) {
      const matchScore = tokenMatchScore(queryToken, indexedItem.tokens[field]);
      if (matchScore > 0) {
        relevanceScore += FIELD_WEIGHTS[field] * inverseDocumentFrequency(queryToken) * matchScore;
        matchedFields.add(field);
      }
    }
  }

  return { relevanceScore, matchedFields: [...matchedFields] };
}

export function searchDocumentCatalog(query: DocumentCatalogSearchQuery) {
  const rawQuery = query.query.trim();
  const exactCode = normalizeCatalogCode(rawQuery);
  if (!exactCode && rawQuery.length < 2) {
    throw createHttpError('Nội dung tra cứu phải có ít nhất 2 ký tự', 400);
  }
  if (rawQuery.length > 200) {
    throw createHttpError('Nội dung tra cứu không được vượt quá 200 ký tự', 400);
  }

  const normalizedQuery = normalizeSearchText(rawQuery);
  const queryTokens = tokenizeSearchText(rawQuery);
  const limit = Math.min(20, Math.max(1, query.limit ?? 10));
  const normalizedOutputProduct = query.outputProduct
    ? normalizeSearchText(query.outputProduct)
    : undefined;

  const results: DocumentCatalogSearchResult[] = [];
  for (const indexedItem of index) {
    if (exactCode && indexedItem.item.code !== exactCode) continue;
    if (query.group && indexedItem.item.group !== query.group) continue;
    if (
      normalizedOutputProduct
      && normalizeSearchText(indexedItem.item.outputProduct) !== normalizedOutputProduct
    ) {
      continue;
    }

    const scored = scoreItem(indexedItem, normalizedQuery, queryTokens);
    if (exactCode && indexedItem.item.code === exactCode) {
      scored.relevanceScore += 1000;
      if (!scored.matchedFields.includes('code')) scored.matchedFields.unshift('code');
    }
    if (scored.relevanceScore <= 0) continue;

    results.push({
      ...indexedItem.item,
      relevanceScore: Number(scored.relevanceScore.toFixed(4)),
      matchedFields: scored.matchedFields,
    });
  }

  results.sort((left, right) => {
    if (right.relevanceScore !== left.relevanceScore) {
      return right.relevanceScore - left.relevanceScore;
    }
    return left.code.localeCompare(right.code, 'vi');
  });

  const payload = getDocumentCatalogPayload();
  return {
    query: rawQuery,
    normalizedQuery,
    searchMode: 'lexical' as const,
    catalogVersion: payload.catalogVersion,
    total: results.length,
    results: results.slice(0, limit),
  };
}

export function getDocumentCatalogMeta() {
  const payload = getDocumentCatalogPayload();
  return {
    catalogVersion: payload.catalogVersion,
    sourceFile: payload.sourceFile,
    sourceSha256: payload.sourceSha256,
    total: payload.items.length,
    groups: [...new Map(payload.items.map((item) => [item.group, item.groupName])).entries()]
      .map(([value, label]) => ({ value, label })),
    outputProducts: [...new Set(payload.items.map((item) => item.outputProduct))]
      .sort((left, right) => left.localeCompare(right, 'vi')),
  };
}

export function getDocumentCatalogItem(code: string) {
  const normalizedCode = normalizeCatalogCode(code);
  const item = normalizedCode
    ? catalogItems.find((catalogItem) => catalogItem.code === normalizedCode)
    : undefined;
  if (!item) throw createHttpError('Không tìm thấy mã danh mục', 404);
  return item;
}
