import { z } from 'zod';

export const FIELDS = [
  { code: 'LV1', title: 'Lĩnh vực Nội vụ và công tác cán bộ', groupId: 'personnel' },
  { code: 'LV2', title: 'Giáo dục và đào tạo', groupId: 'education' },
  { code: 'LV3', title: 'Bảo trợ xã hội và bảo hiểm y tế', groupId: 'social' },
  { code: 'LV4', title: 'Y tế', groupId: 'health' },
  { code: 'LV5', title: 'Người có công', groupId: 'veterans' },
  { code: 'LV6', title: 'Tổ chức bộ máy, công tác cán bộ và cải cách hành chính', groupId: 'administration' },
  { code: 'LV7', title: 'Khoa học, công nghệ và chuyển đổi số', groupId: 'digital' },
  { code: 'LV8', title: 'Văn hóa và các lĩnh vực liên quan', groupId: 'culture' },
] as const;
export const fieldCodeSchema = z.enum(['LV1', 'LV2', 'LV3', 'LV4', 'LV5', 'LV6', 'LV7', 'LV8']);
export type FieldCode = z.infer<typeof fieldCodeSchema>;
export const fieldCodesSchema = z.array(fieldCodeSchema).max(8).refine((codes) => new Set(codes).size === codes.length);
export const fieldReportSchema = z.object({
  contentFormat: z.literal('html-v1').optional(),
  fieldCode: fieldCodeSchema,
  content: z.string().max(200000), difficulties: z.string().max(200000),
  proposals: z.string().max(200000), nextTasks: z.string().max(200000),
});
export type FieldReport = z.infer<typeof fieldReportSchema> & { fieldName?: string };
export function domainError(message: string, statusCode = 400, code = 'FIELD_VALIDATION_FAILED') {
  return Object.assign(new Error(message), { statusCode, code });
}
export const FIELD_CONFLICT_MESSAGE = 'Lĩnh vực này đã có người khác đảm nhận. Vui lòng liên hệ admin để xử lý.';
