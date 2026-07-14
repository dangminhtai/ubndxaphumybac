const assert = require('node:assert/strict');
const {
  getDocumentCatalogItem,
  getDocumentCatalogMeta,
  searchDocumentCatalog,
} = require('../dist/services/document-catalog.service');

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
assert.throws(
  () => getDocumentCatalogItem('CH.TH.99'),
  (error) => error.statusCode === 404,
);

console.log(JSON.stringify({
  passed: true,
  assertions: 12,
  topResults: {
    exactCode: exactCode.results[0].code,
    ambiguous: ambiguous.results.map((item) => item.code),
    withoutAccents: withoutAccents.results[0].code,
  },
}, null, 2));
