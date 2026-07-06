import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Edit,
  Loader2,
  MapPin,
  Save,
  User,
  Users,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { getWorkSchedule, updateWorkScheduleStatus } from '../api/workScheduleApi';
import type { User as CurrentUser } from '../types/user';
import type { WorkSchedule, WorkScheduleStatus, WorkScheduleUser } from '../types/workSchedule';

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
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getUserId(value: string | WorkScheduleUser) {
  return typeof value === 'string' ? value : value._id;
}

function getUserName(value: string | WorkScheduleUser) {
  return typeof value === 'string' ? value : value.fullName;
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="text-xs font-medium uppercase text-on-surface-variant">{label}</p>
        <p className="mt-1 text-sm font-medium text-on-surface">{value}</p>
      </div>
    </div>
  );
}

export default function WorkScheduleDetail() {
  const { id } = useParams();
  const user = readUser();
  const canManage = user.role === 'admin' || user.role === 'department_lead';
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [status, setStatus] = useState<WorkScheduleStatus>('not_started');
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const executorIds = useMemo(() => schedule?.executorIds.map(getUserId) ?? [], [schedule]);
  const isExecutor = executorIds.includes(user.id);
  const canChangeStatus = canManage || isExecutor;

  const loadSchedule = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getWorkSchedule(id);
      setSchedule(data);
      setStatus(data.status);
      setCancelReason(data.cancelReason ?? '');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không tải được chi tiết lịch công tác');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSchedule();
  }, [id]);

  const saveStatus = async () => {
    if (!id) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateWorkScheduleStatus(id, {
        status,
        cancelReason: status === 'cancelled' ? cancelReason.trim() : undefined,
      });
      setSchedule(updated);
      setCancelReason(updated.cancelReason ?? '');
      setMessage('Đã cập nhật trạng thái lịch công tác');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không cập nhật được trạng thái');
    } finally {
      setSaving(false);
    }
  };

  const executorNames = schedule?.executorIds.map(getUserName).join(', ');
  const timeRange = schedule ? `${schedule.startTime}${schedule.endTime ? ` - ${schedule.endTime}` : ''}` : '';

  return (
    <AppLayout
      title="Chi tiết lịch công tác"
      subtitle="Xem thông tin lịch và cập nhật trạng thái thực hiện."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            to="/work-schedules"
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface-container-high"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
          {canManage && schedule && (
            <Link
              to={`/work-schedules/${schedule._id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-level-1 transition-colors hover:bg-primary/90"
            >
              <Edit className="h-4 w-4" />
              Sửa
            </Link>
          )}
        </div>
      }
    >
      {error && <div className="mb-4 rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm text-error">{error}</div>}
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      {loading ? (
        <div className="flex min-h-56 items-center justify-center rounded-xl border border-outline-variant bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : schedule ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[schedule.status]}`}>
                {STATUS_LABELS[schedule.status]}
              </span>
              <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                {schedule.field}
              </span>
            </div>

            <h3 className="text-xl font-semibold text-on-surface">{schedule.title}</h3>
            {schedule.content && (
              <div className="mt-5">
                <h4 className="mb-2 text-sm font-semibold text-primary">Nội dung công việc</h4>
                <p className="whitespace-pre-wrap text-sm leading-6 text-on-surface">{schedule.content}</p>
              </div>
            )}
            {schedule.notes && (
              <div className="mt-5">
                <h4 className="mb-2 text-sm font-semibold text-primary">Ghi chú</h4>
                <p className="whitespace-pre-wrap text-sm leading-6 text-on-surface">{schedule.notes}</p>
              </div>
            )}
            {schedule.cancelReason && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <span className="font-semibold">Lý do hủy: </span>
                {schedule.cancelReason}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
              <h3 className="mb-4 text-base font-semibold text-on-surface">Thông tin lịch</h3>
              <div className="space-y-3">
                <InfoItem icon={CalendarDays} label="Ngày thực hiện" value={formatDate(schedule.date)} />
                <InfoItem icon={Clock} label="Thời gian" value={timeRange} />
                <InfoItem icon={MapPin} label="Địa điểm" value={schedule.location} />
                <InfoItem icon={User} label="Người chủ trì" value={schedule.chairPerson} />
                <InfoItem icon={Users} label="Người thực hiện" value={executorNames} />
                <InfoItem icon={Users} label="Thành phần" value={schedule.participantText} />
              </div>
            </section>

            <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
              <h3 className="mb-4 text-base font-semibold text-on-surface">Cập nhật trạng thái</h3>
              {canChangeStatus ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-on-surface-variant">Trạng thái</span>
                    <select
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                      value={status}
                      onChange={(event) => setStatus(event.target.value as WorkScheduleStatus)}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  {status === 'cancelled' && (
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-on-surface-variant">Lý do hủy *</span>
                      <textarea
                        rows={3}
                        className="w-full resize-y rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={saveStatus}
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-level-1 transition-colors hover:bg-primary/90 disabled:bg-surface-container-high disabled:text-on-surface-variant"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Lưu trạng thái
                  </button>
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">Bạn chỉ có quyền xem lịch công tác này.</p>
              )}
            </section>
          </aside>
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant bg-white p-10 text-center text-on-surface-variant shadow-level-1">
          Không tìm thấy lịch công tác.
        </div>
      )}
    </AppLayout>
  );
}
