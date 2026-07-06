import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Plus,
  Search,
  User,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { getWorkSchedules } from '../api/workScheduleApi';
import type { WorkSchedule, WorkScheduleListResponse, WorkSchedulePriority, WorkScheduleStatus, WorkScheduleUser } from '../types/workSchedule';
import type { User as CurrentUser } from '../types/user';

const STATUS_LABELS: Record<WorkScheduleStatus, string> = {
  not_started: 'Chưa thực hiện',
  in_progress: 'Đang thực hiện',
  completed: 'Đã hoàn thành',
  postponed: 'Hoãn',
  cancelled: 'Hủy',
};

const STATUS_CLASSES: Record<WorkScheduleStatus, string> = {
  not_started: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  postponed: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
};

const PRIORITY_LABELS: Record<WorkSchedulePriority, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn',
};

const PRIORITY_CLASSES: Record<WorkSchedulePriority, string> = {
  low: 'bg-surface-container-high text-on-surface-variant',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

function readUser() {
  const rawUser = localStorage.getItem('user');
  if (!rawUser) {
    throw new Error('Thiếu thông tin người dùng trong phiên đăng nhập');
  }
  return JSON.parse(rawUser) as CurrentUser;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getUserName(value: string | WorkScheduleUser) {
  if (typeof value === 'string') return value;
  return value.fullName;
}

function ScheduleCard({ schedule, canManage }: { schedule: WorkSchedule; canManage: boolean }) {
  const executors = schedule.executorIds.map(getUserName);

  return (
    <article className="rounded-xl border border-outline-variant bg-white p-3 shadow-level-1 transition-colors hover:border-primary/40 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[schedule.status]}`}>
              {STATUS_LABELS[schedule.status]}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_CLASSES[schedule.priority]}`}>
              {PRIORITY_LABELS[schedule.priority]}
            </span>
            <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
              {schedule.field}
            </span>
          </div>

          <h3 className="text-base font-semibold text-on-surface">{schedule.title}</h3>
          {schedule.content && <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">{schedule.content}</p>}

          <div className="mt-4 grid gap-2 text-sm text-on-surface-variant md:grid-cols-2">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              {formatDate(schedule.date)}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {schedule.startTime}{schedule.endTime ? ` - ${schedule.endTime}` : ''}
            </span>
            {schedule.location && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {schedule.location}
              </span>
            )}
            {executors.length > 0 && (
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                {executors.join(', ')}
              </span>
            )}
          </div>
        </div>

        {canManage && (
          <Link
            to={`/work-schedules/${schedule._id}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface-container-high"
          >
            <Eye className="h-4 w-4" />
            Xem
          </Link>
        )}
        {!canManage && (
          <Link
            to={`/work-schedules/${schedule._id}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface-container-high"
          >
            <Eye className="h-4 w-4" />
            Xem
          </Link>
        )}
      </div>
    </article>
  );
}

export default function WorkSchedules() {
  const user = readUser();
  const canManage = user.role === 'admin' || user.role === 'department_lead';
  const [data, setData] = useState<WorkScheduleListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [field, setField] = useState('');

  const fields = useMemo(() => {
    const values = data?.data.map((item) => item.field) ?? [];
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [data]);

  const fetchSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getWorkSchedules({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: status ? (status as WorkScheduleStatus) : undefined,
        field: field || undefined,
      });
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không tải được lịch công tác');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSchedules();
  }, [page]);

  const applyFilter = () => {
    setPage(1);
    void fetchSchedules();
  };

  return (
    <AppLayout
      title="Lịch công tác"
      subtitle="Theo dõi lịch làm việc, họp và nhiệm vụ theo ngày của phòng."
      actions={
        canManage ? (
          <Link
            to="/work-schedules/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-level-1 transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Thêm lịch
          </Link>
        ) : null
      }
    >
      <section className="mb-5 rounded-xl border border-outline-variant bg-white p-3 shadow-level-1 md:p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_220px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 pl-9 text-sm outline-none focus:border-primary"
              placeholder="Tìm theo tiêu đề, địa điểm, nội dung..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            value={field}
            onChange={(event) => setField(event.target.value)}
          >
            <option value="">Tất cả lĩnh vực</option>
            {fields.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyFilter}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface-container-high"
          >
            <Filter className="h-4 w-4" />
            Lọc
          </button>
        </div>
      </section>

      {error && <div className="mb-4 rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm text-error">{error}</div>}

      <section className="space-y-4">
        {loading ? (
          <div className="flex min-h-56 items-center justify-center rounded-xl border border-outline-variant bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data && data.data.length > 0 ? (
          data.data.map((schedule) => (
            <ScheduleCard key={schedule._id} schedule={schedule} canManage={canManage} />
          ))
        ) : (
          <div className="rounded-xl border border-outline-variant bg-white p-10 text-center text-on-surface-variant shadow-level-1">
            Chưa có lịch công tác phù hợp.
          </div>
        )}
      </section>

      {data && data.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-outline-variant bg-surface p-2 text-primary disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-on-surface-variant">
            Trang {data.page}/{data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-outline-variant bg-surface p-2 text-primary disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </AppLayout>
  );
}
