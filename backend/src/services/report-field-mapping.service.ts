import { reportAsHtml } from './report-rich-text';
import { z } from 'zod';
import { createHash } from 'crypto';
import Report from '../models/Report';
import ReportPeriod from '../models/ReportPeriod';
import AuditLog from '../models/AuditLog';
import { FIELDS, fieldCodeSchema, domainError, type FieldReport } from '../domain/fields';
import { projectFieldReports } from './report-fields';
import { withAssignmentLock } from './field-assignment.service';
import type { AuthUser } from '../middleware/auth.middleware';
const revision = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const blockRevision = (items: Array<{ contentFormat?: 'html-v1'; fieldCode?: string | null; fieldName?: string; content: string; difficulties: string; proposals: string; nextTasks: string }>) => revision(items.map((row) => ({ contentFormat: row.contentFormat, fieldCode: row.fieldCode || null, fieldName: row.fieldName, content: row.content, difficulties: row.difficulties, proposals: row.proposals, nextTasks: row.nextTasks })));

export async function getReportMapping(reportId: string) {
  const report = await Report.findById(reportId).lean();
  if (!report || report.reportType !== 'weekly') throw domainError('Không tìm thấy báo cáo tuần.', 404);
  const base = report.fieldReports?.length ? report.fieldReports : [{ contentFormat: report.contentFormat, fieldName: report.field || 'Chưa xác định', content: report.content || '', difficulties: report.difficulties || '', proposals: report.proposals || '', nextTasks: report.nextTasks || '' }];
  const blocks = base.map((field) => ({ ...field, fieldCode: 'fieldCode' in field ? field.fieldCode : null }));
  if (!report.fieldReports?.length) {
    if (report.administrativeReform?.trim()) blocks.push({ fieldCode: null, fieldName: 'Mục cải cách hành chính nguồn', content: report.administrativeReform, difficulties: '', proposals: '', nextTasks: '' });
    if (report.digitalTransformation?.trim()) blocks.push({ fieldCode: null, fieldName: 'Mục chuyển đổi số nguồn', content: report.digitalTransformation, difficulties: '', proposals: '', nextTasks: '' });
  }
  return { reportId, sender: report.sender, blocks, fields: FIELDS, revision: blockRevision(blocks) };
}

export async function updateReportMapping(reportId: string, value: unknown, actor: AuthUser, expectedRevision: unknown) {
  if (actor.role !== 'admin') throw domainError('Chỉ admin được đối soát mã lĩnh vực.', 403);
  const parsed = z.array(fieldCodeSchema).min(1).max(10).safeParse(value);
  if (!parsed.success) throw domainError('Chọn mã hợp lệ cho từng phần nội dung nguồn.');
  const source = await getReportMapping(reportId);
  if (expectedRevision !== source.revision) throw domainError('Nguồn đã thay đổi. Vui lòng tải lại phần đối soát.', 409);
  if (source.blocks.length !== parsed.data.length) throw domainError('Nguồn đã thay đổi. Vui lòng tải lại.', 409);
  return withAssignmentLock(async (session) => {
    const report = await Report.findById(reportId).session(session);
    if (!report) throw domainError('Không tìm thấy báo cáo.', 404);
    const period = await ReportPeriod.findById(report.periodId).session(session);
    if (period?.status === 'archived') throw domainError('Kỳ đã lưu trữ, không thể đối soát thay đổi.', 409);
    if (period) {
      const periodWrite = await ReportPeriod.updateOne({ _id: period._id, status: { $ne: 'archived' } }, { $inc: { __v: 1 } }, { session });
      if (!periodWrite.modifiedCount) throw domainError('Kỳ vừa được lưu trữ. Vui lòng tải lại.', 409);
    }
    // Ensure a concurrent edit cannot replace text between preview and save.
    const currentBlocks = report.fieldReports?.length ? report.fieldReports : [{ contentFormat: report.contentFormat, fieldName: report.field || 'Chưa xác định', content: report.content || '', difficulties: report.difficulties || '', proposals: report.proposals || '', nextTasks: report.nextTasks || '' },
      ...(report.administrativeReform?.trim() ? [{ fieldName: 'Mục cải cách hành chính nguồn', content: report.administrativeReform, difficulties: '', proposals: '', nextTasks: '' }] : []),
      ...(report.digitalTransformation?.trim() ? [{ fieldName: 'Mục chuyển đổi số nguồn', content: report.digitalTransformation, difficulties: '', proposals: '', nextTasks: '' }] : [])];
    if (blockRevision(currentBlocks) !== source.revision) throw domainError('Nội dung hoặc mã nguồn đã thay đổi. Vui lòng tải lại.', 409);
    const fields: FieldReport[] = FIELDS.flatMap((field) => {
      const blocks = source.blocks.filter((_block, index) => parsed.data[index] === field.code);
      if (!blocks.length) return [];
      const html = blocks.some((block) => block.contentFormat === 'html-v1');
      const combine = (key: 'content' | 'difficulties' | 'proposals' | 'nextTasks') => blocks.map((block) => html ? reportAsHtml(block[key], block.contentFormat) : block[key]).filter((text) => text.trim()).join(html ? '' : '\n\n');
      return [{ ...(html ? { contentFormat: 'html-v1' as const } : {}), fieldCode: field.code, fieldName: field.title, content: combine('content'), difficulties: combine('difficulties'), proposals: combine('proposals'), nextTasks: combine('nextTasks') }];
    });
    await AuditLog.create([{ action: 'REPORT_FIELD_MAPPING', category: 'report', userId: actor.id, username: actor.username, fullName: actor.fullName, targetType: 'Report', targetId: reportId, details: JSON.stringify({ before: { label: report.field, codes: report.fieldReports?.map((row) => row.fieldCode) || [] }, after: parsed.data }) }], { session });
    report.fieldReports = fields;
    Object.assign(report, projectFieldReports(fields));
    await report.save({ session });
    return { mapped: true };
  });
}
