import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { BarChart3, CalendarDays, CheckCircle2, Filter, Loader2, RefreshCcw } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { getWorkScheduleStats } from '../api/workScheduleApi';
import type { WorkScheduleStatsResponse, WorkScheduleStatus } from '../types/workSchedule';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const STATUS_LABELS: Record<WorkScheduleStatus, string> = {
  not_started: 'Chưa thực hiện',
  in_progress: 'Đang thực hiện',
  completed: 'Đã hoàn thành',
  postponed: 'Hoãn',
  cancelled: 'Hủy',
};

const STATUS_COLORS: Record<WorkScheduleStatus, string> = {
  not_started: '#94a3b8',
  in_progress: '#2563eb',
  completed: '#10b981',
  postponed: '#f59e0b',
  cancelled: '#ef4444',
};

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toDateInput(first), to: toDateInput(last) };
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof CalendarDays;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
      <div className="mb-4 flex items-center justify-between">
        <div className={`rounded-lg p-2 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-on-surface">{value}</p>
      <p className="mt-1 text-sm text-on-surface-variant">{label}</p>
    </div>
  );
}

export default function WorkScheduleStats() {
  const defaultRange = useMemo(() => getMonthRange(), []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [stats, setStats] = useState<WorkScheduleStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getWorkScheduleStats({ from, to });
      setStats(result);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không tải được thống kê lịch công tác');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  const resetRange = () => {
    const range = getMonthRange();
    setFrom(range.from);
    setTo(range.to);
  };

  const statusChartData = {
    labels: stats?.byStatus.map((item) => STATUS_LABELS[item.status]) ?? [],
    datasets: [
      {
        data: stats?.byStatus.map((item) => item.count) ?? [],
        backgroundColor: stats?.byStatus.map((item) => STATUS_COLORS[item.status]) ?? [],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const fieldChartData = {
    labels: stats?.byField.map((item) => item.field) ?? [],
    datasets: [
      {
        label: 'Số lịch',
        data: stats?.byField.map((item) => item.count) ?? [],
        backgroundColor: '#2563eb',
        borderRadius: 6,
        barThickness: 24,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
      x: { grid: { display: false } },
    },
  } as const;

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
  } as const;

  return (
    <AppLayout
      title="Thống kê lịch công tác"
      subtitle="Theo dõi khối lượng, trạng thái và phân bổ lịch công tác theo lĩnh vực."
    >
      <section className="mb-5 rounded-xl border border-outline-variant bg-white p-4 shadow-level-1">
        <div className="grid gap-3 md:grid-cols-[220px_220px_auto_auto]">
          <label>
            <span className="mb-1 block text-sm font-medium text-on-surface-variant">Từ ngày</span>
            <input
              type="date"
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-on-surface-variant">Đến ngày</span>
            <input
              type="date"
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => void fetchStats()}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-level-1 transition-colors hover:bg-primary/90"
          >
            <Filter className="h-4 w-4" />
            Lọc
          </button>
          <button
            type="button"
            onClick={resetRange}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface-container-high"
          >
            <RefreshCcw className="h-4 w-4" />
            Tháng này
          </button>
        </div>
      </section>

      {error && <div className="mb-4 rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm text-error">{error}</div>}

      {loading ? (
        <div className="flex min-h-56 items-center justify-center rounded-xl border border-outline-variant bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : stats ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Tổng số lịch" value={stats.total} icon={BarChart3} tone="bg-blue-50 text-blue-700" />
            <StatCard label="Lịch hôm nay" value={stats.todayCount} icon={CalendarDays} tone="bg-indigo-50 text-indigo-700" />
            <StatCard label="Lịch tuần này" value={stats.weekCount} icon={CalendarDays} tone="bg-amber-50 text-amber-700" />
            <StatCard label="Lịch tháng này" value={stats.monthCount} icon={CalendarDays} tone="bg-cyan-50 text-cyan-700" />
            <StatCard label="Tỷ lệ hoàn thành" value={`${stats.completionRate}%`} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="flex h-[380px] flex-col rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
              <h3 className="mb-4 text-base font-semibold text-on-surface">Phân bổ theo lĩnh vực</h3>
              {stats.byField.length > 0 ? (
                <div className="relative min-h-0 flex-1">
                  <Bar data={fieldChartData} options={barOptions} />
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-on-surface-variant">Chưa có dữ liệu lĩnh vực.</div>
              )}
            </section>

            <section className="flex h-[380px] flex-col rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
              <h3 className="mb-4 text-base font-semibold text-on-surface">Tỷ lệ theo trạng thái</h3>
              {stats.byStatus.length > 0 ? (
                <div className="relative min-h-0 flex-1">
                  <Doughnut data={statusChartData} options={doughnutOptions} />
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-on-surface-variant">Chưa có dữ liệu trạng thái.</div>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant bg-white p-10 text-center text-on-surface-variant shadow-level-1">
          Chưa có dữ liệu thống kê.
        </div>
      )}
    </AppLayout>
  );
}
