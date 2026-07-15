const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const mongoose = require('mongoose');
const {
  buildWeeklySourceFilter,
  deduplicateWeeklyReports,
} = require('../dist/services/weekly-summary.service.js');
const { getWeeklyPeriodWindow, parsePeriodDueDate } = require('../dist/services/period.service.js');

const periodId = new mongoose.Types.ObjectId();
const filter = buildWeeklySourceFilter(periodId);
assert.equal(filter.periodId, periodId);
assert.equal(filter.reportType, 'weekly');
assert.deepEqual(filter.status.$in, ['pending', 'approved']);
assert.equal(Object.hasOwn(filter, 'year'), false);
assert.equal(Object.hasOwn(filter, 'month'), false);

const sundayNightUtc = new Date('2026-07-12T17:30:00.000Z');
const window = getWeeklyPeriodWindow(sundayNightUtc);
assert.equal(window.startDate.toISOString(), '2026-07-13T00:00:00.000Z');
assert.equal(window.dueDate.toISOString(), '2026-07-16T16:59:59.999Z');
assert.equal(parsePeriodDueDate('2026-07-16').toISOString(), '2026-07-16T16:59:59.999Z');

const ownerA = new mongoose.Types.ObjectId();
const ownerB = new mongoose.Types.ObjectId();
const report = (id, ownerId, status, submittedAt) => ({
  _id: new mongoose.Types.ObjectId(id),
  ownerId: { _id: ownerId, fullName: 'Nhan vien', department: 'Phong', isActive: true },
  status,
  sender: 'Nhan vien',
  department: 'Phong',
  content: 'Noi dung',
  submittedAt: new Date(submittedAt),
});

const result = deduplicateWeeklyReports([
  report('64b000000000000000000001', ownerA, 'pending', '2026-07-16T08:00:00Z'),
  report('64b000000000000000000002', ownerA, 'approved', '2026-07-15T08:00:00Z'),
  report('64b000000000000000000003', ownerB, 'pending', '2026-07-15T09:00:00Z'),
]);

assert.equal(result.duplicateReports, 1);
assert.equal(result.reports.length, 2);
assert.equal(result.reports.find((item) => item.ownerId._id.equals(ownerA)).status, 'approved');

const outputPath = path.join(os.tmpdir(), `weekly-summary-test-${process.pid}.docx`);
const generator = spawnSync('python', [
  path.resolve('src/scripts/generate_weekly_summary_docx.py'),
  path.resolve('src/templates/weekly_template.docx'),
  outputPath,
], {
  input: JSON.stringify({
    period: 'Tuần 03 tháng 7 năm 2026',
    reportTitle: 'BÁO CÁO CÔNG TÁC TUẦN 03 THÁNG 7 NĂM 2026',
    department: 'PHÒNG VĂN HÓA - XÃ HỘI',
    startDate: '2026-07-13T00:00:00.000Z',
    dueDate: '2026-07-16T16:59:59.999Z',
    content: '- Kết quả kiểm thử',
    difficulties: 'Không',
    proposals: 'Không',
    nextTasks: '- Nhiệm vụ tuần sau',
  }),
  encoding: 'utf8',
});
assert.equal(generator.status, 0, generator.stderr);
const docxHeader = fs.readFileSync(outputPath).subarray(0, 2).toString('ascii');
assert.equal(docxHeader, 'PK');
const inspectDocx = spawnSync('python', ['-c', [
  'import sys, zipfile',
  'with zipfile.ZipFile(sys.argv[1]) as z:',
  ' print(z.read("word/document.xml").decode("utf-8"))',
].join('\n'), outputPath], {
  encoding: 'utf8',
  env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
});
assert.equal(inspectDocx.status, 0, inspectDocx.stderr);
assert.match(inspectDocx.stdout, /BÁO CÁO CÔNG TÁC TUẦN 03 THÁNG 7 NĂM 2026/);
assert.match(inspectDocx.stdout, /Từ ngày 13\/07\/2026 đến ngày 16\/07\/2026/);
fs.unlinkSync(outputPath);
console.log('Weekly summary contract tests passed.');
