import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { createWorkSchedule, getWorkSchedule, updateWorkSchedule, uploadWorkScheduleFile } from '../api/workScheduleApi';
import type { User } from '../types/user';
import type { WorkSchedulePayload, WorkSchedulePriority, WorkScheduleStatus, WorkScheduleUser } from '../types/workSchedule';
import toast from 'react-hot-toast';

const FIELDS = [
  'Văn hóa',
  'Gia đình',
  'Thông tin',
  'Thể thao',
  'Du lịch',
  'Y tế',
  'Giáo dục',
  'LĐ-TB&XH',
  'Trẻ em',
  'Bảo trợ xã hội',
  'Bình đẳng giới',
  'Nội vụ',
  'Thanh niên',
  'Chuyển đổi số',
  'Khác',
];

const PRIORITIES: Array<{ value: WorkSchedulePriority; label: string }> = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khẩn' },
];

const STATUSES: Array<{ value: WorkScheduleStatus; label: string }> = [
  { value: 'not_started', label: 'Chưa thực hiện' },
  { value: 'in_progress', label: 'Đang thực hiện' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'postponed', label: 'Hoãn' },
  { value: 'cancelled', label: 'Hủy' },
];

const initialForm: WorkSchedulePayload = {
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  field: 'Văn hóa',
  priority: 'medium',
  status: 'not_started',
  chairPerson: '',
  executorIds: [],
  participantText: '',
  preparingAgency: '',
  monitoringOfficer: '',
  attachmentUrl: '',
  content: '',
  notes: '',
  cancelReason: '',
};

function readUser() {
  const rawUser = localStorage.getItem('user');
  if (!rawUser) {
    throw new Error('Thiếu thông tin người dùng trong phiên đăng nhập');
  }
  return JSON.parse(rawUser) as User;
}

function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function getId(value: string | WorkScheduleUser) {
  return typeof value === 'string' ? value : value._id;
}

export default function WorkScheduleForm() {
  const user = readUser();
  const canManage = user.role === 'admin' || user.role === 'department_lead';
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<WorkSchedulePayload>(initialForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!canManage) {
      setError('Bạn không có quyền tạo hoặc chỉnh sửa lịch công tác');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const schedule = id ? await getWorkSchedule(id) : null;

        if (schedule) {
          setForm({
            title: schedule.title,
            date: toDateInput(schedule.date),
            startTime: schedule.startTime,
            endTime: schedule.endTime ?? '',
            location: schedule.location ?? '',
            field: schedule.field,
            priority: schedule.priority,
            status: schedule.status,
            chairPerson: schedule.chairPerson ?? '',
            executorIds: schedule.executorIds.map(getId),
            participantText: schedule.participantText ?? '',
            preparingAgency: schedule.preparingAgency ?? '',
            monitoringOfficer: schedule.monitoringOfficer ?? '',
            attachmentUrl: schedule.attachmentUrl ?? '',
            attachmentName: schedule.attachmentName ?? '',
            content: schedule.content ?? '',
            notes: schedule.notes ?? '',
            cancelReason: schedule.cancelReason ?? '',
          });
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Không tải được dữ liệu lịch công tác');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [id, canManage, user.role]);

  const updateField = (fieldName: keyof WorkSchedulePayload, value: string | string[]) => {
    setForm((current) => ({ ...current, [fieldName]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!form.title || !form.date || !form.startTime || !form.field) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc (*)');
      return;
    }
    
    if (form.status === 'cancelled' && !form.cancelReason) {
      toast.error('Vui lòng nhập lý do hủy lịch');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let uploadedPath = form.attachmentUrl;
      let uploadedName = form.attachmentName;
      if (selectedFile) {
        const uploadRes = await uploadWorkScheduleFile(selectedFile);
        uploadedPath = uploadRes.path;
        uploadedName = uploadRes.name;
      }

      const payload: WorkSchedulePayload = {
        ...form,
        title: form.title.trim(),
        startTime: form.startTime.trim(),
        endTime: form.endTime?.trim(),
        location: form.location?.trim(),
        chairPerson: form.chairPerson?.trim(),
        participantText: form.participantText?.trim(),
        preparingAgency: form.preparingAgency?.trim(),
        monitoringOfficer: form.monitoringOfficer?.trim(),
        attachmentUrl: uploadedPath?.trim(),
        attachmentName: uploadedName?.trim(),
        content: form.content?.trim(),
        notes: form.notes?.trim(),
        cancelReason: form.cancelReason?.trim(),
      };

      if (isEdit && id) {
        await updateWorkSchedule(id, payload);
        toast.success('Đã cập nhật lịch công tác thành công');
        navigate('/work-schedules');
      } else {
        await createWorkSchedule(payload);
        toast.success('Đã tạo lịch công tác thành công');
        navigate('/work-schedules');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Không lưu được lịch công tác';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      title={isEdit ? 'Sửa lịch công tác' : 'Thêm lịch công tác'}
      subtitle="Nhập lịch làm việc, họp và nhiệm vụ theo ngày."
      actions={
        <Link
          to="/work-schedules"
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface-container-high"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Link>
      }
    >
      {error && <div className="mb-4 rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm text-error">{error}</div>}

      {loading ? (
        <div className="flex min-h-56 items-center justify-center rounded-xl border border-outline-variant bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <section className="rounded-xl border border-outline-variant bg-white p-4 shadow-level-1 md:p-5">
            <h3 className="mb-4 text-base font-semibold text-on-surface">1. Thời gian và địa điểm</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Tiêu đề công việc *</span>
                <input
                  required
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Ngày thực hiện *</span>
                <input
                  required
                  type="date"
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.date}
                  onChange={(event) => updateField('date', event.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1 block text-sm font-medium text-on-surface-variant">Giờ bắt đầu *</span>
                  <input
                    required
                    type="time"
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    value={form.startTime}
                    onChange={(event) => updateField('startTime', event.target.value)}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-medium text-on-surface-variant">Giờ kết thúc</span>
                  <input
                    type="time"
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    value={form.endTime}
                    onChange={(event) => updateField('endTime', event.target.value)}
                  />
                </label>
              </div>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Địa điểm</span>
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.location}
                  onChange={(event) => updateField('location', event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant bg-white p-4 shadow-level-1 md:p-5">
            <h3 className="mb-4 text-base font-semibold text-on-surface">2. Phân loại và nhân sự</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <label>
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Lĩnh vực *</span>
                <select
                  required
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.field}
                  onChange={(event) => updateField('field', event.target.value)}
                >
                  {FIELDS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Mức độ ưu tiên *</span>
                <select
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.priority}
                  onChange={(event) => updateField('priority', event.target.value as WorkSchedulePriority)}
                >
                  {PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Trạng thái *</span>
                <select
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.status}
                  onChange={(event) => updateField('status', event.target.value as WorkScheduleStatus)}
                >
                  {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Người chủ trì</span>
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.chairPerson}
                  onChange={(event) => updateField('chairPerson', event.target.value)}
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Thành phần tham gia</span>
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.participantText}
                  onChange={(event) => updateField('participantText', event.target.value)}
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">CQCB Nội dung</span>
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.preparingAgency}
                  onChange={(event) => updateField('preparingAgency', event.target.value)}
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Lãnh đạo / Chuyên viên theo dõi</span>
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.monitoringOfficer}
                  onChange={(event) => updateField('monitoringOfficer', event.target.value)}
                />
              </label>
            </div>


            {form.status === 'cancelled' && (
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Lý do hủy *</span>
                <input
                  required
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.cancelReason}
                  onChange={(event) => updateField('cancelReason', event.target.value)}
                />
              </label>
            )}
          </section>

          <section className="rounded-xl border border-outline-variant bg-white p-4 shadow-level-1 md:p-5">
            <h3 className="mb-4 text-base font-semibold text-on-surface">3. Nội dung</h3>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Nội dung công việc</span>
                <textarea
                  rows={5}
                  className="w-full resize-y rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.content}
                  onChange={(event) => updateField('content', event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Ghi chú</span>
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Tài liệu đính kèm (Tùy chọn)</span>
                {form.attachmentUrl && !selectedFile && (
                  <div className="mb-2 text-sm text-on-surface-variant flex flex-col gap-1">
                    <span>Đã có tài liệu: <span className="font-semibold text-primary">Có đính kèm</span></span>
                    <span className="text-xs text-on-surface-variant/70">Tải lên file mới sẽ ghi đè tài liệu cũ.</span>
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
                  onChange={(event) => {
                    if (event.target.files && event.target.files[0]) {
                      const file = event.target.files[0];
                      if (file.size > 20 * 1024 * 1024) {
                        setError('File vượt quá dung lượng tối đa 20MB');
                        event.target.value = '';
                        setSelectedFile(null);
                        return;
                      }
                      setSelectedFile(file);
                    } else {
                      setSelectedFile(null);
                    }
                  }}
                />
              </label>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !canManage}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-level-1 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu lịch công tác
            </button>
          </div>
        </form>
      )}
    </AppLayout>
  );
}
