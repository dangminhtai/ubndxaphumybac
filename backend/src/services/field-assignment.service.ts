import mongoose, { type ClientSession } from 'mongoose';
import User from '../models/User';
import Lock from '../models/FieldAssignmentLock';
import AuditLog from '../models/AuditLog';
import { FIELDS, fieldCodesSchema, domainError, FIELD_CONFLICT_MESSAGE } from '../domain/fields';
import type { AuthUser } from '../middleware/auth.middleware';

export async function withAssignmentLock<T>(action: (session: ClientSession) => Promise<T>): Promise<T> {
  try { await Lock.updateOne({ _id: 'assignments' }, { $setOnInsert: { revision: 0 } }, { upsert: true }); }
  catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      await Lock.updateOne({ _id: 'assignments' }, { $inc: { revision: 1 } }, { session });
      return action(session);
    }) as T;
  } finally { await session.endSession(); }
}

export function parseFieldCodes(value: unknown, role: string, active = true) {
  const parsed = fieldCodesSchema.safeParse(value);
  if (!parsed.success) throw domainError('Mã lĩnh vực không hợp lệ hoặc bị trùng.');
  if (role === 'staff' && active && parsed.data.length === 0) throw domainError('Chuyên viên phải có ít nhất một lĩnh vực.');
  return role === 'staff' ? parsed.data.sort((left, right) => FIELDS.findIndex((field) => field.code === left) - FIELDS.findIndex((field) => field.code === right)) : [];
}

export async function assertFieldsAvailable(userId: string, role: string, active: boolean, codes: string[], session: ClientSession) {
  if (role !== 'staff' || !active || !codes.length) return;
  const conflicts = await User.find({ _id: { $ne: userId }, role: 'staff', isActive: true, fieldCodes: { $in: codes } }).session(session).select('_id');
  if (conflicts.length) throw domainError(FIELD_CONFLICT_MESSAGE, 409, 'FIELD_ALREADY_ASSIGNED');
}

export async function assignmentAudit(session: ClientSession, actor: AuthUser | undefined, targetId: string, before: unknown, after: unknown) {
  await AuditLog.create([{
    action: 'FIELD_ASSIGNMENT', category: 'user', userId: actor?.id, username: actor?.username,
    fullName: actor?.fullName, targetType: 'User', targetId,
    details: JSON.stringify({ before, after }),
  }], { session });
}

export async function getFieldDirectory() {
  const users = await User.find({ role: 'staff', isActive: true }).select('_id fullName username fieldCodes').lean();
  return FIELDS.map((field) => ({ ...field, owners: users.filter((user) => user.fieldCodes?.includes(field.code)).map((user) => ({ id: String(user._id), fullName: user.fullName, username: user.username })) }));
}

export async function assignMyFields(actor: AuthUser, value: unknown) {
  return withAssignmentLock(async (session) => {
    const user = await User.findById(actor.id).session(session);
    if (!user || user.role !== 'staff' || !user.isActive) throw domainError('Chỉ chuyên viên đang hoạt động được chọn lĩnh vực.', 403);
    const codes = parseFieldCodes(value, user.role);
    await assertFieldsAvailable(actor.id, user.role, true, codes, session);
    const before = [...user.fieldCodes];
    user.fieldCodes = codes;
    await user.save({ session });
    await assignmentAudit(session, actor, actor.id, before, codes);
    return { fieldCodes: codes };
  });
}

export async function assignStaffBatch(actor: AuthUser, assignments: unknown) {
  if (actor.role !== 'admin') throw domainError('Chỉ admin được điều chỉnh phân công.', 403);
  if (!Array.isArray(assignments) || assignments.length > 200) throw domainError('Danh sách phân công không hợp lệ.');
  return withAssignmentLock(async (session) => {
    const users = await User.find({ role: 'staff', isActive: true }).session(session);
    const requested = new Map<string, string[]>();
    for (const row of assignments) {
      if (!row || typeof row.userId !== 'string' || requested.has(row.userId)) throw domainError('Tài khoản phân công không hợp lệ hoặc bị trùng.');
      if (!users.some((user) => String(user._id) === row.userId)) throw domainError('Tài khoản phân công không còn là chuyên viên đang hoạt động.', 409);
      requested.set(row.userId, parseFieldCodes(row.fieldCodes, 'staff'));
    }
    const owner = new Map<string, string>();
    for (const user of users) {
      let codes: string[];
      try { codes = requested.get(String(user._id)) || parseFieldCodes(user.fieldCodes, 'staff'); }
      catch { throw domainError(`${user.fullName}: chuyên viên phải có ít nhất một lĩnh vực hợp lệ.`); }
      for (const code of codes) {
        if (owner.has(code)) throw domainError(FIELD_CONFLICT_MESSAGE, 409, 'FIELD_ALREADY_ASSIGNED');
        owner.set(code, String(user._id));
      }
    }
    for (const user of users) {
      const codes = requested.get(String(user._id));
      if (!codes) continue;
      const before = [...user.fieldCodes];
      user.fieldCodes = codes as typeof user.fieldCodes;
      await user.save({ session });
      await assignmentAudit(session, actor, String(user._id), before, codes);
    }
    return { updated: requested.size };
  });
}
