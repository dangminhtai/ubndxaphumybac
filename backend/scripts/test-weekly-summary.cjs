const assert = require('node:assert/strict');
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

const { WEEKLY_GROUPS, buildWeeklyEntries, resolveWeeklyGroup, summaryEntriesSchema } = require('../dist/services/weekly-summary-groups');
const { weeklyLabel } = require('../dist/utils/weeklyLabel');
assert.equal(WEEKLY_GROUPS.length, 8);
assert.equal(weeklyLabel('2026-10-18T17:00:00Z').week, 43);
assert.equal(weeklyLabel('2027-01-01T00:00:00Z').year, 2026);
assert.equal(weeklyLabel('2027-01-01T00:00:00Z').week, 53);
assert.equal(weeklyLabel('2026-12-28T00:00:00Z', 1).year, 2027);
assert.equal(weeklyLabel('2026-12-28T00:00:00Z', 1).week, 1);
assert.equal(resolveWeeklyGroup('health'), 'health');
assert.equal(resolveWeeklyGroup('unknown / mixed fields'), null);
const entries = buildWeeklyEntries([{ _id: periodId, content: 'unused', fieldReports: [
  { fieldCode: 'LV4', content: '  Keep original 168 / 119  ', nextTasks: 'Next original' },
  { fieldCode: 'LV6', content: 'Admin', nextTasks: '' },
  { fieldCode: 'LV7', content: 'Digital', nextTasks: '' },
] }]);
assert.equal(entries[0].text, '  Keep original 168 / 119  ');
assert.equal(entries[2].groupId, 'administration');
assert.equal(entries[3].groupId, 'digital');
assert.equal(buildWeeklyEntries([{ _id: periodId, field: 'Y tế', content: 'Legacy source without code' }]).length, 0);
assert.equal(summaryEntriesSchema.safeParse(entries).success, true);
assert.equal(summaryEntriesSchema.safeParse([...entries, entries[0]]).success, false);
const documents = spawnSync(process.env.PYTHON_BIN || 'python', ['scripts/test_weekly_report_documents.py'], { stdio: 'inherit', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
assert.equal(documents.status, 0);
const routes = spawnSync(process.execPath, ['scripts/test-weekly-summary-routes.cjs'], { stdio: 'inherit', env: process.env });
assert.equal(routes.status, 0);
console.log('Weekly summary contract tests passed.');
