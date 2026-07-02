import { useEffect, useState } from 'react';
import { Lock, Plus, Unlock } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { createPeriod, getPeriods, lockPeriod, openPeriod } from '../api/periodApi';
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
          <div className="space-y-3">
            <select className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as 'weekly' | 'monthly' }))}>
              <option value="weekly">Tuần</option>
              <option value="monthly">Tháng</option>
            </select>
            <input className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2" placeholder="Tiêu đề" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            {form.type === 'weekly' && <input className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2" type="number" min={1} max={5} value={form.weekNumber} onChange={(event) => setForm((current) => ({ ...current, weekNumber: Number(event.target.value) }))} />}
            <input className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2" type="number" min={1} max={12} value={form.month} onChange={(event) => setForm((current) => ({ ...current, month: Number(event.target.value) }))} />
            <input className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2" type="number" value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: Number(event.target.value) }))} />
            <input className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
            <input className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2" type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white" type="button" onClick={() => void submit()}>
              <Plus className="h-4 w-4" />
              Tạo kỳ
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
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
                <div className="flex gap-2">
                  <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm" type="button" onClick={() => void openPeriod(period._id).then(loadPeriods)}>
                    <Unlock className="h-4 w-4" />
                    Mở
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm" type="button" onClick={() => void lockPeriod(period._id).then(loadPeriods)}>
                    <Lock className="h-4 w-4" />
                    Khóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
