import { z } from 'zod';
import { FIELDS, fieldReportSchema, domainError, type FieldReport } from '../domain/fields';
import { normalizeReportText, reportAsHtml, escapeReportText } from './report-rich-text';

export function snapshotFieldReports(value: unknown, assignedCodes: string[], status: string): FieldReport[] {
  const parsed = z.array(fieldReportSchema).min(1).max(8).safeParse(value);
  if (!parsed.success) throw domainError('Nội dung báo cáo cho từng lĩnh vực đã phân công không hợp lệ.', 400, 'REPORT_FIELD_REQUIRED');
  for (const field of parsed.data) {
    for (const key of ['content', 'difficulties', 'proposals', 'nextTasks'] as const) field[key] = normalizeReportText(field[key], field.contentFormat);
  }
  const codes = parsed.data.map((field) => field.fieldCode);
  if (new Set(codes).size !== codes.length) throw domainError('Mã lĩnh vực trong báo cáo bị trùng.');
  if (codes.length !== assignedCodes.length || codes.some((code) => !assignedCodes.includes(code))) {
    throw domainError('Phân công lĩnh vực đã thay đổi. Vui lòng tải lại báo cáo trước khi lưu/nộp.', 409, 'REPORT_ASSIGNMENT_CHANGED');
  }
  if (status === 'pending' && parsed.data.some((field) => !field.content.trim())) throw domainError('Nhập kết quả thực hiện cho từng lĩnh vực trước khi nộp.');
  return FIELDS.flatMap((field) => {
    const source = parsed.data.find((item) => item.fieldCode === field.code);
    return source ? [{ ...source, fieldName: field.title }] : [];
  });
}

export function projectFieldReports(fields: FieldReport[]) {
  const html = fields.some((field) => field.contentFormat === 'html-v1');
  const combine = (key: 'content' | 'difficulties' | 'proposals' | 'nextTasks') => fields
    .filter((field) => field[key].trim())
    .map((field) => html
      ? `${fields.length > 1 ? `<p><strong>${escapeReportText(field.fieldName || field.fieldCode)}</strong></p>` : ''}${reportAsHtml(field[key], field.contentFormat)}`
      : fields.length === 1 ? field[key] : `**${field.fieldName}**\n${field[key]}`).join(html ? '' : '\n\n');
  return {
    contentFormat: html ? 'html-v1' as const : undefined,
    field: fields.map((field) => field.fieldName).join('; '),
    content: combine('content'), difficulties: combine('difficulties'),
    proposals: combine('proposals'), nextTasks: combine('nextTasks'),
  };
}
