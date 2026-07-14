import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');
const dataDir = path.join(projectDir, 'data', 'document-catalog');
const pdfPath = path.join(projectDir, '1. Danh muc chung .pdf');
const catalogPath = path.join(dataDir, 'danh-muc-chung.json');
const manifestPath = path.join(dataDir, 'manifest.json');

const EXPECTED_GROUP_COUNTS = {
  'CH.VT': 6,
  'CH.TH': 53,
  'CH.TC': 7,
  'CH.PC': 6,
  'CH.CC': 3,
  'CH.KH': 5,
};

const codePattern = /^CH\.(VT|TH|TC|PC|CC|KH)\.\d{2}$/;

function fail(message) {
  throw new Error(`Danh mục không hợp lệ: ${message}`);
}

const [pdfBuffer, catalogRaw, manifestRaw] = await Promise.all([
  readFile(pdfPath),
  readFile(catalogPath, 'utf8'),
  readFile(manifestPath, 'utf8'),
]);

const catalog = JSON.parse(catalogRaw);
const manifest = JSON.parse(manifestRaw);
const sourceSha256 = createHash('sha256').update(pdfBuffer).digest('hex');

if (!Array.isArray(catalog.items) || catalog.items.length !== 80) {
  fail(`cần đúng 80 mục, hiện có ${catalog.items?.length ?? 0}`);
}

if (catalog.sourceSha256 !== sourceSha256 || manifest.sourceSha256 !== sourceSha256) {
  fail('PDF nguồn đã thay đổi nhưng dữ liệu chưa được sinh lại');
}

const codes = new Set();
const groupCounts = {};
for (const item of catalog.items) {
  if (!codePattern.test(item.code)) fail(`mã sai định dạng: ${item.code}`);
  if (codes.has(item.code)) fail(`mã bị trùng: ${item.code}`);
  if (!item.taskName?.trim()) fail(`thiếu tên nhiệm vụ: ${item.code}`);
  if (!item.outputProduct?.trim()) fail(`thiếu sản phẩm đầu ra: ${item.code}`);
  codes.add(item.code);
  groupCounts[item.group] = (groupCounts[item.group] ?? 0) + 1;
}

for (const [group, expected] of Object.entries(EXPECTED_GROUP_COUNTS)) {
  if (groupCounts[group] !== expected) {
    fail(`nhóm ${group} cần ${expected} mục, hiện có ${groupCounts[group] ?? 0}`);
  }
}

console.log(JSON.stringify({
  valid: true,
  total: catalog.items.length,
  uniqueCodes: codes.size,
  groupCounts,
  sourceSha256,
}, null, 2));
