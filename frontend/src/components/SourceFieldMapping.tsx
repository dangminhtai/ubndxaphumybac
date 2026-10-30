import { ReportRichTextView } from './ReportRichTextEditor';
import { useState } from 'react';
import { apiClient } from '../api/client';
import { formatApiError } from '../utils/apiError';
import type { FieldDefinition, FieldReport } from '../api/fieldsApi';

interface Preview { blocks: Array<Omit<FieldReport, 'fieldCode'> & { fieldCode: string | null }>; fields: FieldDefinition[]; revision: string }
export default function SourceFieldMapping({ reportId, readOnly, onSaved }: { reportId: string; readOnly: boolean; onSaved: () => Promise<void> }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function open() {
    setBusy(true); setError('');
    try { const data = (await apiClient.get<Preview>(`/reports/${reportId}/field-mapping`)).data; setPreview(data); setCodes(data.blocks.map((block) => block.fieldCode || '')); }
    catch (err) { setError(formatApiError(err, 'Không tải được nguồn đối soát.')); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!preview || !window.confirm('Xác nhận mã lĩnh vực cho nội dung nguồn? Nội dung chữ được giữ nguyên.')) return;
    setBusy(true); setError('');
    try { await apiClient.patch(`/reports/${reportId}/field-mapping`, { fieldCodes: codes, revision: preview.revision }); setPreview(null); await onSaved(); }
    catch (err) { setError(formatApiError(err, 'Không lưu được mã lĩnh vực.')); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 space-y-2">
    <button type="button" disabled={busy || readOnly} className="text-xs text-primary underline disabled:opacity-50" onClick={() => void open()}>Đối soát mã lĩnh vực nguồn</button>
    {error && <p role="alert" className="text-xs text-error">{error}</p>}
    {preview && <div className="space-y-3 rounded-lg border border-outline-variant bg-white p-3">
      {preview.blocks.map((block, index) => <div key={index} className="space-y-2">
        <p className="text-xs font-semibold">{preview.fields.find((field) => field.code === block.fieldCode)?.title || block.fieldName || `Phần nguồn ${index + 1}`}</p>
        <div className="max-h-48 overflow-auto">{(['content', 'difficulties', 'proposals', 'nextTasks'] as const).map((key) => <ReportRichTextView key={key} value={block[key]} format={block.contentFormat} />)}</div>
        <select aria-label={`Mã lĩnh vực nguồn ${index + 1}`} disabled={busy} value={codes[index]} onChange={(event) => setCodes((current) => current.map((code, i) => i === index ? event.target.value : code))} className="w-full min-w-0 rounded border border-outline-variant p-2 text-xs">
          <option value="">Chọn mã sau khi đối chiếu</option>
          {preview.fields.map((field) => <option key={field.code} value={field.code}>{field.code} — {field.title}</option>)}
        </select>
      </div>)}
      <div className="flex gap-3 text-xs"><button type="button" disabled={busy || codes.some((code) => !code)} onClick={() => void save()} className="text-primary underline">Xác nhận mã nguồn</button><button type="button" onClick={() => setPreview(null)}>Đóng</button></div>
    </div>}
  </div>;
}
