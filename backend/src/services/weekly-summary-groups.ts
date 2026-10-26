import { z } from 'zod';

export const WEEKLY_GROUPS = [
  { id: 'personnel', title: 'Lĩnh vực Nội vụ và công tác cán bộ', aliases: ['Nội vụ', 'Công tác cán bộ', 'Nội vụ và công tác cán bộ', 'Nội vụ - Công tác cán bộ'] },
  { id: 'education', title: 'Giáo dục và đào tạo', aliases: ['Giáo dục', 'Giáo dục đào tạo'] },
  { id: 'social', title: 'Bảo trợ xã hội và bảo hiểm y tế', aliases: ['Bảo trợ xã hội', 'Bảo hiểm y tế', 'BHYT', 'An sinh xã hội'] },
  { id: 'health', title: 'Y tế và an toàn thực phẩm', aliases: ['Y tế', 'An toàn thực phẩm'] },
  { id: 'veterans', title: 'Người có công', aliases: [] },
  { id: 'administration', title: 'Tổ chức bộ máy, công tác cán bộ và cải cách hành chính', aliases: ['Cải cách hành chính', 'Tổ chức bộ máy'] },
  { id: 'digital', title: 'Khoa học, công nghệ và chuyển đổi số', aliases: ['Chuyển đổi số', 'Khoa học công nghệ', 'Khoa học và công nghệ'] },
  { id: 'culture', title: 'Văn hóa và các lĩnh vực liên quan', aliases: ['Văn hóa', 'Văn hóa thông tin', 'Tín ngưỡng tôn giáo'] },
] as const;

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
}>): SummaryEntry[] {
  return reports.flatMap((report) => {
    const sourceReportId = report._id.toString();
    const groupId = resolveWeeklyGroup(report.field || '');
    return [
      { id: `${sourceReportId}-results`, sourceReportId, groupId, section: 'results' as const, text: report.content },
      { id: `${sourceReportId}-nextTasks`, sourceReportId, groupId, section: 'nextTasks' as const, text: report.nextTasks || '' },
      { id: `${sourceReportId}-administration`, sourceReportId, groupId: 'administration', section: 'results' as const, text: report.administrativeReform || '' },
      { id: `${sourceReportId}-digital`, sourceReportId, groupId: 'digital', section: 'results' as const, text: report.digitalTransformation || '' },
    ].filter((entry) => entry.text.trim());
  });
}
