import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { spawn } from 'child_process';
import mongoose from 'mongoose';
import { WeeklyTask, TaskRegistrationOverride } from '../models/WeeklyTask';
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
  return {
    task,
    weekLabel: weekLabelFromMonday(targetWeekStart),
    targetWeekStart: targetWeekStart.toISOString(),
  };
}

/* ── Upsert task ── */

export interface WeeklyTaskInput {
  content: string;
  deadline?: string;
  targetWeekStart?: string;
}

export async function upsertTask(user: AuthUser, input: WeeklyTaskInput) {
  const status = await requireRegistrationOpen(user);

  const content = input.content?.trim();
  if (!content) throw makeError('Vui lòng nhập nhiệm vụ tuần', 400);

  const targetWeekStart = input.targetWeekStart
    ? new Date(input.targetWeekStart)
    : new Date(status.targetWeekStart);
  const weekLabel = weekLabelFromMonday(targetWeekStart);

  const task = await WeeklyTask.findOneAndUpdate(
    { userId: user.id, targetWeekStart },
    {
      $set: {
        weekLabel,
        content,
        deadline: input.deadline?.trim() || '',
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
    details: `Đăng ký nhiệm vụ ${weekLabel}`,
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
      combinedTasks.push(existing);
    } else {
      // Unregistered user placeholder
      combinedTasks.push({
        _id: `unregistered_${uid}`,
        userId: u,
        targetWeekStart,
        weekLabel,
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
      combinedTasks.push(t);
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

export function buildExcelHtml(tasks: any[], weekLabel: string) {
  const title = `NHIỆM VỤ ${weekLabel.toUpperCase()}`;

  const rows = tasks
    .map((task: any, index: number) => {
      const user = task.userId;
      const fullName = typeof user === 'object' && user ? (user.fullName || '').toUpperCase() : 'N/A';
      const contentHtml = escapeHtml(task.content || '').replace(/\n/g, '<br>');
      const deadline = escapeHtml(task.deadline || '');
      return `<tr>
      <td style="text-align:center;vertical-align:top">${index + 1}</td>
      <td style="font-weight:bold;vertical-align:top">${escapeHtml(fullName)}</td>
      <td style="vertical-align:top">${contentHtml}</td>
      <td style="vertical-align:top;text-align:center">${deadline}</td>
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
  const scriptPath = path.resolve(__dirname, '../scripts/generate_weekly_tasks_excel.py');
  const tmpDir = path.resolve(__dirname, '../../tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const fileId = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const inputJsonPath = path.join(tmpDir, `payload_${fileId}.json`);
  const outputXlsxPath = path.join(tmpDir, `nhiem_vu_${fileId}.xlsx`);

  const payload = {
    weekLabel,
    tasks: tasks.map((t) => ({
      userId: {
        fullName: typeof t.userId === 'object' && t.userId ? t.userId.fullName : 'N/A',
      },
      content: t.content || '',
      deadline: t.deadline || '',
      isRegistered: t.isRegistered !== false && Boolean(t.content),
    })),
  };

  fs.writeFileSync(inputJsonPath, JSON.stringify(payload), 'utf-8');

  return new Promise<string>((resolve, reject) => {
    const child = spawn('python', [scriptPath, inputJsonPath, outputXlsxPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('close', (code) => {
      // Clean up input json
      try {
        fs.unlinkSync(inputJsonPath);
      } catch {
        /* ignore */
      }

      if (code === 0 && fs.existsSync(outputXlsxPath)) {
        resolve(outputXlsxPath);
      } else {
        reject(new Error(`Không tạo được file Excel: ${stderr}`));
      }
    });
  });
}

