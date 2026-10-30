// Real MongoDB test in a uniquely named QA database, never application data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const { env } = require('../dist/config/env');
const { FIELDS } = require('../dist/domain/fields');
const { getWeeklyPeriodWindow } = require('../dist/services/period.service');
const { generateWeeklySummary, getWeeklySummaryByPeriod } = require('../dist/services/weekly-summary.service');
const { seedDemo, resetDemo, same, encode, decode, MARKER } = require('./weekly-demo-core.cjs');
const User = require('../dist/models/User').default;
const Report = require('../dist/models/Report').default;
const Period = require('../dist/models/ReportPeriod').default;
const Summary = require('../dist/models/WeeklySummary').default;
const Lock = require('../dist/models/FieldAssignmentLock').default;
const dbName = `qa_weekly_demo_${Date.now()}_${process.pid}`;
const now = new Date('2026-10-27T03:00:00Z');

async function main() {
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-demo-test-'));
  await mongoose.connect(env.mongodbUri, { dbName, autoIndex: false, serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  assert.equal(db.databaseName, dbName);
  try {
    for (const model of [User, Report, Period, Summary, Lock]) await model.createCollection();
    await Report.collection.createIndex({ ownerId: 1, periodId: 1, reportType: 1 }, { unique: true });
    const allocations = [['LV1', 'LV6'], ['LV2'], ['LV3'], ['LV4'], ['LV5'], ['LV7'], ['LV8']];
    const users = await User.insertMany(allocations.map((fieldCodes, index) => ({ username: `qa-${index}`, fullName: `QA specialist ${index}`, passwordHash: 'QA-ONLY', department: 'QA', role: 'staff', fieldCodes, isActive: true })));
    const admin = await User.create({ username: 'qa-admin', fullName: 'QA admin', passwordHash: 'QA-ONLY', department: 'QA', role: 'admin', isActive: true });
    const window = getWeeklyPeriodWindow(now);
    const period = await Period.create({ type: 'weekly', title: 'Baseline period', year: 2026, month: 10, weekNumber: 4, ...window, status: 'open', expectedReporterIds: [admin._id] });
    const older = await Period.create({ type: 'weekly', title: 'Older baseline', year: 2026, startDate: '2026-10-19', dueDate: '2026-10-22', status: 'open' });
    await Report.create({ title: 'Real baseline outside demo week', ownerId: users[0]._id, periodId: older._id, reportType: 'weekly', status: 'pending', content: 'REAL_QA_BASELINE', sender: 'QA', department: 'QA' });
    await Summary.create({ periodId: period._id, periodTitle: 'Existing manual draft', authorId: admin._id, content: 'ORIGINAL ADMIN NOTES', nextTasks: 'ORIGINAL NEXT TASKS', entries: [], status: 'draft' });
    const snapshot = async () => {
      const result = {};
      for (const collection of ['users', 'reports', 'reportperiods', 'weekly_summaries']) result[collection] = await db.collection(collection).find({}).sort({ _id: 1 }).toArray();
      return result;
    };
    const before = await snapshot();
    const dry = await seedDemo({ db, now, storageDir, dryRun: true });
    assert.equal(dry.reports, 7); assert.equal(dry.fields, 8);
    assert.ok(same(await snapshot(), before));
    assert.equal(fs.existsSync(path.join(storageDir, 'active.ejson')), false);
    const real = await Report.create({ title: 'Existing real current report', ownerId: users[0]._id, periodId: period._id, reportType: 'weekly', status: 'draft', content: 'DO NOT OVERWRITE', sender: 'QA', department: 'QA' });
    await assert.rejects(seedDemo({ db, now, storageDir }), /đã có báo cáo tuần/);
    assert.equal((await Report.findById(real._id)).content, 'DO NOT OVERWRITE');
    await Report.deleteOne({ _id: real._id });

    const seeded = await seedDemo({ db, now, storageDir });
    const activeCopy = fs.readFileSync(path.join(storageDir, 'active.ejson'), 'utf8');
    assert.equal(seeded.reports, 7); assert.equal(seeded.fields, 8);
    await assert.rejects(seedDemo({ db, now, storageDir }), /phiên demo/);
    const source = await getWeeklySummaryByPeriod(String(period._id));
    assert.equal(source.submissionStats.expected, 7); assert.equal(source.submissionStats.submitted, 7);
    assert.equal(source.fieldCoverage.submitted, 8); assert.equal(source.sourceIssues.length, 0);
    const generated = await generateWeeklySummary(String(period._id), { id: String(admin._id), username: admin.username, fullName: admin.fullName, role: 'admin', department: 'QA', mustChangePassword: false });
    assert.equal(generated.summary.entries.length, 16);
    for (const field of FIELDS) {
      const entries = generated.summary.entries.filter((entry) => entry.groupId === field.groupId);
      assert.equal(entries.length, 2);
      assert.ok(entries.every((entry) => entry.text.includes('DỮ LIỆU MẪU')));
    }
    const preview = await resetDemo({ db, storageDir, dryRun: true });
    assert.equal(preview.demoReportIds.length, 7);
    const reset = await resetDemo({ db, storageDir });
    assert.equal(reset.removedReports, 7); assert.ok(reset.verified);
    assert.ok(same(await snapshot(), before), 'Business data must exactly match the pre-seed snapshot, including BSON types');
    assert.equal((await resetDemo({ db, storageDir })).reset, false);
    // Recover if DB reset committed but the local manifest finalization was interrupted.
    fs.writeFileSync(path.join(storageDir, 'active.ejson'), activeCopy);
    assert.equal((await resetDemo({ db, storageDir })).noBusinessChangesNeeded, true);
    assert.ok(same(await snapshot(), before));
    // A prepared run which never committed must not restore stale snapshots.
    const prepared = decode(activeCopy); prepared.phase = 'prepared';
    fs.writeFileSync(path.join(storageDir, 'active.ejson'), encode(prepared));
    assert.equal((await resetDemo({ db, storageDir })).noBusinessChangesNeeded, true);
    assert.ok(same(await snapshot(), before));

    // A summary created during the demo must disappear if none existed before.
    await Summary.deleteOne({ periodId: period._id });
    const noSummaryBefore = await snapshot();
    await seedDemo({ db, now, storageDir });
    await generateWeeklySummary(String(period._id), { id: String(admin._id), username: admin.username, fullName: admin.fullName, role: 'admin', department: 'QA', mustChangePassword: false });
    await resetDemo({ db, storageDir });
    assert.ok(same(await snapshot(), noSummaryBefore));

    // Refuse undo if a new non-demo report appeared while testing.
    await seedDemo({ db, now, storageDir });
    const external = await Report.create({ title: 'New unrelated write', ownerId: admin._id, periodId: period._id, reportType: 'general', content: 'PRESERVE ME', sender: 'QA admin', department: 'QA', status: 'draft' });
    const guarded = await snapshot();
    await assert.rejects(resetDemo({ db, storageDir }), /báo cáo mới ngoài phiên demo/);
    assert.ok(same(await snapshot(), guarded));
    await Report.deleteOne({ _id: external._id });
    await resetDemo({ db, storageDir });
    assert.ok(same(await snapshot(), noSummaryBefore));

    // Wrong database identity cannot delete anything.
    await seedDemo({ db, now, storageDir });
    const activeFile = path.join(storageDir, 'active.ejson');
    const originalManifest = fs.readFileSync(activeFile, 'utf8');
    const bad = decode(originalManifest); bad.identity.database = 'different';
    fs.writeFileSync(activeFile, encode(bad));
    await assert.rejects(resetDemo({ db, storageDir }), /đúng database/);
    fs.writeFileSync(activeFile, originalManifest);
    await resetDemo({ db, storageDir });
    assert.ok(same(await snapshot(), noSummaryBefore));
    console.log('PASS: real QA MongoDB: 7 submitted sample reports / 8 fields / 16 summary entries; repeat-run guard; exact BSON restore; restore previous summary or remove demo summary; unrelated-write and wrong-DB guards; dry-run and repeated reset.');
  } finally {
    assert.equal(db.databaseName, dbName);
    assert.match(dbName, /^qa_weekly_demo_\d+_\d+$/);
    await db.dropDatabase(); await mongoose.disconnect();
    // Only files created in the freshly allocated test directory are removed.
    for (const file of fs.readdirSync(storageDir)) fs.unlinkSync(path.join(storageDir, file));
    fs.rmdirSync(storageDir);
  }
}
main().catch((error) => { console.error(error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted]')); process.exitCode = 1; });
