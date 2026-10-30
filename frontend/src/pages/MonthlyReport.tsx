import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CloudUpload,
  FileText,
  Loader2,
  Save,
  Send,
  Undo2,
} from 'lucide-react';
import ReportRichTextEditor from '../components/ReportRichTextEditor';
import { reportHtml } from '../utils/reportRichText';
import AppLayout from '../components/layout/AppLayout';
import { createMonthlyStaffReport, getMonthlyStaffCurrent, recallReport } from '../api/reportApi';
import type { ReportPeriod, MonthlyStaffPayload } from '../types/report';
import type { User } from '../types/user';
import ConfirmModal from '../components/ui/ConfirmModal';
import { formatApiError } from '../utils/apiError';

function readUser() {
  const rawUser = localStorage.getItem('user');
  if (!rawUser) {
    throw new Error('Thiếu thông tin người dùng trong phiên đăng nhập');
  }
  return JSON.parse(rawUser) as Partial<User>;
}

function requireText(value: string | undefined, message: string) {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function getVietnamPlainDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return new Date(Date.UTC(year, month - 1, day));
}

function getMonthlyReportWindow() {
  const today = getVietnamPlainDate();
  const currentMonth = today.getUTCMonth() + 1;
  const currentYear = today.getUTCFullYear();
  const period = `Tháng ${currentMonth}/${currentYear}`;

  return {
    period,
  };
}

interface EditorSection {
  number: number;
  title: string;
  placeholder: string;
  fieldKey: 'content' | 'difficulties' | 'proposals' | 'nextTasks';
}

const SECTIONS: EditorSection[] = [
  {
    number: 1,
    title: 'Kết quả thực hiện',
    placeholder: 'Kết quả công tác nổi bật trong tháng...',
    fieldKey: 'content',
  },
  {
    number: 2,
    title: 'Khó khăn, vướng mắc',
    placeholder: 'Nêu rõ những khó khăn gặp phải trong quá trình thực hiện nhiệm vụ...',
    fieldKey: 'difficulties',
  },
  {
    number: 3,
    title: 'Kiến nghị, đề xuất',
    placeholder: 'Các đề xuất giải quyết vướng mắc (nếu có)...',
    fieldKey: 'proposals',
  },
  {
    number: 4,
    title: 'Nhiệm vụ trọng tâm thời gian tới',
    placeholder: 'Kế hoạch công tác cho tháng tiếp theo...',
    fieldKey: 'nextTasks',
  },
];

const initialForm = {
  content: '',
  difficulties: '',
  proposals: '',
  nextTasks: '',
};

export default function MonthlyReport() {
  const user = readUser();
  const reportWindow = useMemo(() => getMonthlyReportWindow(), []);
  const [form, setForm] = useState(initialForm);
  const [period, setPeriod] = useState<ReportPeriod | null>(null);
  const [reportId, setReportId] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Bản nháp chưa lưu');
  const [error, setError] = useState('');
  const [isRecallOpen, setIsRecallOpen] = useState(false);

  const handleRecallReport = async () => {
    if (!reportId) return;
    setSaving(true);
    setError('');
    try {
      const recalled = await recallReport(reportId);
      setReportStatus(recalled.status);
      setMessage('Đã thu hồi báo cáo. Trạng thái hiện tại: Nháp.');
      setIsRecallOpen(false);
    } catch (err) {
      setError(formatApiError(err, 'Không thu hồi được báo cáo'));
    } finally {
      setSaving(false);
    }
  };

  const sender = requireText(user.fullName, 'Thiếu họ tên người dùng trong phiên đăng nhập');
  const department = requireText(user.department, 'Thiếu đơn vị người dùng trong phiên đăng nhập');

  useEffect(() => {
    const loadCurrentReport = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getMonthlyStaffCurrent();
        setPeriod(data.period);
        if (data.report) {
          setReportId(data.report._id);
          setReportStatus(data.report.status);
          setForm({
            content: reportHtml(data.report.content, data.report.contentFormat),
            difficulties: reportHtml(data.report.difficulties, data.report.contentFormat),
            proposals: reportHtml(data.report.proposals, data.report.contentFormat),
            nextTasks: reportHtml(data.report.nextTasks, data.report.contentFormat),
          });
          setMessage(data.report.status === 'draft' ? 'Đã tải bản nháp từ MongoDB' : 'Báo cáo kỳ này đã nộp');
        }
      } catch (err) {
        setError(formatApiError(err, 'Không tải được kỳ báo cáo tháng'));
      } finally {
        setLoading(false);
      }
    };

    void loadCurrentReport();
  }, []);

  const updateField = (fieldName: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [fieldName]: value }));
  };

  const buildPayload = (status: MonthlyStaffPayload['status']): MonthlyStaffPayload => ({
    contentFormat: 'html-v1',
    periodId: period?._id,
    period: period?.title || reportWindow.period,
    sender,
    department,
    content: form.content.trim(),
    difficulties: form.difficulties.trim(),
    proposals: form.proposals.trim(),
    nextTasks: form.nextTasks.trim(),
    status,
  });

  const submitReport = async (status: MonthlyStaffPayload['status']) => {
    setSaving(true);
    setError('');

    try {
      const savedReport = await createMonthlyStaffReport(buildPayload(status));
      setReportId(savedReport._id);
      setReportStatus(savedReport.status);
      setMessage(status === 'draft' ? 'Đã lưu nháp vào MongoDB' : 'Đã nộp báo cáo vào MongoDB');
    } catch (err) {
      setError(formatApiError(err, status === 'draft' ? 'Không lưu được bản nháp' : 'Không nộp được báo cáo'));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const submitSavedReport = async () => {
    await submitReport('pending');
  };

  return (
    <AppLayout
      title={`Nhập liệu báo cáo ${period?.title || reportWindow.period} - ${department}`}
      subtitle="Soạn nội dung và lưu nháp trước khi gửi báo cáo."
      bottomStatus={
        <span className="hidden items-center gap-2 text-sm text-on-surface-variant md:flex">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {message}
        </span>
      }
      bottomBar={
        <>
          <button
            className="rounded-lg border border-outline px-4 py-2 text-sm md:text-base md:px-6 md:py-2.5 font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
            type="button"
          >
            Hủy bỏ
          </button>
          {reportStatus === 'pending' && period?.status === 'open' && (
            <button
              className="inline-flex items-center gap-1.5 md:gap-2 rounded-lg bg-error px-4 py-2 text-sm md:text-base md:px-6 md:py-2.5 font-semibold text-white shadow-level-1 transition-colors hover:bg-error/95 disabled:opacity-60"
              type="button"
              disabled={saving}
              onClick={() => setIsRecallOpen(true)}
            >
              {saving ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Undo2 className="h-4 w-4 md:h-5 md:w-5" />}
              Thu hồi báo cáo
            </button>
          )}
          <button
            className="inline-flex items-center gap-1.5 md:gap-2 rounded-lg bg-surface-container-high px-4 py-2 text-sm md:text-base md:px-6 md:py-2.5 font-semibold text-primary transition-colors hover:bg-surface-container-highest disabled:opacity-60"
            type="button"
            disabled={saving || loading || ((reportStatus !== '' && reportStatus !== 'draft') || period?.status !== 'open')}
            onClick={() => void submitReport('draft')}
          >
            {saving ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Save className="h-4 w-4 md:h-5 md:w-5" />}
            Lưu nháp
          </button>
          <button
            className="inline-flex items-center gap-1.5 md:gap-2 rounded-lg bg-primary px-4 py-2 text-sm md:text-base md:px-6 md:py-2.5 font-semibold text-white shadow-level-1 transition-colors hover:bg-primary-container disabled:opacity-60"
            type="button"
            disabled={saving || loading || ((reportStatus !== '' && reportStatus !== 'draft') || period?.status !== 'open')}
            onClick={() => void submitSavedReport()}
          >
            {saving ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Send className="h-4 w-4 md:h-5 md:w-5" />}
            Gửi báo cáo
          </button>
        </>
      }
    >
      <div className="mx-auto max-w-4xl">
        {error && (
          <div className="mb-4 rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}
        {loading && (
          <div className="mb-4 rounded-lg border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface-variant">
            Đang tải kỳ báo cáo và bản nháp...
          </div>
        )}

        <div className="mb-stack-md flex items-center gap-2 text-sm text-on-surface-variant">
          <FileText className="h-4 w-4" />
          <span>Báo cáo tháng</span>
          <span>/</span>
          <span className="font-semibold text-primary">{period?.title || reportWindow.period}</span>
        </div>

        <form className="space-y-stack-lg pb-8">
          <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-level-1 md:p-stack-lg">
            <div className="flex flex-col gap-stack-lg">
              {SECTIONS.map((section) => (
                <section key={section.number}>
                  <h3 className="mb-2 font-semibold">{section.number}. {section.title}</h3>
                  <ReportRichTextEditor id={`monthly-${section.fieldKey}`} ariaLabel={section.title} value={form[section.fieldKey]} format="html-v1"
                    placeholder={section.placeholder} onChange={(value) => updateField(section.fieldKey, value)}
                    disabled={loading || saving} readOnly={(reportStatus !== '' && reportStatus !== 'draft') || period?.status !== 'open'} />
                </section>
              ))}
            </div>
          </div>

          <section className="rounded-xl border border-outline-variant bg-white p-4 shadow-level-1 md:p-stack-lg">
            <div className="mb-stack-md flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h3 className="font-headline-sm text-base text-on-surface">Đính kèm minh chứng</h3>
              <span className="text-sm text-on-surface-variant">Hỗ trợ: Word, Excel, PDF, PNG/JPG (Max: 25MB)</span>
            </div>

            <button
              className="group flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-surface p-8 text-center transition-colors hover:border-primary hover:bg-surface-container-low"
              type="button"
            >
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high transition-colors group-hover:bg-primary-fixed">
                <CloudUpload className="h-8 w-8 text-primary" />
              </span>
              <span className="font-semibold text-on-surface">Kéo thả tệp vào đây</span>
              <span className="my-1 text-sm text-on-surface-variant">hoặc</span>
              <span className="rounded-lg border border-outline px-4 py-2 font-semibold text-primary transition-colors group-hover:bg-surface-container-high">
                Chọn tệp từ máy tính
              </span>
            </button>
          </section>
        </form>
      </div>
      <ConfirmModal
        isOpen={isRecallOpen}
        onClose={() => setIsRecallOpen(false)}
        onConfirm={handleRecallReport}
        title="Thu hồi báo cáo"
        message="Bạn có chắc chắn muốn thu hồi báo cáo đã nộp? Trạng thái sẽ quay về Nháp để bạn chỉnh sửa."
        confirmText="Thu hồi"
        cancelText="Hủy"
        isLoading={saving}
      />
    </AppLayout>
  );
}
