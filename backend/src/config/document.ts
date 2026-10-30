import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const text = z.string().trim().min(1).max(500);
const schema = z.object({
  parentAgency: text, agency: text, agencyDisplayName: text, documentCode: text,
  place: text, addressee: text, closingAddressee: text.optional(), recipients: z.array(text).min(1).max(30),
  signerTitle: text, signerName: text,
}).strict();

/** Shared document configuration. An override is an entire validated JSON file. */
export function getDocumentConfig() {
  const candidates = [
    process.env.DOCUMENT_CONFIG_PATH,
    path.resolve(process.cwd(), 'src/config/document-defaults.json'),
    path.resolve(process.cwd(), 'backend/src/config/document-defaults.json'),
    path.resolve(__dirname, 'document-defaults.json'),
  ].filter((value): value is string => Boolean(value));
  const file = process.env.DOCUMENT_CONFIG_PATH || candidates.find((candidate) => fs.existsSync(candidate));
  if (!file) throw new Error('Không tìm thấy cấu hình văn bản chung');
  return schema.parse(JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')));
}
