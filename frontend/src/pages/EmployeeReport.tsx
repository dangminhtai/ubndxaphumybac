import { useEffect, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { createWeeklyReport, exportWeeklyReportDocxById, getCurrentWeeklyReport, recallReport } from '../api/reportApi';
import { getFields, saveMyFields, type FieldDefinition, type FieldReport } from '../api/fieldsApi';
import { formatApiError } from '../utils/apiError';
import { weeklyLabel } from '../utils/weeklyLabel';
import type { Report, ReportPeriod, WeeklyReportPayload } from '../types/report';

const blank = (fieldCode: string): FieldReport => ({ fieldCode, content: '', difficulties: '', proposals: '', nextTasks: '' });
const sections = [ ['content', '1. Kết quả thực hiện'], ['nextTasks', '2. Phương hướng, nhiệm vụ tuần tới'] ] as const;

export default function EmployeeReport() {
  const [period, setPeriod] = useState<ReportPeriod | null>(null);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [values, setValues] = useState<FieldReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAssignment, setShowAssignment] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const readOnly = Boolean(report && report.status !== 'draft');
  const legacy = Boolean(report && !report.fieldReports?.length);
  const changedAssignment = !readOnly && (values.length !== assigned.length || values.some((row) => !assigned.includes(row.fieldCode)));
  const disabled = busy || loading || readOnly || legacy || changedAssignment || !assigned.length;
  const title = period ? weeklyLabel(period.startDate) : 'Báo cáo tuần';

  async function load() {
    setLoading(true);
    try {
      const [data, directory] = await Promise.all([getCurrentWeeklyReport(), getFields()]);
      setPeriod(data.period); setFields(directory); setAssigned(data.assignedFieldCodes); setSelected(data.assignedFieldCodes);
      setReport(data.report);
      setValues(data.report?.fieldReports?.length ? data.report.fieldReports : data.assignedFieldCodes.map(blank));
    } catch (err) { setError(formatApiError(err, 'Không tải được báo cáo.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function save(status: 'draft' | 'pending') {
    if (!period || disabled) return null;
    setBusy(true); setError('');
    try {
      const payload: WeeklyReportPayload = {
        periodId: period._id, period: title, reportTitle: `BÁO CÁO CÔNG TÁC ${title.toUpperCase()}`,
        startDate: period.startDate.slice(0, 10), endDate: period.dueDate.slice(0, 10), dueDate: period.dueDate,
        nextPeriod: weeklyLabel(period.startDate, 1), sender: '', department: '', field: '', content: '', fieldReports: values, status,
      };
      const saved = await createWeeklyReport(payload);
      setReport(saved); setValues(saved.fieldReports || values);
      setMessage(status === 'draft' ? 'Đã lưu nháp' : 'Đã nộp báo cáo');
      return saved;
    } catch (err) { setError(formatApiError(err, 'Không lưu được báo cáo.')); return null; }
    finally { setBusy(false); }
  }
  async function exportWord() {
    const saved = readOnly ? report : await save('draft');
    if (!saved) return;
    setBusy(true); setError('');
    try {
      const blob = await exportWeeklyReportDocxById(saved._id);
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `bao-cao-${title.replace(/\s/g, '-')}.docx`; link.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(formatApiError(err, 'Không xuất được Word.')); }
    finally { setBusy(false); }
  }
  async function changeFields() {
    setBusy(true); setError('');
    try {
      await saveMyFields(selected);
      setMessage('Đã cập nhật lĩnh vực.'); setShowAssignment(false);
      // Keep current unsaved report text; synchronize explicitly if the assignment changed.
      const directory = await getFields(); setFields(directory); setAssigned([...selected]);
    } catch (err) { setError(formatApiError(err, 'Không đổi được lĩnh vực.')); }
    finally { setBusy(false); }
  }

  return <AppLayout title={`Nhập báo cáo - ${title}`} subtitle="Kết quả thực hiện và phương hướng, nhiệm vụ tuần tới cho từng lĩnh vực được phân công."
    actions={<div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled} onClick={() => void save('draft')} className="rounded-lg border border-outline-variant px-4 py-2 disabled:opacity-50">Lưu nháp</button>
      <button type="button" disabled={busy || loading || (!readOnly && disabled)} onClick={() => void exportWord()} className="rounded-lg border border-outline-variant px-4 py-2 disabled:opacity-50">Xuất Word</button>
      <button type="button" disabled={disabled} onClick={() => { if (window.confirm('Nộp báo cáo tuần cho tất cả lĩnh vực đang hiển thị?')) void save('pending'); }} className="rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-50">Nộp báo cáo</button>
    </div>}>
    <div className="mx-auto max-w-4xl space-y-5 pb-8">
      {error && <div role="alert" className="rounded-lg bg-error-container p-4 text-error">{error}</div>}
      {message && <p role="status" className="text-emerald-700">{message}</p>}
      {loading && <p>Đang tải báo cáo…</p>}
      <section className="space-y-3 rounded-xl border border-outline-variant bg-white p-4">
        <h2 className="font-semibold">Lĩnh vực phụ trách</h2>
        <p>{assigned.map((code) => fields.find((field) => field.code === code)?.title || code).join('; ') || 'Chưa được gán lĩnh vực. Liên hệ admin hoặc chọn lĩnh vực chưa có người đảm nhận.'}</p>
        <button type="button" disabled={busy || loading} className="text-sm text-primary underline" onClick={() => setShowAssignment(!showAssignment)}>Thay đổi lĩnh vực</button>
        {showAssignment && <div className="space-y-3">
          {fields.map((field) => <label key={field.code} className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(field.code)} disabled={busy} onChange={(event) => {
              setSelected((current) => event.target.checked ? [...current, field.code] : current.filter((code) => code !== field.code));
              setError(event.target.checked && !assigned.includes(field.code) && field.owners.length ? 'Lĩnh vực này đã có người khác đảm nhận. Vui lòng liên hệ admin để xử lý.' : '');
            }} />
            <span>{field.code} — {field.title}{field.owners.length > 0 && <span className="block text-xs text-on-surface-variant">Đang phụ trách: {field.owners.map((owner) => owner.fullName).join(', ')}</span>}</span>
          </label>)}
          <button type="button" disabled={busy} onClick={() => void changeFields()} className="rounded-lg bg-primary px-3 py-2 text-sm text-white">Lưu phân công</button>
        </div>}
      </section>
      {legacy && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
        Báo cáo này chưa được xác định mã lĩnh vực. Liên hệ admin để đối soát, không ghi đè nội dung hiện có.
        <pre className="mt-2 whitespace-pre-wrap">{report?.field}{'\n'}{report?.content}{'\n'}{report?.nextTasks}</pre>
      </div>}
      {changedAssignment && !legacy && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
        Phân công đã thay đổi. Sao chép nội dung thuộc lĩnh vực cũ cần giữ trước khi cập nhật bản nháp.
        <button type="button" className="mt-2 block text-primary underline" onClick={() => {
          if (window.confirm('Cập nhật bản nháp theo phân công mới? Nội dung lĩnh vực không còn phụ trách sẽ bỏ khỏi bản nháp khi lưu.')) setValues(assigned.map((code) => values.find((row) => row.fieldCode === code) || blank(code)));
        }}>Cập nhật bản nháp theo phân công mới</button>
      </div>}
      {!legacy && values.map((row) => <section key={row.fieldCode} className="space-y-5 rounded-xl border border-outline-variant bg-white p-4 md:p-6">
        <h2 className="font-semibold text-primary">{row.fieldName || fields.find((field) => field.code === row.fieldCode)?.title || row.fieldCode}</h2>
        {sections.map(([key, label]) => <div key={key}>
          <label htmlFor={`${row.fieldCode}-${key}`} className="mb-2 block text-sm font-semibold">{label}</label>
          <textarea id={`${row.fieldCode}-${key}`} aria-label={`${row.fieldCode} - ${label}`} disabled={busy || loading || readOnly || changedAssignment} value={row[key]}
            onChange={(event) => setValues((current) => current.map((item) => item.fieldCode === row.fieldCode ? { ...item, [key]: event.target.value } : item))}
            className="min-h-36 w-full resize-y rounded-lg border border-outline-variant p-3 text-sm outline-none focus:border-primary disabled:opacity-70" />
        </div>)}
      </section>)}
      {readOnly && report && period?.status === 'open' && <button type="button" disabled={busy} className="rounded-lg border border-outline-variant px-4 py-2" onClick={async () => {
        if (!window.confirm('Thu hồi báo cáo về nháp để chỉnh sửa?')) return;
        setBusy(true); try { const saved = await recallReport(report._id); setReport(saved); } catch (err) { setError(formatApiError(err, 'Không thu hồi được.')); } finally { setBusy(false); }
      }}>Thu hồi báo cáo</button>}
    </div>
  </AppLayout>;
}
