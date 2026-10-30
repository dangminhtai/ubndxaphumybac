const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash, randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { EJSON } = mongoose.mongo.BSON;
const { FIELDS } = require('../dist/domain/fields');
const { snapshotFieldReports, projectFieldReports } = require('../dist/services/report-fields');
const { getWeeklyPeriodWindow } = require('../dist/services/period.service');
const { weeklyLabel } = require('../dist/utils/weeklyLabel');
const { withAssignmentLock } = require('../dist/services/field-assignment.service');

const MARKER = 'weeklyDemoRunId';
const encode = (value) => EJSON.stringify(value, null, 2, { relaxed: false });
const decode = (value) => EJSON.parse(value, { relaxed: false });
const sorted = (value) => Array.isArray(value) ? value.map(sorted)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])])) : value;
const fingerprint = (value) => JSON.stringify(sorted(JSON.parse(encode(value))));
const same = (left, right) => fingerprint(left) === fingerprint(right);
const fail = (message) => { throw new Error(message); };

function databaseIdentity() {
  const options = mongoose.connection.getClient().options;
  const hosts = options.srvHost || (options.hosts || []).map(String).sort().join(',');
  return { database: mongoose.connection.db.databaseName, deployment: createHash('sha256').update(hosts).digest('hex') };
}
function defaultStorageDir() {
  const key = createHash('sha256').update(JSON.stringify(databaseIdentity())).digest('hex').slice(0, 20);
  return path.join(os.homedir(), '.codex', 'backups', 'main-web-weekly-demo', key);
}
function writeManifest(file, value, exclusive = false) {
  if (exclusive) { fs.writeFileSync(file, encode(value), { flag: 'wx', mode: 0o600 }); return; }
  const temporary = `${file}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, encode(value), { flag: 'wx', mode: 0o600 });
  try { fs.renameSync(temporary, file); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
async function fileLock(folder, action) {
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, 'operation.lock');
  let descriptor;
  try { descriptor = fs.openSync(file, 'wx', 0o600); }
  catch { fail(`Một thao tác demo đang chạy hoặc còn lock sau sự cố: ${file}. Không chạy hai script cùng lúc.`); }
  fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  try { return await action(); }
  finally { fs.closeSync(descriptor); fs.unlinkSync(file); }
}

// All content is synthetic. Prefixes survive into the final admin export.
const SAMPLES = {
  LV1: ['Rà soát 12 hồ sơ cán bộ giả lập; hoàn tất cập nhật 10 hồ sơ và ghi nhận 02 hồ sơ cần bổ sung.', 'Hai hồ sơ giả lập còn thiếu giấy tờ nên chưa thể hoàn tất.', 'Đề nghị bố trí một buổi rà soát hồ sơ nội bộ giả lập.', 'Hoàn thiện 02 hồ sơ còn thiếu và kiểm tra lại danh sách cán bộ giả lập.'],
  LV2: ['Tổng hợp số liệu mẫu từ 03 trường giả lập, gồm 24 lớp và 680 học sinh; tiếp nhận 05 văn bản mẫu về giáo dục.', 'Một trường giả lập gửi số liệu chưa đủ biểu mẫu.', 'Đề nghị thống nhất biểu mẫu báo cáo giữa các trường giả lập.', 'Bổ sung số liệu còn thiếu và rà soát kế hoạch chuyên môn tại 03 trường giả lập.'],
  LV3: ['Tiếp nhận 18 hồ sơ trợ giúp xã hội giả lập, xử lý 15 hồ sơ; vận động 25 lượt tham gia BHYT giả lập.', 'Còn 03 hồ sơ giả lập chờ xác minh thông tin.', 'Đề nghị phối hợp xác minh ba hồ sơ giả lập chưa đủ dữ liệu.', 'Hoàn tất xác minh 03 hồ sơ và đối chiếu danh sách BHYT giả lập.'],
  LV4: ['Tổng hợp 168 lượt khám giả lập; thực hiện 02 buổi truyền thông phòng dịch và kiểm tra 04 cơ sở thực phẩm giả lập.', 'Một cơ sở giả lập chưa hoàn thiện biểu mẫu tự kiểm tra.', 'Đề nghị bổ sung hướng dẫn ghi chép sổ theo dõi giả lập.', 'Tiếp tục giám sát tình hình dịch giả lập và kiểm tra bổ sung cơ sở còn thiếu biểu mẫu.'],
  LV5: ['Rà soát 08 hồ sơ người có công giả lập, hoàn thiện 06 hồ sơ và đối chiếu 20 bản ghi chi trả giả lập.', 'Hai hồ sơ giả lập cần bổ sung thông tin đối chiếu.', 'Đề nghị phối hợp kiểm tra thông tin hai trường hợp giả lập.', 'Hoàn thiện 02 hồ sơ còn lại và rà soát danh sách chi trả giả lập kỳ tiếp theo.'],
  LV6: ['Kiểm tra 30 hồ sơ hành chính giả lập: 28 hồ sơ đúng hạn, 02 hồ sơ đang xử lý; cập nhật 05 quy trình mẫu.', 'Một quy trình giả lập còn thiếu mô tả bước phối hợp.', 'Đề nghị tổ chức một buổi hướng dẫn quy trình giả lập đã cập nhật.', 'Hoàn thiện bước phối hợp còn thiếu và kiểm tra tiến độ 02 hồ sơ giả lập.'],
  LV7: ['Hướng dẫn 15 tài khoản giả lập sử dụng dịch vụ số; rà soát 08 tiêu chí chuyển đổi số và số hóa 40 trang tài liệu mẫu.', 'Ba tài khoản giả lập cần được hướng dẫn bổ sung.', 'Đề nghị bổ sung một buổi hỗ trợ kỹ năng số bằng dữ liệu giả lập.', 'Hỗ trợ 03 tài khoản còn lại và hoàn tất minh chứng cho 08 tiêu chí giả lập.'],
  LV8: ['Biên tập 12 tin và 04 bài truyền thanh giả lập; rà soát 06 thiết chế văn hóa và kiểm tra 03 cụm loa giả lập.', 'Một cụm loa giả lập cần kiểm tra lại chất lượng âm thanh.', 'Đề nghị bố trí buổi kiểm tra thiết bị giả lập.', 'Khắc phục cụm loa giả lập và chuẩn bị nội dung truyền thông văn hóa cho tuần tới.'],
};

async function planSeed(db, now, periodId) {
  const window = getWeeklyPeriodWindow(now);
  const query = { type: 'weekly', status: 'open', startDate: window.startDate };
  if (periodId) {
    if (!mongoose.isValidObjectId(periodId)) fail('period-id không hợp lệ.');
    query._id = new mongoose.Types.ObjectId(periodId);
  }
  const periods = await db.collection('reportperiods').find(query).toArray();
  if (periods.length !== 1) fail('Cần đúng một kỳ tuần hiện tại đang mở. Mở hệ thống/tạo kỳ trước; nếu có nhiều kỳ hãy chỉ định --period-id.');
  const period = periods[0];
  if (period[MARKER]) fail('Kỳ này đang có phiên demo chưa hoàn tác. Chạy script reset trước.');
  const staff = await db.collection('users').find({ role: 'staff', isActive: true }, { projection: { _id: 1, username: 1, fullName: 1, department: 1, fieldCodes: 1 } }).sort({ _id: 1 }).toArray();
  if (!staff.length) fail('Chưa có chuyên viên đang hoạt động.');
  const owner = new Set();
  for (const user of staff) {
    if (!Array.isArray(user.fieldCodes) || !user.fieldCodes.length) fail(`Chưa phân công lĩnh vực cho ${user.username}.`);
    for (const code of user.fieldCodes) {
      if (!FIELDS.some((field) => field.code === code) || owner.has(code)) fail('Phân công chưa hợp lệ hoặc đang trùng lĩnh vực. Admin xử lý trước khi tạo mẫu.');
      owner.add(code);
    }
  }
  if (owner.size !== FIELDS.length) fail('Chưa phân công đủ tám lĩnh vực.');
  const reports = await db.collection('reports').find({ periodId: period._id }).toArray();
  if (reports.some((report) => report.reportType === 'weekly')) fail('Tuần này đã có báo cáo tuần. Không ghi đè/xóa báo cáo hiện hữu; dùng một kỳ trống để thử.');
  const summaries = await db.collection('weekly_summaries').find({ periodId: period._id }).toArray();
  if (summaries.length > 1) fail('Có nhiều bản tổng hợp cùng kỳ; cần xử lý trước khi tạo mẫu.');
  return { period, staff, baselineReportIds: reports.map((report) => report._id), summaryBefore: summaries[0] || null };
}

async function seedDemo({ db = mongoose.connection.db, now = new Date(), storageDir = defaultStorageDir(), periodId, dryRun = false } = {}) {
  return fileLock(storageDir, async () => {
    const activeFile = path.join(storageDir, 'active.ejson');
    if (fs.existsSync(activeFile)) fail('Đã có phiên demo trong manifest. Chạy reset trước khi tạo lại.');
    const before = await planSeed(db, now, periodId);
    const runId = randomUUID();
    const label = weeklyLabel(before.period.startDate);
    const documents = before.staff.map((user) => {
      const fields = snapshotFieldReports(user.fieldCodes.map((code) => {
        const values = SAMPLES[code];
        return { fieldCode: code, content: `[DỮ LIỆU MẪU ${code}] ${values[0]}`, difficulties: `[DỮ LIỆU MẪU ${code}] ${values[1]}`, proposals: `[DỮ LIỆU MẪU ${code}] ${values[2]}`, nextTasks: `[DỮ LIỆU MẪU ${code}] ${values[3]}` };
      }), user.fieldCodes, 'pending');
      return { _id: new mongoose.Types.ObjectId(), title: `[DỮ LIỆU MẪU] ${label.title} — ${user.fullName}`,
        reportTitle: `[DỮ LIỆU MẪU] BÁO CÁO CÔNG TÁC ${label.title.toUpperCase()}`, reportType: 'weekly',
        ownerId: user._id, periodId: before.period._id, period: label.title, sender: user.fullName, department: user.department,
        startDate: before.period.startDate, endDate: before.period.dueDate, dueDate: before.period.dueDate,
        fieldReports: fields, ...projectFieldReports(fields), status: 'pending', submittedAt: now,
        createdAt: now, updatedAt: now, __v: 0, [MARKER]: runId };
    });
    const summary = { mode: dryRun ? 'dry-run' : 'seed', periodId: String(before.period._id), periodTitle: label.title, reports: documents.length, fields: ownerCount(documents), users: before.staff.map((user) => user.username) };
    if (dryRun) return summary;
    const manifest = { version: 1, identity: databaseIdentity(), runId, phase: 'prepared', createdAt: now,
      periodBefore: before.period, summaryBefore: before.summaryBefore, baselineReportIds: before.baselineReportIds,
      reportIds: documents.map((report) => report._id) };
    // Durable snapshot BEFORE committing. A prepared manifest is recoverable by reset.
    writeManifest(activeFile, manifest, true);
    await withAssignmentLock(async (session) => {
      const check = await planSeed(db, now, periodId);
      if (!same(check, before)) fail('Dữ liệu đã thay đổi trong lúc chuẩn bị; không tạo mẫu. Chạy reset để đóng manifest rồi thử lại.');
      const current = await db.collection('reportperiods').findOne({ _id: before.period._id }, { session });
      if (!same(current, before.period)) fail('Kỳ báo cáo đã thay đổi; không tạo mẫu.');
      await db.collection('reportperiods').updateOne({ _id: before.period._id }, { $set: { expectedReporterIds: before.staff.map((user) => user._id), [MARKER]: runId } }, { session });
      await db.collection('reports').insertMany(documents, { session });
    });
    manifest.phase = 'active'; writeManifest(activeFile, manifest);
    const actual = await db.collection('reports').countDocuments({ _id: { $in: manifest.reportIds }, [MARKER]: runId });
    if (actual !== documents.length) fail('Đã tạo nhưng kiểm tra lại chưa khớp; giữ manifest để reset an toàn.');
    return { ...summary, verified: true, manifest: activeFile, message: 'Đăng nhập admin → Tổng hợp tuần → chọn kỳ này → Tạo tổng hợp tự động. Chưa tự tạo bản tổng hợp.' };
  });
}
const ownerCount = (reports) => new Set(reports.flatMap((report) => report.fieldReports.map((field) => field.fieldCode))).size;

async function resetDemo({ db = mongoose.connection.db, storageDir = defaultStorageDir(), dryRun = false } = {}) {
  return fileLock(storageDir, async () => {
    const activeFile = path.join(storageDir, 'active.ejson');
    if (!fs.existsSync(activeFile)) return { reset: false, message: 'Không có phiên demo đang hoạt động; không xóa gì.' };
    const manifest = decode(fs.readFileSync(activeFile, 'utf8'));
    if (!same(manifest.identity, databaseIdentity()) || Number(manifest.version) !== 1) fail('Manifest không thuộc đúng database/phiên bản này. Không xóa gì.');
    if (dryRun) return { mode: 'dry-run', periodId: String(manifest.periodBefore._id), demoReportIds: manifest.reportIds.map(String), restoresPreviousSummary: Boolean(manifest.summaryBefore), manifest: activeFile };
    let removed = 0, noop = false;
    await withAssignmentLock(async (session) => {
      const periodId = manifest.periodBefore._id;
      const period = await db.collection('reportperiods').findOne({ _id: periodId }, { session });
      const reports = await db.collection('reports').find({ periodId }, { session }).toArray();
      const demoIds = new Set(manifest.reportIds.map(String));
      const baselineIds = new Set(manifest.baselineReportIds.map(String));
      const demo = reports.filter((report) => demoIds.has(String(report._id)));
      if (period?.[MARKER] !== manifest.runId) {
        if (manifest.phase === 'prepared' && !demo.length) { noop = true; return; }
        // The DB transaction may already have restored the snapshot while the
        // process stopped before finishing its local manifest update.
        const currentSummary = await db.collection('weekly_summaries').findOne({ periodId }, { session });
        if (!demo.length && same(period, manifest.periodBefore) && same(currentSummary, manifest.summaryBefore)) { noop = true; return; }
        fail('Dấu phiên demo trên kỳ không còn khớp. Không tự xóa/ghi đè dữ liệu.');
      }
      if (demo.some((report) => report[MARKER] !== manifest.runId)) fail('Một báo cáo không còn đúng dấu demo. Không xóa gì.');
      if (reports.some((report) => !demoIds.has(String(report._id)) && !baselineIds.has(String(report._id)))) fail('Có báo cáo mới ngoài phiên demo trong kỳ. Không hoàn tác để tránh ảnh hưởng dữ liệu thật.');
      const summaries = await db.collection('weekly_summaries').find({ periodId }, { session }).toArray();
      if (summaries.length > 1) fail('Có nhiều bản tổng hợp trong kỳ. Không tự hoàn tác.');
      const allowedSources = new Set([...manifest.reportIds, ...(manifest.summaryBefore?.sourceReportIds || [])].map(String));
      if (summaries.some((summary) => (summary.sourceReportIds || []).some((id) => !allowedSources.has(String(id))))) fail('Bản tổng hợp đã chứa nguồn ngoài demo. Không ghi đè.');
      removed = (await db.collection('reports').deleteMany({ _id: { $in: manifest.reportIds }, [MARKER]: manifest.runId, periodId }, { session })).deletedCount;
      if (manifest.summaryBefore) {
        if (summaries[0] && !summaries[0]._id.equals(manifest.summaryBefore._id)) await db.collection('weekly_summaries').deleteOne({ _id: summaries[0]._id }, { session });
        await db.collection('weekly_summaries').replaceOne({ _id: manifest.summaryBefore._id }, manifest.summaryBefore, { session, upsert: true });
      } else if (summaries[0]) {
        await db.collection('weekly_summaries').deleteOne({ _id: summaries[0]._id, periodId }, { session });
      }
      await db.collection('reportperiods').replaceOne({ _id: periodId, [MARKER]: manifest.runId }, manifest.periodBefore, { session });
    });
    if (!noop) {
      if (await db.collection('reports').countDocuments({ _id: { $in: manifest.reportIds } })) fail('Chưa xóa hết báo cáo mẫu; giữ manifest để kiểm tra.');
      const period = await db.collection('reportperiods').findOne({ _id: manifest.periodBefore._id });
      const summary = await db.collection('weekly_summaries').findOne({ periodId: manifest.periodBefore._id });
      if (!same(period, manifest.periodBefore) || !same(summary, manifest.summaryBefore)) fail('Khôi phục chưa khớp snapshot; giữ manifest để kiểm tra.');
    }
    manifest.phase = 'restored'; manifest.restoredAt = new Date(); writeManifest(activeFile, manifest);
    fs.renameSync(activeFile, path.join(storageDir, `restored-${manifest.runId}.ejson`));
    return { reset: true, removedReports: removed, verified: true, noBusinessChangesNeeded: noop,
      message: 'Đã khôi phục dữ liệu nghiệp vụ trước demo. Giữ audit, thông báo và file đã tải để truy vết.' };
  });
}

async function runCli(mode) {
  const args = process.argv.slice(2);
  const supported = new Set(['--dry-run', '--period-id']);
  let periodId;
  for (let index = 0; index < args.length; index++) {
    if (!supported.has(args[index])) fail(`Tham số không hỗ trợ: ${args[index]}`);
    if (args[index] === '--period-id') { periodId = args[++index]; if (!periodId || mode !== 'seed') fail('--period-id chỉ dùng với seed và cần có giá trị.'); }
  }
  const { env } = require('../dist/config/env');
  try {
    await mongoose.connect(env.mongodbUri, { autoIndex: false, serverSelectionTimeoutMS: 5000 });
    const result = await (mode === 'seed' ? seedDemo({ periodId, dryRun: args.includes('--dry-run') }) : resetDemo({ dryRun: args.includes('--dry-run') }));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted]'));
    process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
}
module.exports = { seedDemo, resetDemo, runCli, defaultStorageDir, MARKER, same, encode, decode };
