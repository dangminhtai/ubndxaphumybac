// Runs against an isolated, newly named QA database on the configured MongoDB.
// Never reads or writes the application's users/reports database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const mongoose = require('mongoose');
const { env } = require('../dist/config/env');
const dbName = `qa_fields_${Date.now()}_${process.pid}`;
const User = require('../dist/models/User').default;
const Report = require('../dist/models/Report').default;
const Period = require('../dist/models/ReportPeriod').default;
const Summary = require('../dist/models/WeeklySummary').default;
const Audit = require('../dist/models/AuditLog').default;
const Lock = require('../dist/models/FieldAssignmentLock').default;
const { assignMyFields, assignStaffBatch, parseFieldCodes } = require('../dist/services/field-assignment.service');
const { createWeeklyReport, submitWeeklyReport } = require('../dist/services/report.service');
const { generateWeeklySummary, getWeeklySummaryByPeriod, updateWeeklySummary, exportWeeklySummaryFile } = require('../dist/services/weekly-summary.service');
const { updateManagedUser, createManagedUser, deleteManagedUser } = require('../dist/services/auth.service');
// Notification delivery is outside assignment/report correctness; avoid background
// work recreating a QA collection after cleanup.
const notifications = require('../dist/services/notification.service');
notifications.notifyUsersByRole = async () => {};
notifications.generateOnboardingNotifications = async () => {};
require('../dist/services/audit.service').writeAuditLog = async () => {};
const { snapshotFieldReports } = require('../dist/services/report-fields');
const { getReportMapping, updateReportMapping } = require('../dist/services/report-field-mapping.service');
const id = () => new mongoose.Types.ObjectId();
const body = (code, text) => ({ fieldCode: code, content: text, difficulties: `D-${text}`, proposals: `P-${text}`, nextTasks: `Next-${text}` });

async function main() {
  await mongoose.connect(env.mongodbUri, { dbName, autoIndex: false, serverSelectionTimeoutMS: 5000 });
  assert.match(mongoose.connection.db.databaseName, /^qa_fields_\d+_\d+$/);
  try {
    for (const model of [User, Report, Period, Summary, Audit, Lock]) await model.createCollection();
    assert.deepEqual(parseFieldCodes(['LV6', 'LV1'], 'staff'), ['LV1', 'LV6']);
    await Report.collection.createIndex({ ownerId: 1, periodId: 1, reportType: 1 }, { unique: true });
    const account = async (username, fieldCodes, role = 'staff') => User.create({ username, fullName: username, passwordHash: 'qa-not-a-real-password', department: 'QA', role, fieldCodes, isActive: true });
    const a = await account('a', ['LV1', 'LV6']);
    const b = await account('b', ['LV2']);
    const c = await account('c', ['LV3']);
    const admin = await account('admin-qa', [], 'admin');
    const actor = (user) => ({ id: String(user._id), username: user.username, fullName: user.fullName, department: user.department, role: user.role, mustChangePassword: false });
    const races = await Promise.allSettled([
      assignMyFields(actor(b), ['LV2', 'LV8']), assignMyFields(actor(c), ['LV3', 'LV8']),
    ]);
    assert.equal(races.filter((result) => result.status === 'fulfilled').length, 1);
    const failure = races.find((result) => result.status === 'rejected').reason;
    assert.equal(failure.code, 'FIELD_ALREADY_ASSIGNED');
    assert.equal((await User.find({ role: 'staff', fieldCodes: 'LV8' })).length, 1);
    await assert.rejects(assignMyFields(actor(b), []), (e) => e.statusCode === 400);
    await assert.rejects(assignMyFields(actor(b), ['LV9']), (e) => e.statusCode === 400);
    await assignStaffBatch(actor(admin), [{ userId: String(a._id), fieldCodes: ['LV2', 'LV6'] }, { userId: String(b._id), fieldCodes: ['LV1'] }, { userId: String(c._id), fieldCodes: ['LV3', 'LV8'] }]);
    assert.deepEqual((await User.findById(a._id)).fieldCodes, ['LV2', 'LV6']);
    const period = await Period.create({ type: 'weekly', title: 'QA current', startDate: '2026-10-26', dueDate: '2026-10-29T16:59:59Z', year: 2026, status: 'open', expectedReporterIds: [a._id, b._id, c._id] });
    const older = await Period.create({ type: 'weekly', title: 'QA previous', startDate: '2026-10-19', dueDate: '2026-10-22T16:59:59Z', year: 2026, status: 'open', expectedReporterIds: [a._id, b._id, c._id] });
    const input = { periodId: String(period._id), period: 'QA', reportTitle: 'QA report', status: 'draft', fieldReports: [body('LV2', 'Education 692/536'), body('LV6', 'Administration 168')] };
    const draft = await createWeeklyReport(input, actor(a));
    assert.equal(draft.fieldReports.length, 2);
    await assert.rejects(createWeeklyReport({ ...input, fieldReports: [body('LV2', 'omit LV6')] }, actor(a)), (e) => e.code === 'REPORT_ASSIGNMENT_CHANGED');
    const submitted = await submitWeeklyReport(String(draft._id), actor(a));
    assert.equal(submitted.status, 'pending');
    const preview = await getWeeklySummaryByPeriod(String(period._id));
    assert.equal(preview.autoFilled, true);
    assert.equal(preview.summary.entries.length, 4);
    assert.equal(await Summary.countDocuments({ periodId: period._id }), 0, 'GET preview must not create a stored summary');
    const manual = preview.summary.entries.map((entry, index) => index === 0 ? { ...entry, text: 'ADMIN REVIEWED' } : entry);
    await updateWeeklySummary(String(period._id), { entries: manual, sourceReportIds: preview.summary.sourceReportIds.map(String) }, actor(admin));
    const preserved = await getWeeklySummaryByPeriod(String(period._id));
    assert.equal(preserved.autoFilled, false);
    assert.equal(preserved.summary.entries[0].text, 'ADMIN REVIEWED');
    await updateWeeklySummary(String(period._id), { entries: [] }, actor(admin));
    assert.deepEqual((await getWeeklySummaryByPeriod(String(period._id))).summary.entries, [], 'An intentionally cleared saved draft must stay empty');
    await createWeeklyReport({ ...input, periodId: String(older._id), status: 'pending', fieldReports: [body('LV2', 'OTHER_WEEK'), body('LV6', 'OTHER_WEEK')] }, actor(a));
    let summary = await generateWeeklySummary(String(period._id), actor(admin));
    assert.equal(summary.submissionStats.submitted, 1); // Two fields still one person.
    assert.equal(summary.fieldCoverage.submitted, 2);
    assert.equal(summary.submissionStats.missing, 2);
    assert.ok(summary.summary.entries.some((e) => e.groupId === 'education' && e.text === 'Education 692/536'));
    assert.ok(summary.summary.entries.some((e) => e.groupId === 'administration' && e.text === 'Administration 168'));
    assert.ok(!JSON.stringify(summary.summary.entries).includes('OTHER_WEEK'));
    if (process.env.RUN_PDF_TESTS === '1') {
      const word = await exportWeeklySummaryFile(String(period._id), 'docx');
      const pdf = await exportWeeklySummaryFile(String(period._id), 'pdf');
      try {
        const check = spawnSync(process.env.PYTHON_BIN || 'python', ['-X', 'utf8', '-c', [
          'import sys,zipfile,pymupdf,xml.etree.ElementTree as ET',
          'ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}',
          'with zipfile.ZipFile(sys.argv[1]) as z: root=ET.fromstring(z.read("word/document.xml"))',
          'paragraphs=["".join(p.itertext()) for p in root.findall(".//w:p",ns)]',
          'i2=next(i for i,p in enumerate(paragraphs) if p.startswith("2. "))',
          'i6=next(i for i,p in enumerate(paragraphs) if p.startswith("6. "))',
          'assert "Education 692/536" in paragraphs[i2+1]',
          'assert "Administration 168" in paragraphs[i6+1]',
          'with pymupdf.open(sys.argv[2]) as d: text="".join(p.get_text() for p in d)',
          'assert "Education 692/536" in text and "Administration 168" in text',
          'assert "OTHER_WEEK" not in text',
          'print("PASS: actual Word/PDF exports put coded LV2/LV6 content under the correct headings.")',
        ].join('\n'), word, pdf], { encoding: 'utf8' });
        assert.equal(check.status, 0, check.stderr);
        console.log(check.stdout.trim());
      } finally {
        for (const file of [word, pdf]) { fs.unlinkSync(file); fs.rmdirSync(path.dirname(file)); }
      }
    }
    assert.equal((await Report.findById(draft._id)).fieldReports[0].difficulties, 'D-Education 692/536');
    const original = JSON.stringify((await Report.findById(draft._id)).fieldReports);
    await assignStaffBatch(actor(admin), [{ userId: String(a._id), fieldCodes: ['LV1', 'LV6'] }, { userId: String(b._id), fieldCodes: ['LV2'] }]);
    assert.equal(JSON.stringify((await Report.findById(draft._id)).fieldReports), original);
    summary = await generateWeeklySummary(String(period._id), actor(admin));
    assert.ok(summary.summary.entries.some((e) => e.groupId === 'education'));
    await assert.rejects(createWeeklyReport(input, actor(a)), (e) => e.code === 'REPORT_ASSIGNMENT_CHANGED');
    const extra = await Report.create({ title: 'Ambiguous', ownerId: b._id, periodId: period._id, reportType: 'weekly', sender: 'b', department: 'QA', content: 'No code', field: 'Mixed', status: 'pending' });
    assert.ok((await getWeeklySummaryByPeriod(String(period._id))).sourceIssues.some((issue) => issue.reportId === String(extra._id)));
    await assert.rejects(generateWeeklySummary(String(period._id), actor(admin)), (e) => e.code === 'WEEKLY_SOURCE_FIELD_CONFLICT');
    const mappingPreview = await getReportMapping(String(extra._id));
    await assert.rejects(updateReportMapping(String(extra._id), ['LV5'], actor(b), mappingPreview.revision), (e) => e.statusCode === 403);
    await assert.rejects(updateReportMapping(String(extra._id), ['LV5'], actor(admin), 'stale'), (e) => e.statusCode === 409);
    await updateReportMapping(String(extra._id), ['LV5'], actor(admin), mappingPreview.revision);
    const mapped = await Report.findById(extra._id);
    assert.equal(mapped.fieldReports[0].content, 'No code');
    assert.equal(mapped.fieldReports[0].fieldCode, 'LV5');
    assert.equal((await getWeeklySummaryByPeriod(String(period._id))).sourceIssues.length, 0);
    const mappedPreview = await getReportMapping(String(extra._id));
    await Period.updateOne({ _id: period._id }, { $set: { status: 'archived' } });
    await assert.rejects(updateReportMapping(String(extra._id), ['LV4'], actor(admin), mappedPreview.revision), (e) => e.statusCode === 409);
    await Period.updateOne({ _id: period._id }, { $set: { status: 'open' } });
    await Report.deleteOne({ _id: extra._id });
    // Reactivating a disabled overlapping account must not steal a field.
    const disabled = await account('disabled', ['LV1']);
    await User.updateOne({ _id: disabled._id }, { $set: { isActive: false } });
    await assert.rejects(updateManagedUser(String(disabled._id), { isActive: true }, actor(admin)), (e) => e.code === 'FIELD_ALREADY_ASSIGNED');
    assert.equal((await User.findById(disabled._id)).isActive, false);
    const promoted = await updateManagedUser(String(c._id), { role: 'admin', position: 'Phó phòng' }, actor(admin));
    assert.equal(promoted.role, 'admin'); assert.deepEqual(promoted.fieldCodes, []);
    assert.ok(await Audit.countDocuments({ action: 'FIELD_ASSIGNMENT' }) >= 6);
    assert.throws(() => snapshotFieldReports([body('LV1', 'a'), body('LV1', 'b')], ['LV1'], 'pending'));
    await assert.rejects(createManagedUser({ username: 'invalid-new', password: 'qa-password', fullName: 'QA', department: 'QA', role: 'staff', fieldCodes: [] }, actor(admin)), (e) => e.statusCode === 400);
    assert.equal(await User.countDocuments({ username: 'invalid-new' }), 0);
    const created = await createManagedUser({ username: 'new-specialist', password: 'qa-password', fullName: 'QA specialist', department: 'QA', role: 'staff', fieldCodes: ['LV4'] }, actor(admin));
    const createdId = String(created.id);
    assert.deepEqual(created.fieldCodes, ['LV4']);
    await assert.rejects(createManagedUser({ username: 'conflicting-new', password: 'qa-password', fullName: 'QA', department: 'QA', role: 'staff', fieldCodes: ['LV4'] }, actor(admin)), (e) => e.code === 'FIELD_ALREADY_ASSIGNED');
    assert.equal(await User.countDocuments({ username: 'conflicting-new' }), 0);
    await updateManagedUser(createdId, { isActive: false }, actor(admin));
    await assignMyFields(actor(b), ['LV2', 'LV4']);
    await assert.rejects(updateManagedUser(createdId, { isActive: true }, actor(admin)), (e) => e.code === 'FIELD_ALREADY_ASSIGNED');
    await updateManagedUser(createdId, { isActive: true, fieldCodes: ['LV5'] }, actor(admin));
    const deleted = await deleteManagedUser(createdId, actor(admin));
    assert.ok(!('passwordHash' in deleted));
    assert.equal(await User.countDocuments({ _id: createdId }), 0);
    // Exercise the actual auth/field/report routes with signed QA-only identities.
    const express = require('express');
    const jwt = require('jsonwebtoken');
    const app = express(); app.use(express.json());
    app.use('/fields', require('../dist/routes/fields').default);
    app.use('/reports', require('../dist/routes/reports').default);
    app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ code: error.code, error: error.message }));
    const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (url, who, method = 'GET', data) => fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${jwt.sign({ id: String(who._id) }, env.jwtSecret)}` } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
    try {
      assert.equal((await request('/fields', null)).status, 401);
      assert.equal((await request('/fields', b)).status, 200);
      assert.equal((await request('/fields/assignments', b, 'PATCH', { assignments: [] })).status, 403);
      assert.equal((await request('/fields/mine', admin, 'PATCH', { fieldCodes: ['LV4'] })).status, 403);
      assert.equal((await request('/fields/mine', b, 'PATCH', { fieldCodes: ['LV1'] })).status, 409);
      const current = await (await request(`/reports/weekly/current?periodId=${period._id}`, b)).json();
      assert.equal(current.assignedFieldCodes[0], 'LV2');
      assert.equal(current.fields.length, 8);
      assert.equal((await request(`/reports/${draft._id}/field-mapping`, b)).status, 403);
    } finally { await new Promise((resolve) => server.close(resolve)); }
    console.log('PASS: real MongoDB transactions in isolated QA DB: concurrent claims, atomic transfer, 2-field report, field snapshots, exact-week mapping, conflicts, activation and promotion.');
  } finally {
    // Checked exact, generated QA database name. Never drop the application DB.
    assert.equal(mongoose.connection.db.databaseName, dbName);
    assert.match(dbName, /^qa_fields_\d+_\d+$/);
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
}
main().catch((error) => { console.error(error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted]')); process.exitCode = 1; });
