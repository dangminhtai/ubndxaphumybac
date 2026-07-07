import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  Search,
  Paperclip,
  User,
  MapPin,
  Eye,
  Building,
  Contact,
  Edit,
  Trash2,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Dialog from '../components/ui/Dialog';
import WorkScheduleViewModal from '../components/work-schedule/WorkScheduleViewModal';
import { deleteWorkSchedule, getWorkSchedules } from '../api/workScheduleApi';
import type { WorkSchedule, WorkScheduleListResponse, WorkScheduleStatus } from '../types/workSchedule';
import type { User as CurrentUser } from '../types/user';

const STATUS_LABELS: Record<WorkScheduleStatus, string> = {
  not_started: 'Chưa thực hiện',
  in_progress: 'Đang thực hiện',
  completed: 'Đã hoàn thành',
  postponed: 'Hoãn',
  cancelled: 'Hủy',
};

function readUser() {
  const rawUser = localStorage.getItem('user');
  if (!rawUser) {
    throw new Error('Thiếu thông tin người dùng trong phiên đăng nhập');
  }
  return JSON.parse(rawUser) as CurrentUser;
}

type SessionType = 'Sáng' | 'Chiều' | 'Tối';

function getSession(startTime: string): SessionType {
  const h = parseInt(startTime.split(':')[0] || '0', 10);
  if (h < 12) return 'Sáng';
  if (h < 18) return 'Chiều';
  return 'Tối';
}

function formatDateHeader(iso: string) {
  const date = new Date(iso);
  const dayOfWeek = date.getDay();
  const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return {
    dayName: days[dayOfWeek],
    dateStr: `${dd}/${mm}/${yyyy}`
  };
}

interface GroupedSession {
  name: SessionType;
  events: WorkSchedule[];
}

interface GroupedDate {
  dateIso: string;
  dayName: string;
  dateStr: string;
  sessions: GroupedSession[];
}

function groupSchedules(data: WorkSchedule[]): GroupedDate[] {
  const groups: Record<string, GroupedDate> = {};
  data.forEach((schedule) => {
    const dateIso = schedule.date.slice(0, 10);
    if (!groups[dateIso]) {
      const { dayName, dateStr } = formatDateHeader(schedule.date);
      groups[dateIso] = {
        dateIso,
        dayName,
        dateStr,
        sessions: [
          { name: 'Sáng', events: [] },
          { name: 'Chiều', events: [] },
          { name: 'Tối', events: [] },
        ]
      };
    }
    const sessionName = getSession(schedule.startTime);
    const session = groups[dateIso].sessions.find(s => s.name === sessionName);
    if (session) {
      session.events.push(schedule);
    }
  });

  return Object.values(groups)
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso))
    .map(g => {
      g.sessions.forEach(s => s.events.sort((e1, e2) => e1.startTime.localeCompare(e2.startTime)));
      g.sessions = g.sessions.filter(s => s.events.length > 0);
      return g;
    });
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [viewingSchedule, setViewingSchedule] = useState<WorkSchedule | null>(null);

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
        limit: 50,
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

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteWorkSchedule(deletingId);
      setIsDeleteDialogOpen(false);
      setDeletingId('');
      void fetchSchedules();
    } catch (err) {
      console.error(err);
      alert('Không xóa được lịch công tác');
    }
  };

  const groupedData = useMemo(() => {
    if (!data?.data) return [];
    return groupSchedules(data.data);
  }, [data]);

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
      <Dialog
        isOpen={isDeleteDialogOpen}
        type="confirm"
        title="Xóa lịch công tác"
        message="Bạn có chắc chắn muốn xóa lịch công tác này không?"
        confirmText="Xóa"
        isDanger={true}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setDeletingId('');
        }}
      />
      <WorkScheduleViewModal 
        isOpen={!!viewingSchedule}
        schedule={viewingSchedule}
        onClose={() => setViewingSchedule(null)}
        onStatusChanged={fetchSchedules}
      />
      <section className="mb-5 rounded-xl border border-outline-variant bg-white p-3 shadow-level-1 md:p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_220px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 pl-9 text-sm outline-none focus:border-primary"
              placeholder="Tìm theo tiêu đề..."
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

      <section>
        {loading ? (
          <div className="flex min-h-56 items-center justify-center rounded-xl border border-outline-variant bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : groupedData.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-outline-variant bg-white shadow-level-1 lg:block">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#1d5b99] text-white">
                    <th className="border border-[#144272] px-4 py-3 font-semibold uppercase text-center w-[120px]">THỜI GIAN</th>
                    <th className="border border-[#144272] px-3 py-3 font-semibold uppercase text-center w-[80px]">BUỔI</th>
                    <th className="border border-[#144272] px-4 py-3 font-semibold uppercase min-w-[250px]">NỘI DUNG</th>
                    <th className="border border-[#144272] px-4 py-3 font-semibold uppercase w-[150px]">CHỦ TRÌ</th>
                    <th className="border border-[#144272] px-4 py-3 font-semibold uppercase w-[150px]">ĐỊA ĐIỂM</th>
                    <th className="border border-[#144272] px-4 py-3 font-semibold uppercase w-[120px] text-center">CQCB NỘI DUNG</th>
                    <th className="border border-[#144272] px-4 py-3 font-semibold uppercase w-[180px]">THÀNH PHẦN</th>
                    <th className="border border-[#144272] px-4 py-3 font-semibold uppercase w-[120px] text-center">LDVP/CV THEO DÕI</th>
                    {canManage && <th className="border border-[#144272] px-4 py-3 font-semibold uppercase w-[100px] text-center">THAO TÁC</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {groupedData.map((dayGroup) => {
                    const totalEventsInDay = dayGroup.sessions.reduce((acc, s) => acc + s.events.length, 0);

                    return dayGroup.sessions.map((session, sessionIndex) => {
                      return session.events.map((event, eventIndex) => {
                        const isFirstEventOfDay = sessionIndex === 0 && eventIndex === 0;
                        const isFirstEventOfSession = eventIndex === 0;

                        const renderAttachment = () => {
                          if (!event.attachmentUrl) return null;
                          return (
                            <a href={event.attachmentUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center text-primary hover:text-primary/80" title="Tài liệu đính kèm">
                              <Paperclip className="h-4 w-4" />
                            </a>
                          );
                        };

                        const renderContentWithLink = () => {
                          return (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-start gap-1">
                                <button
                                  type="button"
                                  onClick={() => setViewingSchedule(event)}
                                  className="font-semibold text-on-surface hover:text-primary hover:underline text-left"
                                >
                                  {event.startTime}. {event.title}
                                </button>
                                {renderAttachment()}
                              </div>
                              {event.content && <p className="text-xs text-on-surface-variant line-clamp-2">{event.content}</p>}
                            </div>
                          );
                        };

                        const fullParticipants = [event.participantText].filter(Boolean).join('; ');

                        return (
                          <tr key={event._id} className="hover:bg-surface-container-low transition-colors">
                            {isFirstEventOfDay && (
                              <td rowSpan={totalEventsInDay} className="border border-outline-variant bg-[#fff9e6] px-4 py-3 text-center align-middle font-medium text-on-surface whitespace-nowrap">
                                {dayGroup.dayName}<br />{dayGroup.dateStr}
                              </td>
                            )}
                            {isFirstEventOfSession && (
                              <td rowSpan={session.events.length} className="border border-outline-variant px-3 py-3 text-center align-middle font-medium text-on-surface whitespace-nowrap">
                                {session.name}
                              </td>
                            )}
                            <td className="border border-outline-variant px-4 py-3 align-top">
                              {renderContentWithLink()}
                            </td>
                            <td className="border border-outline-variant px-4 py-3 align-top text-on-surface">
                              {event.chairPerson}
                            </td>
                            <td className="border border-outline-variant px-4 py-3 align-top text-on-surface">
                              {event.location}
                            </td>
                            <td className="border border-outline-variant px-4 py-3 align-top text-center text-on-surface">
                              {event.preparingAgency}
                            </td>
                            <td className="border border-outline-variant px-4 py-3 align-top text-on-surface">
                              {fullParticipants}
                            </td>
                            <td className="border border-outline-variant px-4 py-3 align-top text-center text-on-surface">
                              {event.monitoringOfficer}
                            </td>
                            {canManage && (
                              <td className="border border-outline-variant px-4 py-3 align-top text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Link to={`/work-schedules/${event._id}/edit`} className="text-primary hover:text-primary/80" title="Sửa">
                                    <Edit className="h-4 w-4" />
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeletingId(event._id);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="text-error hover:text-error/80"
                                    title="Xóa"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      });
                    });
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View (Cards) */}
            <div className="lg:hidden space-y-6">
              {groupedData.map((dayGroup) => (
                <div key={dayGroup.dateIso} className="space-y-3">
                  <h2 className="sticky top-[64px] z-10 flex items-center justify-between rounded-lg bg-primary/10 px-4 py-2 font-bold text-primary shadow-sm backdrop-blur-md">
                    {dayGroup.dayName} - {dayGroup.dateStr}
                  </h2>
                  <div className="space-y-4 px-2">
                    {dayGroup.sessions.map((session) => (
                      <div key={session.name} className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant border-l-4 border-primary pl-2">
                          Buổi {session.name}
                        </h3>
                        <div className="space-y-3">
                          {session.events.map((event) => {
                            const fullParticipants = [event.participantText].filter(Boolean).join('; ');

                            return (
                              <div key={event._id} className="rounded-xl border border-outline-variant bg-white p-4 shadow-level-1">
                                <div className="flex items-start justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setViewingSchedule(event)}
                                    className="font-bold text-on-surface hover:text-primary text-left bg-transparent border-none p-0 cursor-pointer"
                                  >
                                    <span className="text-primary">{event.startTime}</span>. {event.title}
                                  </button>
                                  {event.attachmentUrl && (
                                    <a href={event.attachmentUrl} target="_blank" rel="noreferrer" className="flex-shrink-0 text-primary p-1 bg-primary/10 rounded-full">
                                      <Paperclip className="h-4 w-4" />
                                    </a>
                                  )}
                                  {canManage && (
                                    <div className="flex flex-shrink-0 items-center gap-1">
                                      <Link to={`/work-schedules/${event._id}/edit`} className="p-1 text-primary hover:bg-surface-container-low rounded-md">
                                        <Edit className="h-4 w-4" />
                                      </Link>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDeletingId(event._id);
                                          setIsDeleteDialogOpen(true);
                                        }}
                                        className="p-1 text-error hover:bg-error-container rounded-md"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {event.content && <p className="mt-2 text-sm text-on-surface-variant line-clamp-2">{event.content}</p>}
                                
                                <div className="mt-4 grid gap-2 text-sm text-on-surface-variant">
                                  {event.chairPerson && (
                                    <div className="flex items-start gap-2">
                                      <User className="h-4 w-4 flex-shrink-0 text-primary/70 mt-0.5" />
                                      <span><span className="font-medium text-on-surface">Chủ trì:</span> {event.chairPerson}</span>
                                    </div>
                                  )}
                                  {event.location && (
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 flex-shrink-0 text-primary/70 mt-0.5" />
                                      <span><span className="font-medium text-on-surface">Địa điểm:</span> {event.location}</span>
                                    </div>
                                  )}
                                  {fullParticipants && (
                                    <div className="flex items-start gap-2">
                                      <Contact className="h-4 w-4 flex-shrink-0 text-primary/70 mt-0.5" />
                                      <span><span className="font-medium text-on-surface">Thành phần:</span> {fullParticipants}</span>
                                    </div>
                                  )}
                                  {event.preparingAgency && (
                                    <div className="flex items-start gap-2">
                                      <Building className="h-4 w-4 flex-shrink-0 text-primary/70 mt-0.5" />
                                      <span><span className="font-medium text-on-surface">CQCB Nội dung:</span> {event.preparingAgency}</span>
                                    </div>
                                  )}
                                  {event.monitoringOfficer && (
                                    <div className="flex items-start gap-2">
                                      <Eye className="h-4 w-4 flex-shrink-0 text-primary/70 mt-0.5" />
                                      <span><span className="font-medium text-on-surface">Theo dõi:</span> {event.monitoringOfficer}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
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
