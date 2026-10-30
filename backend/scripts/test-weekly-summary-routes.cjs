// Isolated HTTP + service tests. Model operations use an in-memory fixture;
// this never connects to or changes a real MongoDB database.
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
process.env.PORT = '5002';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unused_weekly_fixture';
process.env.JWT_SECRET = 'weekly-route-fixture-only';
process.env.FRONTEND_ORIGIN = 'http://127.0.0.1';

const Period = require('../dist/models/ReportPeriod').default;
const Report = require('../dist/models/Report').default;
const Summary = require('../dist/models/WeeklySummary').default;
const User = require('../dist/models/User').default;
const audit = require('../dist/services/audit.service');
audit.writeAuditLog = async () => {};
const { env } = require('../dist/config/env');
const id = () => new mongoose.Types.ObjectId();
const admin = { _id: id(), username: 'admin', fullName: 'Admin', department: 'Phong', role: 'admin', isActive: true, mustChangePassword: false };
admin.id = String(admin._id);
const staff = ['A', 'B', 'C'].map((fullName) => ({ _id: id(), fullName, department: 'Phong' }));
const periods = [
  new Period({ _id: id(), type: 'weekly', title: 'Old week in month', year: 2026, month: 10, weekNumber: 3, startDate: '2026-10-12', dueDate: '2026-10-15T16:59:59Z', status: 'open', expectedReporterIds: staff.map((u) => u._id) }),
  new Period({ _id: id(), type: 'weekly', title: 'Old week in month', year: 2026, month: 10, weekNumber: 4, startDate: '2026-10-19', dueDate: '2026-10-22T16:59:59Z', status: 'open', expectedReporterIds: staff.map((u) => u._id) }),
];
const source = (period, user, content, extra = {}) => ({ _id: id(), periodId: period._id, ownerId: user, sender: user.fullName, department: 'Phong', field: 'Y tế', reportType: 'weekly', status: 'pending', content, nextTasks: `Next ${content}`, submittedAt: new Date('2026-10-21'), ...extra });
const reports = [source(periods[0], staff[1], 'OTHER-WEEK'), source(periods[1], staff[0], '168 lượt; 02 ca; 36 lũy kế', { administrativeReform: 'CCHC nguyên văn', digitalTransformation: 'CĐS nguyên văn', difficulties: 'Khó khăn nguyên văn', proposals: 'Kiến nghị nguyên văn' }), source(periods[1], staff[2], 'UNKNOWN-FIELD', { field: 'Nội vụ và chuyển đổi số' }), source(periods[1], staff[0], 'MONTHLY-EXCLUDED', { reportType: 'monthly_staff' }), source(periods[1], staff[1], 'DRAFT-EXCLUDED', { status: 'draft' })];
reports[1].fieldReports = [
  { fieldCode: 'LV4', content: reports[1].content, nextTasks: reports[1].nextTasks },
  { fieldCode: 'LV6', content: 'CCHC nguyên văn', nextTasks: '' },
  { fieldCode: 'LV7', content: 'CĐS nguyên văn', nextTasks: '' },
];
const summaries = new Map();
Period.findById = async (key) => periods.find((p) => String(p._id) === String(key)) || null;
Report.find = (filter) => ({ populate() { return this; }, sort() { return this; }, async lean() {
  assert.equal(filter.reportType, 'weekly');
  assert.ok(!('year' in filter) && !('month' in filter));
  return reports.filter((r) => String(r.periodId) === String(filter.periodId) && r.reportType === filter.reportType && filter.status.$in.includes(r.status));
} });
User.find = () => ({ select() { return this; }, sort() { return this; }, async lean() { return staff; } });
User.findById = async (key) => String(key) === admin.id ? admin : null;
Summary.findOne = async ({ periodId }) => summaries.get(String(periodId)) || null;
Summary.findOneAndUpdate = async ({ periodId }, update) => {
  let doc = summaries.get(String(periodId));
  if (!doc) doc = new Summary({ periodId, ...update.$setOnInsert });
  doc.set(update.$set);
  summaries.set(String(periodId), doc);
  return doc;
};

async function main() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/weekly-summaries', require('../dist/routes/weekly-summaries').default);
  app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ error: error.message, code: error.code }));
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/weekly-summaries/${periods[1]._id}`;
  const token = jwt.sign({ id: admin.id }, env.jwtSecret);
  const request = (suffix = '', method = 'GET', body, auth = true) => fetch(base + suffix, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  try {
    assert.equal((await request('', 'GET', undefined, false)).status, 401);
    admin.role = 'staff';
    assert.equal((await request()).status, 403);
    admin.role = 'admin';
    assert.equal((await request('/generate', 'POST')).status, 409);
    assert.ok((await (await request()).json()).sourceIssues.some((issue) => issue.code === 'MISSING_FIELD_CODE'));
    reports[2].fieldReports = [{ fieldCode: 'LV1', content: reports[2].content, nextTasks: reports[2].nextTasks }];
    let response = await request('/generate', 'POST');
    assert.equal(response.status, 200);
    let data = await response.json();
    assert.equal(data.summary.periodTitle, 'Tuần 43 năm 2026');
    assert.equal(data.nextPeriodTitle, 'Tuần 44 năm 2026');
    assert.equal(data.submissionStats.submitted, 2);
    assert.equal(data.submissionStats.missing, 1);
    assert.equal(data.groups.length, 8);
    assert.equal(data.summary.sourceReportIds.length, 2);
    const texts = data.summary.entries.map((e) => e.text).join('\n');
    assert.ok(!/OTHER-WEEK|MONTHLY-EXCLUDED|DRAFT-EXCLUDED/.test(texts));
    assert.ok(texts.includes('168 lượt; 02 ca; 36 lũy kế'));
    assert.ok(data.summary.entries.some((e) => e.groupId === 'administration' && e.text === 'CCHC nguyên văn'));
    assert.ok(data.summary.entries.some((e) => e.groupId === 'digital' && e.text === 'CĐS nguyên văn'));
    assert.ok(!('difficulties' in data.summary));
    assert.ok(!('proposals' in data.summary));
    assert.ok(data.employeeReports.some((r) => r.difficulties === 'Khó khăn nguyên văn' && r.proposals === 'Kiến nghị nguyên văn'));
    await request('', 'PATCH', { entries: data.summary.entries.map((entry, index) => index === 0 ? { ...entry, groupId: null } : entry) });
    assert.equal((await request('/export-docx', 'POST')).status, 409);
    const invalid = data.summary.entries.map((e) => ({ ...e, groupId: 'invalid' }));
    assert.equal((await request('', 'PATCH', { entries: invalid })).status, 400);
    const entries = data.summary.entries.map((e) => ({ ...e, groupId: e.groupId || 'personnel' }));
    assert.equal((await request('', 'PATCH', { entries: [{ ...entries[0], sourceReportId: String(id()) }] })).status, 400);
    response = await request('', 'PATCH', { entries });
    assert.equal(response.status, 200);
    data = await response.json();
    assert.deepEqual(data.summary.entries, entries);
    assert.ok(summaries.get(String(periods[1]._id)).content.includes('168 lượt; 02 ca; 36 lũy kế'));
    const edited = entries.map((entry, index) => index === 0 ? { ...entry, text: 'Nội dung đã duyệt 169 lượt' } : entry);
    assert.equal((await request('', 'PATCH', { entries: edited })).status, 200);
    assert.ok((await (await request()).json()).summary.entries.some((e) => e.text === 'Nội dung đã duyệt 169 lượt'));
    assert.ok(summaries.get(String(periods[1]._id)).content.includes('Nội dung đã duyệt 169 lượt'));
    await request('', 'PATCH', { entries });
    // Verify persistence by fetching the saved document again, not by trusting a toast.
    assert.deepEqual((await (await request()).json()).summary.entries, entries);
    response = await request('/export-docx', 'POST');
    assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 2).toString(), 'PK');
    assert.match(response.headers.get('content-disposition'), /tuan-43-2026.docx/);
    if (process.env.RUN_PDF_TESTS === '1') {
      response = await request('/export-pdf', 'POST');
      assert.equal(response.status, 200, await response.clone().text());
      const pdf = Buffer.from(await response.arrayBuffer());
      assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
      assert.match(response.headers.get('content-type'), /application\/pdf/);
    }
    periods[1].status = 'archived';
    assert.equal((await request('/generate', 'POST')).status, 409);
    assert.equal((await request('', 'PATCH', { entries })).status, 409);
    assert.equal((await request('/export-docx', 'POST')).status, 200);
    periods[1].status = 'open';
    const saved = summaries.get(String(periods[1]._id));
    saved.entries = undefined;
    assert.equal((await request('/export-docx', 'POST')).status, 409);
    assert.deepEqual((await (await request()).json()).summary.entries, []);
    periods[1].type = 'monthly';
    assert.equal((await request('/generate', 'POST')).status, 400);
    periods[1].type = 'weekly';
    reports.splice(0);
    assert.equal((await request('/generate', 'POST')).status, 409);
    console.log('PASS: isolated HTTP fixture: correct week, partial submissions, source persistence, 8 groups, export, permissions, archive, legacy. MongoDB integration: NOT TESTED.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
