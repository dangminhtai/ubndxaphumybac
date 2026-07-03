import { useEffect, useState } from 'react';
import { Archive as ArchiveIcon, Lock, Plus, Unlock } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { archivePeriod, createPeriod, getPeriods, lockPeriod, openPeriod } from '../api/periodApi';
import type { ReportPeriod } from '../types/report';

const today = new Date().toISOString().slice(0, 10);

export default function AdminPeriods() {
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [form, setForm] = useState({
    type: 'weekly' as 'weekly' | 'monthly',
    title: '',
    weekNumber: 1,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    startDate: today,
    dueDate: today,
    status: 'open' as 'draft' | 'open',
  });
  const [error, setError] = useState('');

  const loadPeriods = async () => {
    setPeriods(await getPeriods());
  };

  useEffect(() => {
    void loadPeriods();
  }, []);

  const submit = async () => {
    setError('');
    try {
      await createPeriod(form);
      await loadPeriods();
    } catch {
      setError('Không tạo được kỳ báo cáo. Kiểm tra trùng kỳ hoặc dữ liệu bắt buộc.');
    }
  };

  return (
    <AppLayout title="Quản lý kỳ báo cáo" subtitle="Admin tạo, mở và khóa kỳ báo cáo tuần/tháng.">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
          <h3 className="mb-4 text-base font-semibold">Tạo kỳ báo cáo</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface-variant">Loại kỳ báo cáo</label>
              <select className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 outline-none focus:border-primary" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as 'weekly' | 'monthly' }))}>
                <option value="weekly">Tuần</option>
                <option value="monthly">Tháng</option>
              </select>
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface-variant">Tiêu đề (Tùy chọn, để trống sẽ tự tạo)</label>
              <input className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 outline-none focus:border-primary" placeholder="VD: Báo cáo tuần 4 tháng 6..." value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {form.type === 'weekly' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-on-surface-variant">Tuần thứ</label>
                  <input className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 outline-none focus:border-primary" type="number" min={1} max={5} value={form.weekNumber} onChange={(event) => setForm((current) => ({ ...current, weekNumber: Number(event.target.value) }))} />
                </div>
              )}
              <div className={form.type === 'monthly' ? 'col-span-2' : ''}>
                <label className="mb-1 block text-sm font-medium text-on-surface-variant">Tháng</label>
                <input className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 outline-none focus:border-primary" type="number" min={1} max={12} value={form.month} onChange={(event) => setForm((current) => ({ ...current, month: Number(event.target.value) }))} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface-variant">Năm</label>
              <input className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 outline-none focus:border-primary" type="number" value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: Number(event.target.value) }))} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-on-surface-variant">Ngày bắt đầu</label>
                <input className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 outline-none focus:border-primary" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-on-surface-variant">Hạn chót nộp</label>
                <input className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 outline-none focus:border-primary" type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
              </div>
            </div>
            
            <button className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition-colors hover:bg-primary-container" type="button" onClick={() => void submit()}>
              <Plus className="h-5 w-5" />
              Tạo kỳ báo cáo
            </button>
          </div>
          {error && <p className="mt-4 rounded-lg bg-error-container px-3 py-2 text-sm text-error">{error}</p>}
        </section>

        <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
          <h3 className="mb-4 text-base font-semibold">Danh sách kỳ báo cáo</h3>
          <div className="space-y-3">
            {periods.map((period) => (
              <div key={period._id} className="flex flex-col gap-3 rounded-lg border border-outline-variant p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold">{period.title}</div>
                  <div className="text-sm text-on-surface-variant">
                    {period.type} - {period.status} - hạn {new Date(period.dueDate).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
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
      </div>
    </AppLayout>
  );
}
