const assert = require('node:assert/strict');
const { readNumberedGeminiApiKeys } = require('../dist/config/env');
const {
  getDocumentCatalogItem,
  getDocumentCatalogMeta,
  searchDocumentCatalog,
} = require('../dist/services/document-catalog.service');
const {
  GEMINI_RERANK_MODELS,
  buildRerankCandidatePool,
  getThinkingConfig,
  inferOutputProduct,
  validateRerankResponse,
} = require('../dist/services/document-catalog-reranker.service');

const meta = getDocumentCatalogMeta();
assert.equal(meta.total, 80);
assert.equal(meta.catalogVersion, '2026-05');

const exactCode = searchDocumentCatalog({ query: 'CHTH44', limit: 10 });
assert.equal(exactCode.total, 1);
assert.equal(exactCode.results[0].code, 'CH.TH.44');

const ambiguous = searchDocumentCatalog({ query: 'văn bản góp ý', limit: 3 });
assert.equal(ambiguous.results[0].code, 'CH.PC.04');
assert.ok(ambiguous.results.some((item) => item.code === 'CH.TH.44'));

const withoutAccents = searchDocumentCatalog({ query: 'tieu huy tai lieu het han', limit: 3 });
assert.equal(withoutAccents.results[0].code, 'CH.VT.06');

const filtered = searchDocumentCatalog({
  query: 'báo cáo',
  group: 'CH.TH',
  outputProduct: 'Báo cáo',
  limit: 20,
});
assert.ok(filtered.results.length > 0);
assert.ok(filtered.results.every((item) => item.group === 'CH.TH' && item.outputProduct === 'Báo cáo'));

assert.equal(getDocumentCatalogItem('ch.tc.03').code, 'CH.TC.03');
assert.throws(
  () => searchDocumentCatalog({ query: 'a' }),
  (error) => error.statusCode === 400,
);

assert.deepEqual(GEMINI_RERANK_MODELS, [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
]);
assert.deepEqual(getThinkingConfig('gemini-3.5-flash'), {
  includeThoughts: false,
  thinkingLevel: 'HIGH',
});
assert.deepEqual(getThinkingConfig('gemini-2.5-flash'), {
  includeThoughts: false,
  thinkingBudget: 2048,
});
assert.equal(inferOutputProduct('V/v đôn đốc thực hiện nhiệm vụ'), 'Công văn');
assert.equal(inferOutputProduct('Về việc triển khai nhiệm vụ'), 'Công văn');
assert.equal(inferOutputProduct('Báo cáo kết quả tháng 7'), undefined);
assert.deepEqual(readNumberedGeminiApiKeys({
  GEMINI_10_KEY: ' key-ten ',
  GEMINI_2_KEY: 'key-two',
  GEMINI_1_KEY: 'key-one',
  GEMINI_3_KEY: '',
  GEMINI_API_KEY: 'legacy-key-must-be-ignored',
  GEMINI_4_KEY: 'key-two',
}), ['key-one', 'key-two', 'key-ten']);

const rerankPool = buildRerankCandidatePool({
  title: 'V/v đôn đốc thực hiện nhiệm vụ cải cách hành chính, Chuyển đổi số và xã hạt nhân năm 2026',
  outputProduct: 'Công văn',
  scope: 'internal',
});
const poolCodes = rerankPool.map((item) => item.code);
assert.ok(rerankPool.length >= 6 && rerankPool.length <= 10);
for (const code of ['CH.TH.43', 'CH.TH.44', 'CH.TH.45', 'CH.TH.46', 'CH.TH.47', 'CH.TH.48']) {
  assert.ok(poolCodes.includes(code), `Candidate pool is missing ${code}`);
}

const inferredProductPool = buildRerankCandidatePool({
  title: 'V/v đôn đốc thực hiện nhiệm vụ cải cách hành chính, Chuyển đổi số và xã hạt nhân năm 2026',
  scope: 'unknown',
});
for (const code of ['CH.TH.43', 'CH.TH.44', 'CH.TH.45', 'CH.TH.46', 'CH.TH.47', 'CH.TH.48']) {
  assert.ok(inferredProductPool.some((item) => item.code === code), `Inferred product pool is missing ${code}`);
}

const validRerank = {
  recommendedCode: 'CH.TH.43',
  needsMoreContext: false,
  clarificationQuestion: null,
  candidates: [
    { rank: 1, code: 'CH.TH.43', priority: 'high', reason: 'Phù hợp công văn triển khai nhiệm vụ nội bộ.', applicableWhen: 'Dùng khi tổ chức thực hiện nhiệm vụ trong cơ quan.' },
    { rank: 2, code: 'CH.TH.48', priority: 'medium', reason: 'Phù hợp khi có văn bản cấp trên làm căn cứ.', applicableWhen: 'Dùng khi triển khai chỉ đạo của cấp trên.' },
    { rank: 3, code: 'CH.TH.44', priority: 'low', reason: 'Phù hợp nếu nội dung thiên về hướng dẫn nghiệp vụ.', applicableWhen: 'Dùng khi trao đổi hoặc hướng dẫn chuyên môn.' },
  ],
};
assert.equal(validateRerankResponse(validRerank, rerankPool).recommendedCode, 'CH.TH.43');
assert.throws(() => validateRerankResponse({
  ...validRerank,
  candidates: validRerank.candidates.map((item, index) => (
    index === 2 ? { ...item, code: 'CH.FAKE.01' } : item
  )),
}, rerankPool));
assert.throws(() => validateRerankResponse({
  ...validRerank,
  candidates: validRerank.candidates.map((item, index) => (
    index === 2 ? { ...item, code: 'CH.TH.43' } : item
  )),
}, rerankPool));
assert.throws(
  () => getDocumentCatalogItem('CH.TH.99'),
  (error) => error.statusCode === 404,
);

console.log(JSON.stringify({
  passed: true,
  assertions: 36,
  topResults: {
    exactCode: exactCode.results[0].code,
    ambiguous: ambiguous.results.map((item) => item.code),
    withoutAccents: withoutAccents.results[0].code,
  },
}, null, 2));
