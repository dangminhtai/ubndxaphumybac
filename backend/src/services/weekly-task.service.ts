import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { WeeklyTask, TaskRegistrationOverride } from '../models/WeeklyTask';
import type { ITaskItem } from '../models/WeeklyTask';
import User from '../models/User';
import type { AuthUser } from '../middleware/auth.middleware';
import { writeAuditLog } from './audit.service';

/* ── Vietnam timezone helpers ── */

function getVietnamCivilDate(d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return new Date(Date.UTC(Number(v.year), Number(v.month) - 1, Number(v.day)));
}

function getVietnamDayOfWeek(d: Date = new Date()) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
  }).format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[formatted] ?? 0;
}

const VIETNAM_DAY_NAMES = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function getCurrentMonday(today: Date) {
  const day = today.getUTCDay(); // 0=Sun … 6=Sat
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return addDays(today, -daysSinceMonday);
}

/** Return the Monday that starts the next week (for registration cycle). */
function getNextMonday(today: Date) {
  const cur = getCurrentMonday(today);
  return addDays(cur, 7);
}

function weekLabelFromMonday(monday: Date) {
  const thursday = addDays(monday, 3);
  const weekNum = Math.floor((thursday.getUTCDate() - 1) / 7) + 1;
  return `Tuần ${String(weekNum).padStart(2, '0')} tháng ${thursday.getUTCMonth() + 1} năm ${thursday.getUTCFullYear()}`;
}

function makeError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

/**
 * Backward-compat helper: if a task doc still has the legacy `content` field
 * but no `items`, convert it to the new items[] format.
 */
function normalizeItems(doc: any): ITaskItem[] {
  if (doc.items && doc.items.length > 0) return doc.items;
  if (doc.content) {
    return [{ content: doc.content, deadline: doc.deadline || '' }];
  }
  return [];
}

/* ── Registration status ── */

export async function getRegistrationStatus(user: AuthUser) {
  const now = new Date();
  const today = getVietnamCivilDate(now);
  const dayOfWeek = getVietnamDayOfWeek(now);
  const dayName = VIETNAM_DAY_NAMES[dayOfWeek];
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const currentWeekStart = getCurrentMonday(today);
  const targetWeekStart = getNextMonday(today);
  const weekLabel = weekLabelFromMonday(targetWeekStart);
  const currentWeekLabel = weekLabelFromMonday(currentWeekStart);

  let earlyOpened = false;
  if (!isWeekend) {
    const override = await TaskRegistrationOverride.findOne({ targetWeekStart });
    earlyOpened = Boolean(override);
  }

  const isOpen = isWeekend || earlyOpened;
  const isAdmin = user.role === 'admin';

  return {
    isOpen,
    isWeekend,
    earlyOpened,
    canOpenEarly: isAdmin && !isOpen,
    dayName,
    dayOfWeek,
    targetWeekStart: targetWeekStart.toISOString(),
    weekLabel,
    currentWeekStart: currentWeekStart.toISOString(),
    currentWeekLabel,
  };
}

/* ── Admin: open registration early ── */

export async function openRegistrationEarly(user: AuthUser) {
  if (user.role !== 'admin') {
    throw makeError('Chỉ admin mới có quyền mở sớm đăng ký nhiệm vụ', 403);
  }

  const today = getVietnamCivilDate();
  const targetWeekStart = getNextMonday(today);
  const weekLabel = weekLabelFromMonday(targetWeekStart);

  await TaskRegistrationOverride.findOneAndUpdate(
    { targetWeekStart },
    { openedBy: user.id },
    { upsert: true },
  );

  void writeAuditLog({
    action: 'OPEN_EARLY',
    category: 'task',
    user,
    details: `Mở sớm đăng ký nhiệm vụ ${weekLabel}`,
  });

  return { success: true, weekLabel };
}

/* ── Admin: close registration early (re-lock) ── */

export async function closeRegistrationEarly(user: AuthUser) {
  if (user.role !== 'admin') {
    throw makeError('Chỉ admin mới có quyền khóa đăng ký nhiệm vụ', 403);
  }

  const today = getVietnamCivilDate();
  const targetWeekStart = getNextMonday(today);
  const weekLabel = weekLabelFromMonday(targetWeekStart);

  await TaskRegistrationOverride.deleteOne({ targetWeekStart });

  void writeAuditLog({
    action: 'CLOSE_EARLY',
    category: 'task',
    user,
    details: `Khóa lại đăng ký nhiệm vụ ${weekLabel}`,
  });

  return { success: true, weekLabel };
}

/* ── Guard: ensure registration window is open ── */

async function requireRegistrationOpen(user: AuthUser) {
  const status = await getRegistrationStatus(user);
  if (!status.isOpen && user.role !== 'admin') {
    throw makeError(
      `Chưa đến thời gian đăng ký nhiệm vụ tuần (Thứ Bảy – Chủ Nhật). Hiện tại là ${status.dayName}.`,
      403,
    );
  }
  return status;
}

/* ── Get my task ── */

export async function getMyTask(user: AuthUser, targetWeekStartParam?: string) {
  const targetWeekStart = targetWeekStartParam
    ? new Date(targetWeekStartParam)
    : getNextMonday(getVietnamCivilDate());

  const task = await WeeklyTask.findOne({ userId: user.id, targetWeekStart });
  const taskObj = task ? task.toObject() : null;
  if (taskObj) {
    taskObj.items = normalizeItems(taskObj);
  }
  return {
    task: taskObj,
    weekLabel: weekLabelFromMonday(targetWeekStart),
    targetWeekStart: targetWeekStart.toISOString(),
  };
}

/* ── Upsert task ── */

export interface WeeklyTaskInput {
  items?: { content: string; deadline?: string }[];
  content?: string;
  deadline?: string;
  targetWeekStart?: string;
}

export async function upsertTask(user: AuthUser, input: WeeklyTaskInput) {
  const status = await requireRegistrationOpen(user);

  let rawList = input.items;
  if (!rawList || rawList.length === 0) {
    if (input.content) {
      rawList = [{ content: input.content, deadline: input.deadline || '' }];
    } else {
      rawList = [];
    }
  }

  const items: ITaskItem[] = rawList
    .map((it) => ({ content: (it.content || '').trim(), deadline: (it.deadline || '').trim() }))
    .filter((it) => it.content.length > 0);

  if (items.length === 0) throw makeError('Vui lòng nhập ít nhất một nhiệm vụ', 400);

  const targetWeekStart = input.targetWeekStart
    ? new Date(input.targetWeekStart)
    : new Date(status.targetWeekStart);
  const weekLabel = weekLabelFromMonday(targetWeekStart);

  const task = await WeeklyTask.findOneAndUpdate(
    { userId: user.id, targetWeekStart },
    {
      $set: {
        weekLabel,
        items,
        // Clear legacy fields
        content: undefined,
        deadline: undefined,
      },
      $setOnInsert: { userId: new mongoose.Types.ObjectId(user.id), targetWeekStart },
    },
    { upsert: true, new: true, runValidators: true },
  );

  void writeAuditLog({
    action: 'UPSERT',
    category: 'task',
    user,
    targetType: 'WeeklyTask',
    targetId: task._id.toString(),
    details: `Đăng ký ${items.length} nhiệm vụ ${weekLabel}`,
  });

  return task;
}

/* ── Delete my task ── */

export async function deleteTask(taskId: string, user: AuthUser) {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw makeError('Nhiệm vụ không hợp lệ', 400);
  }

  const task = await WeeklyTask.findById(taskId);
  if (!task) throw makeError('Không tìm thấy nhiệm vụ', 404);

  if (task.userId.toString() !== user.id && user.role !== 'admin') {
    throw makeError('Bạn không có quyền xóa nhiệm vụ này', 403);
  }

  await task.deleteOne();

  void writeAuditLog({
    action: 'DELETE',
    category: 'task',
    user,
    targetType: 'WeeklyTask',
    targetId: taskId,
    details: `Xóa nhiệm vụ ${task.weekLabel}`,
  });

  return { success: true };
}

/* ── List tasks (admin = all staff merged, staff = own) ── */

const VIEW_ALL_ROLES = new Set(['admin', 'department_lead', 'viewer', 'office_clerk']);

export async function listTasks(user: AuthUser, targetWeekStartParam?: string) {
  const targetWeekStart = targetWeekStartParam
    ? new Date(targetWeekStartParam)
    : getNextMonday(getVietnamCivilDate());

  const weekLabel = weekLabelFromMonday(targetWeekStart);

  if (!VIEW_ALL_ROLES.has(user.role)) {
    const task = await WeeklyTask.findOne({ userId: user.id, targetWeekStart })
      .populate('userId', 'fullName username department position');
    return {
      tasks: task ? [task] : [],
      weekLabel,
      targetWeekStart: targetWeekStart.toISOString(),
      totalStaff: 1,
      registeredCount: task ? 1 : 0,
    };
  }

  // For Admin / Department Lead / Viewer:
  // Fetch active staff and merge with existing weekly tasks
  const [activeUsers, existingTasks] = await Promise.all([
    User.find({
      isActive: true,
      role: { $in: ['staff', 'department_lead', 'office_clerk'] },
    })
      .select('fullName username department position role')
      .sort({ createdAt: 1, fullName: 1 }),
    WeeklyTask.find({ targetWeekStart })
      .populate('userId', 'fullName username department position role')
      .sort({ createdAt: 1 }),
  ]);

  const getUserIdString = (t: any): string => {
    if (!t || !t.userId) return '';
    if (typeof t.userId === 'object') {
      return (t.userId._id ?? t.userId).toString();
    }
    return String(t.userId);
  };

  const taskMap = new Map<string, any>();
  for (const t of existingTasks) {
    const uid = getUserIdString(t);
    if (uid) taskMap.set(uid, t);
  }

  const combinedTasks: any[] = [];
  const processedUserIds = new Set<string>();

  for (const u of activeUsers) {
    const uid = (u as any)._id.toString();
    processedUserIds.add(uid);
    const existing = taskMap.get(uid);
    if (existing) {
      const obj = existing.toObject ? existing.toObject() : existing;
      obj.items = normalizeItems(obj);
      combinedTasks.push(obj);
    } else {
      // Unregistered user placeholder
      combinedTasks.push({
        _id: `unregistered_${uid}`,
        userId: u,
        targetWeekStart,
        weekLabel,
        items: [],
        content: '',
        deadline: '',
        isRegistered: false,
      });
    }
  }

  // Also include any user (e.g. admin) who submitted a task but was not in activeUsers
  for (const t of existingTasks) {
    const uid = getUserIdString(t);
    if (uid && !processedUserIds.has(uid)) {
      const obj = t.toObject ? t.toObject() : t;
      obj.items = normalizeItems(obj);
      combinedTasks.push(obj);
    }
  }

  return {
    tasks: combinedTasks,
    weekLabel,
    targetWeekStart: targetWeekStart.toISOString(),
    totalStaff: combinedTasks.length,
    registeredCount: existingTasks.length,
  };
}

/* ── Available weeks (for dropdown) ── */

export async function getAvailableWeeks() {
  const today = getVietnamCivilDate();
  const curMonday = getCurrentMonday(today);
  const nxtMonday = getNextMonday(today);

  const curLabel = weekLabelFromMonday(curMonday);
  const nxtLabel = weekLabelFromMonday(nxtMonday);

  const existingWeeks = await WeeklyTask.aggregate([
    {
      $group: {
        _id: '$targetWeekStart',
        weekLabel: { $first: '$weekLabel' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: 20 },
  ]);

  const map = new Map<string, { targetWeekStart: string; weekLabel: string; taskCount: number }>();

  // Add next week
  map.set(nxtMonday.toISOString(), {
    targetWeekStart: nxtMonday.toISOString(),
    weekLabel: `${nxtLabel} (Tuần sau)`,
    taskCount: 0,
  });

  // Add current week
  map.set(curMonday.toISOString(), {
    targetWeekStart: curMonday.toISOString(),
    weekLabel: `${curLabel} (Tuần này)`,
    taskCount: 0,
  });

  // Merge existing weeks from DB
  for (const w of existingWeeks) {
    const iso = new Date(w._id).toISOString();
    const existing = map.get(iso);
    if (existing) {
      existing.taskCount = w.count;
    } else {
      map.set(iso, {
        targetWeekStart: iso,
        weekLabel: w.weekLabel as string,
        taskCount: w.count as number,
      });
    }
  }

  // Sort descending by date
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.targetWeekStart).getTime() - new Date(a.targetWeekStart).getTime(),
  );
}

/* ── Export Excel (HTML table format) ── */

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mergeItemsContent(items: any[]): string {
  if (!items || items.length === 0) return '';
  return items.map((it: any) => (it.content || '').trim()).filter(Boolean).join('\n');
}

function mergeItemsDeadline(items: any[]): string {
  if (!items || items.length === 0) return '';
  const validItems = items.filter((it: any) => (it.content || '').trim());
  return validItems.map((it: any) => (it.deadline || '').trim()).join('\n');
}

export function buildExcelHtml(tasks: any[], weekLabel: string) {
  const title = `NHIỆM VỤ ${weekLabel.toUpperCase()}`;

  const rows = tasks
    .map((task: any, index: number) => {
      const user = task.userId;
      const fullName = typeof user === 'object' && user ? (user.fullName || '').toUpperCase() : 'N/A';
      const items = normalizeItems(task);
      const contentText = mergeItemsContent(items);
      const deadlineText = mergeItemsDeadline(items);
      const contentHtml = escapeHtml(contentText).replace(/\n/g, '<br>');
      const deadlineHtml = escapeHtml(deadlineText).replace(/\n/g, '<br>');
      return `<tr>
      <td style="text-align:center;vertical-align:top">${index + 1}</td>
      <td style="font-weight:bold;vertical-align:top">${escapeHtml(fullName)}</td>
      <td style="vertical-align:top">${contentHtml}</td>
      <td style="vertical-align:top;text-align:center">${deadlineHtml}</td>
    </tr>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<style>
td,th{border:1px solid #000;padding:6px 8px;font-family:Arial;font-size:11pt}
th{background:#d9e2f3;font-weight:bold}
table{border-collapse:collapse;width:100%}
</style>
</head>
<body>
<table>
<tr><td colspan="4" style="text-align:center;font-weight:bold;font-size:14pt;border:none;padding:12px 0">${escapeHtml(title)}</td></tr>
<tr><td colspan="4" style="border:none"></td></tr>
<tr><th style="width:5%">STT</th><th style="width:20%">HỌ VÀ TÊN</th><th style="width:55%">NHIỆM VỤ TUẦN</th><th style="width:20%">THỜI GIAN HOÀN THÀNH</th></tr>
${rows}
</table>
</body>
</html>`;
}

export async function generateWeeklyTasksExcelFile(tasks: any[], weekLabel: string): Promise<string> {
  const tmpDir = path.resolve(__dirname, '../../tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const fileId = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const outputXlsxPath = path.join(tmpDir, `nhiem_vu_${fileId}.xlsx`);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Nhiệm vụ tuần', {
    views: [{ showGridLines: true }],
    pageSetup: {
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '4:4',
    },
  });

  const FONT_NAME = 'Arial';
  const thinSide = { style: 'thin' as const, color: { argb: 'FF000000' } };
  const cellBorder: any = {
    top: thinSide,
    left: thinSide,
    bottom: thinSide,
    right: thinSide,
  };

  // Column Widths (matching standard: A:8, B:28, C:75, D:25)
  ws.getColumn('A').width = 8;
  ws.getColumn('B').width = 28;
  ws.getColumn('C').width = 75;
  ws.getColumn('D').width = 25;

  // Row 1: Spacing
  ws.getRow(1).height = 8;

  // Row 2: Title
  ws.getRow(2).height = 32;
  ws.mergeCells('A2:D2');
  const titleCell = ws.getCell('A2');
  titleCell.value = `NHIỆM VỤ ${weekLabel.toUpperCase()}`;
  titleCell.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: 'FF000000' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Row 3: Spacer
  ws.getRow(3).height = 12;

  // Row 4: Headers
  ws.getRow(4).height = 28;
  const headers = [
    { cell: 'A4', text: 'STT' },
    { cell: 'B4', text: 'HỌ VÀ TÊN' },
    { cell: 'C4', text: 'NHIỆM VỤ TUẦN' },
    { cell: 'D4', text: 'THỜI GIAN HOÀN THÀNH' },
  ];
  for (const h of headers) {
    const c = ws.getCell(h.cell);
    c.value = h.text;
    c.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FF000000' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F4F8' },
    };
    c.border = cellBorder;
  }

  // Rows 5+: Data rows
  tasks.forEach((task: any, idx: number) => {
    const rowNum = 5 + idx;
    const user = task.userId;
    const fullName = typeof user === 'object' && user ? (user.fullName || '').trim() : String(user || '').trim();
    const items = normalizeItems(task);
    const content = mergeItemsContent(items);
    const deadline = mergeItemsDeadline(items);

    // Cell A: STT
    const cStt = ws.getCell(`A${rowNum}`);
    cStt.value = idx + 1;
    cStt.font = { name: FONT_NAME, size: 11, color: { argb: 'FF000000' } };
    cStt.alignment = { horizontal: 'center', vertical: 'top' };
    cStt.border = cellBorder;

    // Cell B: HỌ VÀ TÊN (Uppercase & Bold)
    const cName = ws.getCell(`B${rowNum}`);
    cName.value = fullName.toUpperCase();
    cName.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FF000000' } };
    cName.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    cName.border = cellBorder;

    // Cell C: NHIỆM VỤ TUẦN (Wrap text)
    const cContent = ws.getCell(`C${rowNum}`);
    cContent.value = content;
    cContent.font = { name: FONT_NAME, size: 11, color: { argb: 'FF000000' } };
    cContent.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    cContent.border = cellBorder;

    // Cell D: THỜI GIAN HOÀN THÀNH
    const cDeadline = ws.getCell(`D${rowNum}`);
    cDeadline.value = deadline;
    cDeadline.font = { name: FONT_NAME, size: 11, color: { argb: 'FF000000' } };
    cDeadline.alignment = { horizontal: 'center', vertical: 'top', wrapText: true };
    cDeadline.border = cellBorder;

    // Row height calculation
    if (content) {
      const lines = content.split('\n');
      const lineCount = lines.length;
      const wrapExtra = lines.reduce((acc: number, line: string) => acc + Math.floor(line.length / 65), 0);
      const totalLines = Math.max(1, lineCount + wrapExtra);
      ws.getRow(rowNum).height = Math.max(24, totalLines * 19 + 6);
    } else {
      ws.getRow(rowNum).height = 24;
    }
  });

  await wb.xlsx.writeFile(outputXlsxPath);
  return outputXlsxPath;
}

