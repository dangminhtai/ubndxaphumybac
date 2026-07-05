import { useEffect, useState } from 'react';
import { Archive as ArchiveIcon, CalendarClock, Check, Lock, Pencil, Unlock, X } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { archivePeriod, getPeriods, lockPeriod, openPeriod, updatePeriodDueDate } from '../api/periodApi';
import type { ReportPeriod } from '../types/report';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Đang mở' },
    locked: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Đã khóa' },
    draft: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Nháp' },
    archived: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Lưu trữ' },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export default function AdminPeriods() {
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [editingId, setEditingId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const loadPeriods = async () => {
    setPeriods(await getPeriods());
  };

  useEffect(() => {
    void loadPeriods();
  }, []);

  const saveNewDueDate = async (id: string) => {
    await updatePeriodDueDate(id, editDueDate);
    setEditingId('');
    await loadPeriods();
  };

  const startEdit = (period: ReportPeriod) => {
    setEditingId(period._id);
    setEditDueDate(new Date(period.dueDate).toISOString().slice(0, 10));
  };

  return (
    <AppLayout title="Quản lý kỳ báo cáo" subtitle="Hệ thống tự động tạo kỳ báo cáo tuần (Thứ 2 → Thứ 5). Admin có thể gia hạn, khóa hoặc lưu trữ.">
      <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
        <div className="mb-4 flex items-center gap-3">
          <CalendarClock className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Danh sách kỳ báo cáo</h3>
        </div>

        <div className="space-y-3">
          {periods.length === 0 && (
            <p className="py-8 text-center text-sm text-on-surface-variant">Chưa có kỳ báo cáo nào.</p>
          )}

          {periods.map((period) => (
            <div key={period._id} className="flex flex-col gap-3 rounded-lg border border-outline-variant p-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{period.title}</span>
                  <StatusBadge status={period.status} />
                </div>
                <div className="text-sm text-on-surface-variant">
                  {new Date(period.startDate).toLocaleDateString('vi-VN')} → {new Date(period.dueDate).toLocaleDateString('vi-VN')}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Edit due date */}
                {period.status !== 'archived' && editingId !== period._id && (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-container-low"
                    type="button"
                    onClick={() => startEdit(period)}
                  >
                    <Pencil className="h-4 w-4 text-primary" />
                    Sửa hạn nộp
                  </button>
                )}

                {editingId === period._id && (
                  <div className="flex items-center gap-2">
                    <input
                      className="rounded-lg border border-primary bg-surface px-3 py-1.5 text-sm outline-none"
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                    />
                    <button
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                      type="button"
                      onClick={() => void saveNewDueDate(period._id)}
                    >
                      <Check className="h-4 w-4" />
                      Lưu
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-container-low"
                      type="button"
                      onClick={() => setEditingId('')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Status actions */}
                {period.status !== 'archived' && (
                  <>
                    {period.status !== 'open' && (
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-container-low" type="button" onClick={() => void openPeriod(period._id).then(loadPeriods)}>
                        <Unlock className="h-4 w-4 text-emerald-600" />
                        Mở
                      </button>
                    )}
                    {period.status !== 'locked' && (
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-container-low" type="button" onClick={() => void lockPeriod(period._id).then(loadPeriods)}>
                        <Lock className="h-4 w-4 text-amber-600" />
                        Khóa
                      </button>
                    )}
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-error transition-colors hover:bg-error-container hover:border-error"
                      type="button"
                      onClick={() => {
                        if (window.confirm('Bạn có chắc muốn đưa kỳ báo cáo này vào lưu trữ vĩnh viễn?')) {
                          void archivePeriod(period._id).then(loadPeriods);
                        }
                      }}
                    >
                      <ArchiveIcon className="h-4 w-4" />
                      Lưu trữ
                    </button>
                  </>
                )}
                {period.status === 'archived' && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-1.5 text-sm font-medium text-on-surface-variant">
                    <ArchiveIcon className="h-4 w-4" />
                    Đã lưu trữ
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
