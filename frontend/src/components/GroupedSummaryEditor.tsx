import { useRef } from 'react';
import type { SummaryEntry, SummaryGroup, WeeklyEmployeeReport } from '../api/weeklySummaryApi';

function EntryEditor({ entry, groups, source, readOnly, onChange, onRemove, onSplit }: {
  entry: SummaryEntry;
  groups: SummaryGroup[];
  source?: WeeklyEmployeeReport;
  readOnly: boolean;
  onChange: (patch: Partial<SummaryEntry>) => void;
  onRemove: () => void;
  onSplit: (position: number) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return <div className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
    <div className="text-xs text-on-surface-variant">{source ? `Nguồn: ${source.sender} · ${source.field || source.department}` : entry.sourceReportId ? 'Nguồn: báo cáo đã tổng hợp' : 'Nội dung người phụ trách chỉnh sửa / bổ sung'}</div>
    <div className="flex flex-wrap gap-2">
      <select aria-label="Nhóm lĩnh vực" className="min-w-0 max-w-full flex-1 rounded border border-outline-variant bg-white p-2 text-sm" disabled={readOnly} value={entry.groupId || ''} onChange={(e) => onChange({ groupId: e.target.value || null })}>
        <option value="">Chưa phân nhóm — cần chọn</option>
        {groups.map((group, index) => <option key={group.id} value={group.id}>{index + 1}. {group.title}</option>)}
      </select>
      <select aria-label="Phần báo cáo" className="rounded border border-outline-variant bg-white p-2 text-sm" disabled={readOnly} value={entry.section} onChange={(e) => onChange({ section: e.target.value as SummaryEntry['section'] })}>
        <option value="results">Kết quả tuần này</option><option value="nextTasks">Nhiệm vụ tuần tới</option>
      </select>
    </div>
    <textarea ref={ref} aria-label="Nội dung báo cáo" className="min-h-36 w-full resize-y rounded border border-outline-variant bg-white p-3 text-sm leading-relaxed disabled:opacity-75" disabled={readOnly} value={entry.text} onChange={(e) => onChange({ text: e.target.value })} />
    {!readOnly && <div className="flex flex-wrap gap-4 text-xs">
      <button type="button" className="text-primary underline" onClick={() => onSplit(ref.current?.selectionStart || 0)}>Tách tại vị trí con trỏ</button>
      <button type="button" className="text-error underline" onClick={() => { if (!entry.text.trim() || window.confirm('Xóa đoạn này khỏi bản tổng hợp? Báo cáo nguồn vẫn được giữ.')) onRemove(); }}>Xóa đoạn khỏi bản tổng hợp</button>
    </div>}
  </div>;
}

export default function GroupedSummaryEditor({ entries, groups, reports, currentTitle, nextTitle, readOnly, onChange }: {
  entries: SummaryEntry[]; groups: SummaryGroup[]; reports: WeeklyEmployeeReport[];
  currentTitle: string; nextTitle: string; readOnly: boolean; onChange: (entries: SummaryEntry[]) => void;
}) {
  const change = (id: string, patch: Partial<SummaryEntry>) => onChange(entries.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));
  const card = (entry: SummaryEntry) => <EntryEditor key={entry.id} entry={entry} groups={groups} source={reports.find((report) => report._id === entry.sourceReportId)} readOnly={readOnly}
    onChange={(patch) => change(entry.id, patch)} onRemove={() => onChange(entries.filter((item) => item.id !== entry.id))}
    onSplit={(position) => {
      if (position <= 0 || position >= entry.text.length) return;
      const index = entries.findIndex((item) => item.id === entry.id);
      const first = { ...entry, text: entry.text.slice(0, position) };
      const second = { ...entry, id: crypto.randomUUID(), text: entry.text.slice(position) };
      onChange([...entries.slice(0, index), first, second, ...entries.slice(index + 1)]);
    }} />;
  const unassigned = entries.filter((entry) => !entry.groupId);
  return <div className="space-y-6">
    <p className="text-sm text-on-surface-variant">Giữ nội dung chuyên viên đã nộp. Có thể sửa, chuyển nhóm hoặc tách đoạn chứa nhiều lĩnh vực. File tải xuống gồm hai phần, mỗi phần có 8 nhóm.</p>
    {unassigned.length > 0 && <section className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <h3 className="font-semibold text-amber-900">Chưa phân nhóm ({unassigned.length})</h3>
      <p className="text-sm text-amber-900">Chọn lĩnh vực cho từng đoạn trước khi xuất Word/PDF. Bản nháp vẫn lưu được.</p>
      {unassigned.map(card)}
    </section>}
    {(['results', 'nextTasks'] as const).map((section) => <section key={section} className="space-y-3">
      <h3 className="text-base font-semibold text-primary">{section === 'results' ? `I. Kết quả thực hiện nhiệm vụ ${currentTitle.toLowerCase()}` : `II. Phương hướng, nhiệm vụ ${nextTitle.toLowerCase()}`}</h3>
      {groups.map((group, index) => <div key={group.id} className="space-y-3 rounded-lg border border-outline-variant p-3">
        <h4 className="text-sm font-semibold">{index + 1}. {group.title}</h4>
        {entries.filter((entry) => entry.section === section && entry.groupId === group.id).map(card)}
        {!entries.some((entry) => entry.section === section && entry.groupId === group.id) && <p className="text-xs text-on-surface-variant">Chưa có nội dung. File xuất giữ tiêu đề nhóm.</p>}
        {!readOnly && <button type="button" className="text-sm font-medium text-primary underline" onClick={() => onChange([...entries, { id: crypto.randomUUID(), groupId: group.id, section, text: '' }])}>Thêm nội dung</button>}
      </div>)}
    </section>)}
  </div>;
}
