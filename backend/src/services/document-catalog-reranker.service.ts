import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { getDocumentCatalogItems, getDocumentCatalogPayload } from '../repositories/document-catalog.repository';
import type {
  DocumentCatalogItem,
  DocumentCatalogRankedCandidate,
  DocumentCatalogSuggestQuery,
  DocumentScope,
} from '../types/document-catalog';
import { normalizeSearchText } from '../utils/vietnamese-search';
import { searchDocumentCatalog } from './document-catalog.service';

export const GEMINI_RERANK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
] as const;

const MAX_CANDIDATES = 10;
const REQUEST_TIMEOUT_MS = 30_000;
const SCOPES: DocumentScope[] = ['internal', 'cross_agency', 'province_central', 'unknown'];

const rawRankedCandidateSchema = z.object({
  rank: z.number().int().min(1).max(3),
  code: z.string().min(1),
  priority: z.enum(['high', 'medium', 'low']),
  reason: z.string().min(5).max(500),
  applicableWhen: z.string().min(5).max(500),
});

const rawRerankResponseSchema = z.object({
  recommendedCode: z.string().min(1),
  needsMoreContext: z.boolean(),
  clarificationQuestion: z.string().max(300).nullable(),
  candidates: z.array(rawRankedCandidateSchema).length(3),
});

export type RawRerankResponse = z.infer<typeof rawRerankResponseSchema>;

export function inferOutputProduct(title: string) {
  const normalizedTitle = normalizeSearchText(title);
  if (/^(v\s+v|ve viec)\b/.test(normalizedTitle) || normalizedTitle.includes('cong van')) {
    return 'Công văn';
  }
  return undefined;
}

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message);
  Object.assign(error, { statusCode });
  return error;
}

function getGeminiErrorStatus(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { status?: number; code?: number };
    return candidate.status
      ?? (candidate.code && candidate.code >= 100 && candidate.code <= 599 ? candidate.code : undefined);
  }
  return undefined;
}

function getSafeGeminiErrorSummary(error: unknown) {
  const status = getGeminiErrorStatus(error);
  if (status) return `HTTP ${status}`;
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { name?: string };
    if (candidate.name) return candidate.name;
  }
  return 'unknown error';
}

function deduplicateItems(items: DocumentCatalogItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.code)) return false;
    seen.add(item.code);
    return true;
  });
}

export function buildRerankCandidatePool(query: DocumentCatalogSuggestQuery) {
  const catalogItems = getDocumentCatalogItems();
  const effectiveOutputProduct = query.outputProduct || inferOutputProduct(query.title);
  const normalizedProduct = effectiveOutputProduct
    ? normalizeSearchText(effectiveOutputProduct)
    : undefined;

  const productCandidates = normalizedProduct
    ? catalogItems.filter((item) => (
      normalizeSearchText(item.outputProduct) === normalizedProduct
      && (!query.group || item.group === query.group)
    ))
    : [];

  const lexicalCandidates = searchDocumentCatalog({
    query: query.title,
    group: query.group,
    limit: 20,
  }).results;

  const pool = deduplicateItems([
    ...productCandidates,
    ...lexicalCandidates,
    ...catalogItems.filter((item) => !query.group || item.group === query.group),
  ]).slice(0, MAX_CANDIDATES);

  if (pool.length < 3) {
    throw createHttpError('Không đủ ứng viên danh mục để tạo Top 3', 422);
  }
  return pool;
}

export function validateRerankResponse(raw: unknown, candidatePool: DocumentCatalogItem[]) {
  const parsed = rawRerankResponseSchema.parse(raw);
  const allowedCodes = new Set(candidatePool.map((item) => item.code));
  const codes = parsed.candidates.map((candidate) => candidate.code);
  const ranks = parsed.candidates.map((candidate) => candidate.rank);

  if (new Set(codes).size !== 3) throw new Error('Gemini trả mã ứng viên bị trùng');
  if (ranks.join(',') !== '1,2,3') throw new Error('Gemini trả thứ hạng không đúng 1,2,3');
  if (codes.some((code) => !allowedCodes.has(code))) {
    throw new Error('Gemini trả mã nằm ngoài tập ứng viên');
  }
  if (parsed.recommendedCode !== codes[0]) {
    throw new Error('Mã đề xuất không trùng với ứng viên hạng 1');
  }
  return parsed;
}

function buildResponseJsonSchema(candidateCodes: string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      recommendedCode: { type: 'string', enum: candidateCodes },
      needsMoreContext: { type: 'boolean' },
      clarificationQuestion: { type: ['string', 'null'] },
      candidates: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            rank: { type: 'integer', minimum: 1, maximum: 3 },
            code: { type: 'string', enum: candidateCodes },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            reason: { type: 'string' },
            applicableWhen: { type: 'string' },
          },
          required: ['rank', 'code', 'priority', 'reason', 'applicableWhen'],
        },
      },
    },
    required: ['recommendedCode', 'needsMoreContext', 'clarificationQuestion', 'candidates'],
  };
}

function buildPrompt(query: DocumentCatalogSuggestQuery, candidatePool: DocumentCatalogItem[]) {
  const inferredOutputProduct = query.outputProduct ? undefined : inferOutputProduct(query.title);
  const scopeLabels: Record<DocumentScope, string> = {
    internal: 'Trong nội bộ cơ quan/cấp xã',
    cross_agency: 'Phối hợp hoặc gửi nhiều cơ quan, đơn vị',
    province_central: 'Liên quan chỉ đạo/căn cứ của tỉnh hoặc Trung ương',
    unknown: 'Chưa xác định',
  };

  return JSON.stringify({
    task: 'Phân tích trích yếu văn bản hành chính và xếp hạng đúng 3 mã phù hợp nhất. Chỉ được chọn mã trong candidates.',
    decisionProcess: [
      'Xác định sản phẩm đầu ra và hành động chính của văn bản.',
      'Xác định phạm vi: nội bộ cơ quan, phối hợp đơn vị khác, hay triển khai chỉ đạo/văn bản của cấp trên.',
      'So sánh trực tiếp các ứng viên gần nghĩa và tìm điều kiện phân biệt trong taskName/description.',
      'Chọn hạng 1 theo dữ kiện có thật; không suy diễn căn cứ hoặc cấp ban hành không xuất hiện trong đầu vào.',
    ],
    rules: [
      'Ưu tiên bản chất, nguồn phát sinh và phạm vi công việc; không xếp hạng bằng đếm từ khóa.',
      'Các từ đôn đốc, triển khai, thực hiện hoặc năm công tác không tự chứng minh đây là chỉ đạo của cấp trên.',
      'CH.TH.43 phù hợp văn bản triển khai hoặc đôn đốc chuyên môn nghiệp vụ trong phạm vi cơ quan, đơn vị khi không có căn cứ cấp trên rõ ràng.',
      'CH.TH.48 chỉ phù hợp khi đầu vào nêu rõ việc cụ thể hóa văn bản quy phạm pháp luật hoặc ý kiến chỉ đạo của UBND tỉnh, bộ, ngành Trung ương.',
      'CH.TH.44 chỉ phù hợp khi mục đích chính là hướng dẫn nghiệp vụ, trao đổi hoặc trả lời ý kiến, kiến nghị, đơn thư.',
      'CH.TH.47 chỉ phù hợp khi mục đích chính là truyền tải hoặc triển khai văn bản quy phạm pháp luật.',
      'Không dùng classification, maxScoreFrame, score hay conversionFactor làm tín hiệu về độ phù hợp.',
      'Bộ lọc sản phẩm đầu ra chỉ xác định loại văn bản, không quyết định mã cụ thể.',
      'Hạng 1 phải là lựa chọn phù hợp nhất với dữ kiện hiện có.',
      'Nếu dữ kiện chưa đủ để phân biệt, đặt needsMoreContext=true và viết một câu hỏi ngắn.',
      'reason phải nêu dấu hiệu phân biệt từ đầu vào; applicableWhen nêu điều kiện dùng mã đó.',
      'reason và applicableWhen viết tiếng Việt, ngắn gọn, không thêm mã ngoài danh sách.',
    ],
    document: {
      title: query.title,
      outputProduct: query.outputProduct || inferredOutputProduct || 'Chưa xác định',
      outputProductSource: query.outputProduct
        ? 'Người dùng chọn'
        : inferredOutputProduct
          ? 'Suy ra từ cách viết trích yếu V/v hoặc Về việc'
          : 'Chưa xác định',
      group: query.group || 'Chưa xác định',
      scope: scopeLabels[query.scope || 'unknown'],
      legalBasis: query.legalBasis || 'Không cung cấp',
    },
    candidates: candidatePool.map((item) => ({
      code: item.code,
      taskName: item.taskName,
      outputProduct: item.outputProduct,
      groupName: item.groupName,
      description: item.description || 'Không có diễn giải riêng',
    })),
  });
}

export function getThinkingConfig(model: string) {
  if (model.startsWith('gemini-3.5-') || model.startsWith('gemini-3.1-')) {
    return { includeThoughts: false, thinkingLevel: ThinkingLevel.HIGH };
  }
  return { includeThoughts: false, thinkingBudget: 2048 };
}

function enrichCandidates(raw: RawRerankResponse, pool: DocumentCatalogItem[]) {
  const itemByCode = new Map(pool.map((item) => [item.code, item]));
  return raw.candidates.map((candidate) => ({
    ...itemByCode.get(candidate.code)!,
    rank: candidate.rank,
    priority: candidate.priority,
    reason: candidate.reason,
    applicableWhen: candidate.applicableWhen,
  })) as DocumentCatalogRankedCandidate[];
}

export async function suggestDocumentCatalog(query: DocumentCatalogSuggestQuery) {
  const title = query.title.trim();
  if (title.length < 5) throw createHttpError('Trích yếu cần có ít nhất 5 ký tự', 400);
  if (title.length > 500) throw createHttpError('Trích yếu không được vượt quá 500 ký tự', 400);
  if (query.legalBasis && query.legalBasis.length > 1000) {
    throw createHttpError('Căn cứ văn bản không được vượt quá 1000 ký tự', 400);
  }
  if (query.scope && !SCOPES.includes(query.scope)) {
    throw createHttpError('Phạm vi văn bản không hợp lệ', 400);
  }
  if (env.geminiApiKeys.length === 0) {
    throw createHttpError('Chức năng gợi ý AI chưa được cấu hình GEMINI_<số>_KEY', 503);
  }

  const candidatePool = buildRerankCandidatePool({ ...query, title });
  const candidateCodes = candidatePool.map((item) => item.code);
  const attemptedModels: string[] = [];
  let lastError: unknown;

  for (const model of GEMINI_RERANK_MODELS) {
    attemptedModels.push(model);
    let serviceUnavailableCount = 0;
    for (const [keyIndex, apiKey] of env.geminiApiKeys.entries()) {
      const ai = new GoogleGenAI({ apiKey });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await ai.models.generateContent({
          model,
          contents: buildPrompt(query, candidatePool),
          config: {
            abortSignal: controller.signal,
            systemInstruction: 'Bạn là chuyên viên văn thư am hiểu phân loại công việc hành chính cấp xã. Hãy suy luận kỹ theo phạm vi, nguồn chỉ đạo và mục đích văn bản trước khi xếp hạng. Không trò chuyện, không tạo mã mới và không coi điểm chấm nghiệp vụ là độ phù hợp.',
            temperature: 0,
            maxOutputTokens: 4096,
            thinkingConfig: getThinkingConfig(model),
            responseMimeType: 'application/json',
            responseJsonSchema: buildResponseJsonSchema(candidateCodes),
          },
        });

        if (!response.text) throw new Error('Gemini không trả nội dung');
        const validated = validateRerankResponse(JSON.parse(response.text), candidatePool);
        const payload = getDocumentCatalogPayload();
        return {
          query: title,
          searchMode: 'gemini_rerank' as const,
          model,
          attemptedModels,
          catalogVersion: payload.catalogVersion,
          candidatePoolSize: candidatePool.length,
          recommendedCode: validated.recommendedCode,
          needsMoreContext: validated.needsMoreContext,
          clarificationQuestion: validated.clarificationQuestion,
          candidates: enrichCandidates(validated, candidatePool),
        };
      } catch (error) {
        lastError = error;
        logger.warn(`Gemini catalog rerank failed with ${model}, key #${keyIndex + 1}: ${getSafeGeminiErrorSummary(error)}`);
        const status = getGeminiErrorStatus(error);
        if (status === 503) serviceUnavailableCount += 1;
        if (status === 404 || serviceUnavailableCount >= 2) break;
        if (controller.signal.aborted) break;
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  logger.error(`All Gemini catalog rerank attempts failed: ${getSafeGeminiErrorSummary(lastError)}`);
  throw createHttpError('Không thể tạo gợi ý AI từ các model đã cấu hình', 503);
}
