import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Calendar,
  CheckCircle2,
  Download,
  ListTodo,
  Loader2,
  Lock,
  Pencil,
  Save,
  Trash2,
  Unlock,
  Users,
  XCircle,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Dialog from '../components/ui/Dialog';
import {
  getRegistrationStatus,
  getMyWeeklyTask,
  upsertWeeklyTask,
  deleteWeeklyTask,
  getWeeklyTasks,
  getAvailableWeeks,
  openRegistrationEarly,
  closeRegistrationEarly,
  exportWeeklyTasksExcel,
} from '../api/weeklyTaskApi';
import type {
  RegistrationStatus,
  WeeklyTaskData,
  WeekOption,
} from '../api/weeklyTaskApi';
import type { User } from '../types/user';

function readUser() {
  const raw = localStorage.getItem('user');
  return raw ? (JSON.parse(raw) as Partial<User>) : null;
}

function formatDate(d: Date) {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function WeeklyTasks() {
  const user = readUser();
  const isAdmin = user?.role === 'admin';
  const isAdminOrLead = isAdmin || user?.role === 'department_lead';

  /* ── Registration status ── */
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  /* ── My task ── */
  const [myTask, setMyTask] = useState<WeeklyTaskData | null>(null);
  const [formContent, setFormContent] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── Overview & weeks ── */
  const [allTasks, setAllTasks] = useState<WeeklyTaskData[]>([]);
  const [totalStaff, setTotalStaff] = useState(0);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [weeks, setWeeks] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [exporting, setExporting] = useState(false);

  /* ── Dialogs ── */
  const [openEarlyDialog, setOpenEarlyDialog] = useState(false);
  const [closeEarlyDialog, setCloseEarlyDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [openingEarly, setOpeningEarly] = useState(false);
  const [closingEarly, setClosingEarly] = useState(false);

  /* ── Computed ── */
  const canEdit = status?.isOpen || isAdmin;

  /* ── Load data ── */
  async function loadStatus() {
    try {
      const s = await getRegistrationStatus();
      setStatus(s);
      return s;
    } catch {
      toast.error('Không tải được trạng thái đăng ký');
      return null;
    } finally {
      setLoadingStatus(false);
    }
  }

  async function loadMyTask(targetWeekStart?: string) {
    try {
      const res = await getMyWeeklyTask(targetWeekStart);
      setMyTask(res.task);
      if (res.task) {
        setFormContent(res.task.content);
        setFormDeadline(res.task.deadline);
        setEditing(false);
      } else {
        setFormContent('');
        setFormDeadline('');
        setEditing(canEdit);
      }
    } catch {
      /* ignore */
    }
  }

  async function loadAllTasks(targetWeekStart: string) {
    setLoadingTasks(true);
    try {
      const res = await getWeeklyTasks(targetWeekStart);
      setAllTasks(res.tasks);
      setTotalStaff(res.totalStaff);
      setRegisteredCount(res.registeredCount);
    } catch {
      toast.error('Không tải được danh sách nhiệm vụ');
    } finally {
      setLoadingTasks(false);
    }
  }

  async function loadWeeks() {
    try {
      const w = await getAvailableWeeks();
      setWeeks(w);
      if (w.length > 0 && !selectedWeek) {
        setSelectedWeek(w[0].targetWeekStart);
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void loadStatus().then((s) => {
      if (s) {
        void loadMyTask(s.targetWeekStart);
      }
    });
    void loadWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      void loadAllTasks(selectedWeek);
      // If user switches week in dropdown, also load their task for that week
      void loadMyTask(selectedWeek);
    }
  }, [selectedWeek]);

  /* ── Handlers ── */
  async function handleSave() {
    if (!formContent.trim()) {
      toast.error('Vui lòng nhập nhiệm vụ tuần');
      return;
    }
    setSaving(true);
    try {
      const activeWeek = selectedWeek || status?.targetWeekStart;
      const task = await upsertWeeklyTask({
        content: formContent,
        deadline: formDeadline,
        targetWeekStart: activeWeek,
      });
      setMyTask(task);
      setEditing(false);
      toast.success('Đã lưu nhiệm vụ tuần');
      if (activeWeek) {
        void loadAllTasks(activeWeek);
        void loadWeeks();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Không thể lưu nhiệm vụ');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!myTask) return;
    setSaving(true);
    try {
      await deleteWeeklyTask(myTask._id);
      setMyTask(null);
      setFormContent('');
      setFormDeadline('');
      setEditing(canEdit);
      setDeleteDialog(false);
      toast.success('Đã xóa nhiệm vụ');
      const activeWeek = selectedWeek || status?.targetWeekStart;
      if (activeWeek) {
        void loadAllTasks(activeWeek);
        void loadWeeks();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Không thể xóa nhiệm vụ');
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenEarly() {
    setOpeningEarly(true);
    try {
      await openRegistrationEarly();
      toast.success('Đã mở sớm đăng ký nhiệm vụ tuần');
      setOpenEarlyDialog(false);
      await loadStatus();
      if (selectedWeek) void loadAllTasks(selectedWeek);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Không thể mở sớm');
    } finally {
      setOpeningEarly(false);
    }
  }

  async function handleCloseEarly() {
    setClosingEarly(true);
    try {
      await closeRegistrationEarly();
      toast.success('Đã khóa lại đăng ký nhiệm vụ');
      setCloseEarlyDialog(false);
      await loadStatus();
      if (selectedWeek) void loadAllTasks(selectedWeek);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Không thể khóa lại');
    } finally {
      setClosingEarly(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const activeWeek = selectedWeek || status?.targetWeekStart;
      await exportWeeklyTasksExcel(activeWeek);
      toast.success('Đã xuất file Excel');
    } catch {
      toast.error('Không thể xuất Excel');
    } finally {
      setExporting(false);
    }
  }

  function handleDatePick(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!val) return;
    const d = new Date(val + 'T00:00:00');
    setFormDeadline(formatDate(d));
  }

  /* ── Loading state ── */
  if (loadingStatus) {
    return (
      <AppLayout title="Nhiệm vụ tuần" subtitle="Đang tải...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const getUserName = (t: WeeklyTaskData) => {
    const u = t.userId;
    return typeof u === 'object' && u ? u.fullName : '';
  };

  const currentWeekOption = weeks.find((w) => w.targetWeekStart === selectedWeek);
  const activeWeekLabel = currentWeekOption?.weekLabel || status?.weekLabel || '';

  return (
    <AppLayout
      title="Nhiệm vụ tuần"
      subtitle={activeWeekLabel}
      actions={
        isAdminOrLead ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting || allTasks.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Xuất Excel
            </button>
          </div>
        ) : undefined
      }
    >
      {/* ─── Registration Status Banner ─── */}
      {!status?.isOpen && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">
                  Hiện tại đang là {status?.dayName} chưa đến thời gian đăng ký nhiệm vụ tuần
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Thời gian đăng ký theo quy định: Thứ Bảy – Chủ Nhật hàng tuần (cho tuần tiếp theo).
                </p>
              </div>
            </div>
            {status?.canOpenEarly && (
              <button
                onClick={() => setOpenEarlyDialog(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm transition-colors hover:bg-amber-100"
              >
                <Unlock className="h-4 w-4 text-amber-600" />
                Mở sớm
              </button>
            )}
          </div>
        </div>
      )}

      {status?.isOpen && status?.earlyOpened && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/90 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Unlock className="h-5 w-5 shrink-0 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">
                Admin đã mở sớm đăng ký nhiệm vụ tuần này ({status.weekLabel})
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setCloseEarlyDialog(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-blue-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-100"
              >
                <Lock className="h-3.5 w-3.5 text-blue-600" />
                Khóa lại
              </button>
            )}
          </div>
        </div>
      )}

      {status?.isOpen && status?.isWeekend && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-900">
              Đang trong thời gian đăng ký nhiệm vụ cuối tuần ({status.dayName}) cho {status.weekLabel}
            </p>
          </div>
        </div>
      )}

      {/* ─── Week Selector Bar ─── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm sm:p-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-on-surface">Kỳ nhiệm vụ:</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm font-medium text-on-surface outline-none transition-colors focus:border-primary"
          >
            {weeks.map((w) => (
              <option key={w.targetWeekStart} value={w.targetWeekStart}>
                {w.weekLabel} {w.taskCount > 0 ? `(${w.taskCount} người)` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Staff: My Task Card ─── */}
      <div className="mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-on-surface">
              Nhiệm vụ cá nhân ({activeWeekLabel})
            </h3>
          </div>
          {myTask ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> Đã đăng ký
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
              <XCircle className="h-3.5 w-3.5" /> Chưa đăng ký
            </span>
          )}
        </div>

        {/* Họ và tên (read-only) */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-semibold text-on-surface">
            Họ và tên
          </label>
          <input
            type="text"
            disabled
            value={user?.fullName || ''}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm font-medium text-on-surface-variant cursor-not-allowed"
          />
        </div>

        {/* Nhiệm vụ tuần */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-semibold text-on-surface">
            Nhiệm vụ tuần <span className="text-error">*</span>
          </label>
          {editing && canEdit ? (
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="- Rà soát các chỉ tiêu kế hoạch phát triển KHCN...&#10;- Tham mưu việc tổ chức quay, chụp hình ảnh...&#10;- Tham mưu tổ chức Cuộc thi Rung chuông vàng CCHC"
              rows={6}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-outline focus:border-primary"
            />
          ) : (
            <div className="min-h-[100px] whitespace-pre-wrap rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm text-on-surface">
              {myTask?.content || (
                <span className="italic text-on-surface-variant/60">
                  (Chưa nhập nhiệm vụ cho tuần này)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Thời gian hoàn thành (cả picker và nhập thủ công) */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-semibold text-on-surface">
            Thời gian hoàn thành
          </label>
          {editing && canEdit ? (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  placeholder="VD: 15/8/2026 hoặc Ngày 13/8/2026"
                  className="flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-outline focus:border-primary"
                />
                <label className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-surface-container-high">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Chọn ngày</span>
                  <input
                    type="date"
                    onChange={handleDatePick}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    tabIndex={-1}
                  />
                </label>
              </div>
              <p className="mt-1.5 text-xs text-on-surface-variant">
                Linh hoạt: Bạn có thể gõ trực tiếp (ví dụ: &quot;Ngày 13/8/2026&quot;) hoặc bấm nút chọn ngày từ lịch.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm text-on-surface">
              {myTask?.deadline || (
                <span className="italic text-on-surface-variant/60">
                  (Chưa nhập thời gian hoàn thành)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {canEdit && (
          <div className="flex flex-wrap items-center gap-3">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {myTask ? 'Cập nhật' : 'Lưu đăng ký'}
                </button>
                {myTask && (
                  <button
                    onClick={() => {
                      setFormContent(myTask?.content || '');
                      setFormDeadline(myTask?.deadline || '');
                      setEditing(false);
                    }}
                    className="rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                  >
                    Hủy
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary bg-surface px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  <Pencil className="h-4 w-4" />
                  Sửa nhiệm vụ
                </button>
                <button
                  onClick={() => setDeleteDialog(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-error/30 px-4 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error/5"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── Admin/Lead: Overview Table (Full Staff List) ─── */}
      {isAdminOrLead && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-outline-variant p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
            <div className="flex items-center gap-2.5">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-on-surface">
                Bảng tổng hợp nhiệm vụ ({activeWeekLabel})
              </h3>
            </div>
            {totalStaff > 0 && (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {registeredCount}/{totalStaff} nhân viên đã đăng ký
                </span>
              </div>
            )}
          </div>

          {/* Table */}
          {loadingTasks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : allTasks.length === 0 ? (
            <div className="py-12 text-center">
              <ListTodo className="mx-auto mb-3 h-10 w-10 text-outline" />
              <p className="text-sm text-on-surface-variant">
                Chưa có dữ liệu cho tuần này
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className="w-[60px] whitespace-nowrap px-4 py-3 text-center text-sm font-bold text-on-surface-variant">
                      STT
                    </th>
                    <th className="min-w-[200px] whitespace-nowrap px-4 py-3 text-sm font-bold text-on-surface-variant">
                      HỌ VÀ TÊN
                    </th>
                    <th className="min-w-[340px] px-4 py-3 text-sm font-bold text-on-surface-variant">
                      NHIỆM VỤ TUẦN
                    </th>
                    <th className="min-w-[170px] whitespace-nowrap px-4 py-3 text-center text-sm font-bold text-on-surface-variant">
                      THỜI GIAN HOÀN THÀNH
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allTasks.map((task, i) => {
                    const isRegistered = task.isRegistered !== false && Boolean(task.content);
                    return (
                      <tr
                        key={task._id}
                        className={`border-b border-outline-variant transition-colors hover:bg-surface-container-low/60 ${
                          !isRegistered ? 'bg-surface-container-lowest/50' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center text-sm font-medium text-on-surface-variant">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3.5 text-sm font-bold uppercase text-on-surface">
                          {getUserName(task)}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-on-surface">
                          {isRegistered ? (
                            <div className="whitespace-pre-wrap leading-relaxed">
                              {task.content}
                            </div>
                          ) : (
                            <span className="italic text-on-surface-variant/50">
                              (Chưa đăng ký)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center text-sm text-on-surface-variant">
                          {task.deadline || (isRegistered ? '—' : '')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Confirm Open Early Dialog (Exact user prompt wording) ─── */}
      <Dialog
        isOpen={openEarlyDialog}
        type="confirm"
        title="Mở sớm đăng ký nhiệm vụ tuần"
        message={`Hiện tại đang là ${status?.dayName} chưa đến thời gian đăng ký nhiệm vụ tuần, bạn có chắc chắn mở sớm cho tuần này?\n\n(Kỳ đăng ký: ${status?.weekLabel})`}
        confirmText={openingEarly ? 'Đang mở...' : 'Mở sớm'}
        cancelText="Hủy"
        onConfirm={handleOpenEarly}
        onCancel={() => setOpenEarlyDialog(false)}
      />

      {/* ─── Confirm Close Early Dialog ─── */}
      <Dialog
        isOpen={closeEarlyDialog}
        type="confirm"
        title="Khóa lại đăng ký nhiệm vụ?"
        message={`Bạn có chắc chắn muốn khóa lại đăng ký nhiệm vụ cho ${status?.weekLabel}? Nhân viên sẽ không thể chỉnh sửa cho đến Thứ Bảy.`}
        confirmText={closingEarly ? 'Đang khóa...' : 'Khóa lại'}
        cancelText="Hủy"
        onConfirm={handleCloseEarly}
        onCancel={() => setCloseEarlyDialog(false)}
      />

      {/* ─── Confirm Delete Dialog ─── */}
      <Dialog
        isOpen={deleteDialog}
        type="confirm"
        title="Xóa nhiệm vụ đã đăng ký?"
        message="Nhiệm vụ đã đăng ký sẽ bị xóa vĩnh viễn. Bạn có chắc chắn muốn xóa?"
        confirmText="Xóa"
        cancelText="Hủy"
        isDanger
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(false)}
      />
    </AppLayout>
  );
}
