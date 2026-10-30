import { z } from 'zod';
import { FIELDS, type FieldReport } from '../domain/fields';

const LEGACY_ALIASES: Record<string, readonly string[]> = {
  LV1: ['Nội vụ', 'Công tác cán bộ', 'Nội vụ và công tác cán bộ', 'Nội vụ - Công tác cán bộ'],
  LV2: ['Giáo dục', 'Giáo dục đào tạo'],
  LV3: ['Bảo trợ xã hội', 'Bảo hiểm y tế', 'BHYT', 'An sinh xã hội'],
  LV4: ['Y tế', 'An toàn thực phẩm'], LV5: [],
  LV6: ['Cải cách hành chính', 'Tổ chức bộ máy'],
  LV7: ['Chuyển đổi số', 'Khoa học công nghệ', 'Khoa học và công nghệ'],
  LV8: ['Văn hóa', 'Văn hóa thông tin', 'Tín ngưỡng tôn giáo'],
};
export const WEEKLY_GROUPS = FIELDS.map((field) => ({ id: field.groupId, title: field.title, aliases: LEGACY_ALIASES[field.code] || [] }));

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function resolveWeeklyGroup(field: string) {
  const value = normalize(field);
  const matches = WEEKLY_GROUPS.filter((group) => [group.id, group.title, ...group.aliases].some((alias) => normalize(alias) === value));
  return matches.length === 1 ? matches[0].id : null;
}

export const summaryEntrySchema = z.object({
  id: z.string().min(1).max(120),
  sourceReportId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  groupId: z.string().refine((id) => WEEKLY_GROUPS.some((group) => group.id === id)).nullable(),
  section: z.enum(['results', 'nextTasks']),
  text: z.string().max(200000),
}).strict();
export const summaryEntriesSchema = z.array(summaryEntrySchema).max(2000).refine((entries) => new Set(entries.map((entry) => entry.id)).size === entries.length, 'ID nội dung bị trùng');
export type SummaryEntry = z.infer<typeof summaryEntrySchema>;

/** Keep the text fields used by archive/legacy readers in sync with the editor. */
export function combineWeeklyEntries(entries: SummaryEntry[], section: SummaryEntry['section']) {
  const blocks = WEEKLY_GROUPS.map((group, index) => {
    const items = entries.filter((entry) => entry.section === section && entry.groupId === group.id && entry.text.trim());
    return items.length ? `**${index + 1}. ${group.title}**\n${items.map((entry) => entry.text).join('\n\n')}` : '';
  });
  const unassigned = entries.filter((entry) => entry.section === section && !entry.groupId && entry.text.trim());
  if (unassigned.length) blocks.push(`**Chưa phân nhóm**\n${unassigned.map((entry) => entry.text).join('\n\n')}`);
  return blocks.filter(Boolean).join('\n\n');
}

export function buildWeeklyEntries(reports: Array<{
  _id: { toString(): string }; field?: string; content: string; nextTasks?: string;
  administrativeReform?: string; digitalTransformation?: string;
  fieldReports?: FieldReport[];
}>): SummaryEntry[] {
  return reports.flatMap((report) => {
    const sourceReportId = report._id.toString();
    return (report.fieldReports || []).flatMap((field) => {
      const group = FIELDS.find((item) => item.code === field.fieldCode);
      if (!group) return [];
      return [
        { id: `${sourceReportId}-${field.fieldCode}-results`, sourceReportId, groupId: group.groupId, section: 'results' as const, text: field.content },
        { id: `${sourceReportId}-${field.fieldCode}-nextTasks`, sourceReportId, groupId: group.groupId, section: 'nextTasks' as const, text: field.nextTasks || '' },
      ].filter((entry) => entry.text.trim());
    });
  });
}

export function inspectWeeklyFieldSources(reports: Array<{ _id: { toString(): string }; fieldReports?: FieldReport[] }>) {
  const issues: Array<{ reportId: string; code: string; fieldCode?: string }> = [];
  const owners = new Map<string, string>();
  for (const report of reports) {
    const reportId = String(report._id);
    if (!report.fieldReports?.length) { issues.push({ reportId, code: 'MISSING_FIELD_CODE' }); continue; }
    for (const field of report.fieldReports) {
      if (!FIELDS.some((item) => item.code === field.fieldCode)) { issues.push({ reportId, code: 'INVALID_FIELD_CODE' }); continue; }
      if (owners.has(field.fieldCode)) issues.push({ reportId, fieldCode: field.fieldCode, code: 'DUPLICATE_FIELD_SOURCE' });
      owners.set(field.fieldCode, reportId);
    }
  }
  return issues;
}
