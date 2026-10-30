// Dry-run by default. --apply creates a local private backup, then updates only
// the confirmed accounts, unambiguous weekly reports and open-period snapshots.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { env } = require('../dist/config/env');
const { FIELDS } = require('../dist/domain/fields');
const { resolveWeeklyGroup } = require('../dist/services/weekly-summary-groups');
const { withAssignmentLock } = require('../dist/services/field-assignment.service');
const { getWeeklyPeriodWindow } = require('../dist/services/period.service');
const desired = [
  ['linh', 'Đặng Vũ Linh', ['LV1', 'LV6']],
  ['Hạnh', 'Phan Thị Hạnh', ['LV2']], ['Ngọc Linh', 'Đặng Ngọc Linh', ['LV3']],
  ['Phát', 'Nguyễn Tấn Phát', ['LV4']], ['Bích Liễu', 'Trần Thị Bích Liễu', ['LV5']],
  ['Hữu', 'Đặng Minh Hữu', ['LV7']], ['Hòa', 'Thái Văn Hòa', ['LV8']],
  ['Trọng', 'Võ Ngọc Trọng', []],
];
async function main() {
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000, autoIndex: false });
  try {
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).toArray();
    const targets = desired.map(([username, fullName, fieldCodes]) => {
      const user = users.find((row) => row.username === username);
      assert.ok(user && user.fullName === fullName, `Account identity mismatch: ${username}`);
      assert.equal(user.isActive, true, `Account inactive: ${username}`);
      return { before: user, after: { role: username === 'Trọng' ? 'admin' : 'staff', fieldCodes, ...(username === 'Trọng' ? { position: 'Phó phòng' } : {}) } };
    });
    assert.ok(users.some((user) => user.username === 'admin' && user.role === 'admin'), 'Existing admin missing');
    const unexpected = users.filter((user) => user.role === 'staff' && user.isActive && !targets.some((target) => target.before._id.equals(user._id)));
    assert.equal(unexpected.length, 0, 'Unexpected active staff: review assignment manually');
    const reports = await db.collection('reports').find({ reportType: 'weekly', fieldReports: { $exists: false } }).toArray();
    const convertible = [], unresolved = [];
    for (const report of reports) {
      const groupId = resolveWeeklyGroup(report.field || '');
      const field = FIELDS.find((row) => row.groupId === groupId);
      // Extra sections need explicit human mapping; do not discard or guess them.
      if (!field || report.administrativeReform?.trim() || report.digitalTransformation?.trim()) {
        unresolved.push({ id: String(report._id), field: report.field || '', reason: field ? 'EXTRA_SECTIONS' : 'AMBIGUOUS_FIELD' });
        continue;
      }
      convertible.push({ before: report, fields: [{ fieldCode: field.code, fieldName: field.title,
        content: report.content || '', difficulties: report.difficulties || '', proposals: report.proposals || '', nextTasks: report.nextTasks || '' }] });
    }
    // Old periods may still have status=open. Do not rewrite historical rosters.
    const currentStart = getWeeklyPeriodWindow(new Date()).startDate;
    const periods = await db.collection('reportperiods').find({ type: 'weekly', status: 'open', startDate: currentStart }).toArray();
    console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', accounts: targets.map(({ before, after }) => ({ id: String(before._id), username: before.username, before: { role: before.role, fieldCodes: before.fieldCodes || [] }, after })), reportsToMap: convertible.length, unresolvedReports: unresolved, openPeriodsToReconcile: periods.length }, null, 2));
    if (!process.argv.includes('--apply')) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folder = path.join(os.homedir(), '.codex', 'backups', 'main-web-fields');
    fs.mkdirSync(folder, { recursive: true });
    const backup = path.join(folder, `${stamp}.json`);
    fs.writeFileSync(backup, JSON.stringify({ database: db.databaseName, createdAt: new Date().toISOString(), users: targets.map((target) => target.before), reports: convertible.map((row) => row.before), periods }, null, 2), { mode: 0o600, flag: 'wx' });
    await withAssignmentLock(async (session) => {
      for (const target of targets) {
        const { before, after } = target;
        const current = await db.collection('users').findOne({ _id: before._id }, { session });
        assert.equal(JSON.stringify(current), JSON.stringify(before), `Account changed since dry-run: ${before.username}`);
        await db.collection('users').updateOne({ _id: before._id }, { $set: { ...after, updatedAt: new Date() } }, { session });
        await db.collection('auditlogs').insertOne({ action: 'FIELD_MAPPING_MIGRATION', category: 'user', targetType: 'User', targetId: String(before._id), details: JSON.stringify({ before: { role: before.role, fieldCodes: before.fieldCodes || [] }, after }), createdAt: new Date(), updatedAt: new Date() }, { session });
      }
      for (const report of convertible) {
        const current = await db.collection('reports').findOne({ _id: report.before._id }, { session });
        assert.equal(JSON.stringify(current), JSON.stringify(report.before), 'Report changed during migration');
        await db.collection('reports').updateOne({ _id: report.before._id }, { $set: { fieldReports: report.fields } }, { session });
      }
      const staffIds = targets.filter((target) => target.after.role === 'staff').map((target) => target.before._id);
      for (const period of periods) {
        const current = await db.collection('reportperiods').findOne({ _id: period._id }, { session });
        assert.equal(JSON.stringify(current), JSON.stringify(period), 'Open period changed during migration');
        await db.collection('reportperiods').updateOne({ _id: period._id }, { $set: { expectedReporterIds: staffIds } }, { session });
        await db.collection('auditlogs').insertOne({ action: 'FIELD_MAPPING_PERIOD_RECONCILE', category: 'period', targetType: 'ReportPeriod', targetId: String(period._id), details: JSON.stringify({ before: period.expectedReporterIds || [], after: staffIds }), createdAt: new Date(), updatedAt: new Date() }, { session });
      }
    });
    for (const target of targets) {
      const current = await db.collection('users').findOne({ _id: target.before._id });
      assert.equal(current.passwordHash, target.before.passwordHash, 'Password changed unexpectedly');
      assert.deepEqual(current.fieldCodes, target.after.fieldCodes);
      assert.equal(current.role, target.after.role);
    }
    assert.equal(await db.collection('users').countDocuments({ role: 'admin', isActive: true }), 2);
    console.log(JSON.stringify({ applied: true, verifiedByReadback: true, passwordsUnchanged: true, backup, mappedReports: convertible.length, unresolvedReports: unresolved.length }, null, 2));
  } finally { await mongoose.disconnect(); }
}
main().catch((error) => { console.error(error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted]')); process.exitCode = 1; });
