import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Save,
  Send,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { createWeeklyReport, exportWeeklyReportDocxById, getCurrentWeeklyReport, submitWeeklyReport } from '../api/reportApi';
import type { ReportPeriod, WeeklyReportPayload } from '../types/report';
import type { User } from '../types/user';

function readUser() {
  return JSON.parse(localStorage.getItem('user') || '{}') as Partial<User>;
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

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatSlashDate(date: Date) {
  return `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
}

function formatVietnamDate(date: Date) {
  return `ngày ${date.getUTCDate()} tháng ${date.getUTCMonth() + 1} năm ${date.getUTCFullYear()}`;
}

function getWeekLabelFromThursday(thursday: Date) {
  const weekNumber = Math.floor((thursday.getUTCDate() - 1) / 7) + 1;
  return `Tuần ${String(weekNumber).padStart(2, '0')} tháng ${thursday.getUTCMonth() + 1} năm ${thursday.getUTCFullYear()}`;
}

function getActivityLabel(period: string) {
  return period.replace(/ năm \d{4}$/i, '');
}

function getCurrentReportWindow() {
  const today = getVietnamPlainDate();
  const dayOfWeek = today.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = addDays(today, -daysSinceMonday);
  const thursday = addDays(monday, 3);
  const nextThursday = addDays(thursday, 7);
  const period = getWeekLabelFromThursday(thursday);
  const nextPeriod = getWeekLabelFromThursday(nextThursday);

  return {
    period,
    nextPeriod,
    activityPeriod: getActivityLabel(period),
    reportTitle: `BÁO CÁO CÔNG TÁC ${period.toUpperCase()}`,
    startDate: toIsoDate(monday),
    endDate: toIsoDate(thursday),
    dueDate: toIsoDate(thursday),
    dateRange: `(Từ ngày ${formatSlashDate(monday)} đến ngày ${formatSlashDate(thursday)})`,
    dueDateLabel: formatVietnamDate(thursday),
  };
}

const initialForm = {
  administrativeReform: '',
  digitalTransformation: '',
  nextTasks: '',
};

export default function EmployeeReport() {
  const user = readUser();
  const reportWindow = useMemo(() => getCurrentReportWindow(), []);
  const [form, setForm] = useState(initialForm);
  const [period, setPeriod] = useState<ReportPeriod | null>(null);
  const [reportId, setReportId] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('Bản nháp chưa lưu');
  const [error, setError] = useState('');

  const sender = user.fullName || 'Nguyễn Văn A';
  const department = 'PHÒNG VĂN HÓA - XÃ HỘI';
  const field = 'Cải cách hành chính, Khoa học công nghệ và Chuyển đổi số';

  useEffect(() => {
    const loadCurrentReport = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getCurrentWeeklyReport();
        setPeriod(data.period);
        if (data.report) {
          setReportId(data.report._id);
          setReportStatus(data.report.status);
          setForm({
            administrativeReform: data.report.administrativeReform || '',
            digitalTransformation: data.report.digitalTransformation || '',
            nextTasks: data.report.nextTasks || '',
          });
          setMessage(data.report.status === 'draft' ? 'Đã tải bản nháp từ MongoDB' : 'Báo cáo kỳ này đã nộp');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Chưa có kỳ báo cáo tuần đang mở. Admin cần tạo và mở kỳ báo cáo trước.');
      } finally {
        setLoading(false);
      }
    };

    void loadCurrentReport();
  }, []);

  const updateField = (fieldName: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [fieldName]: value }));
  };

  const buildPayload = (status: WeeklyReportPayload['status']): WeeklyReportPayload => ({
    periodId: period?._id,
    period: period?.title || reportWindow.period,
    nextPeriod: reportWindow.nextPeriod,
    reportTitle: `BÁO CÁO CÔNG TÁC ${(period?.title || reportWindow.period).toUpperCase()}`,
    startDate: period?.startDate?.slice(0, 10) || reportWindow.startDate,
    endDate: period?.dueDate?.slice(0, 10) || reportWindow.endDate,
    sender,
    department,
    field,
    content: [form.administrativeReform.trim(), form.digitalTransformation.trim()].filter(Boolean).join('\n'),
    administrativeReform: form.administrativeReform.trim(),
    digitalTransformation: form.digitalTransformation.trim(),
    nextTasks: form.nextTasks.trim(),
    dueDate: period?.dueDate?.slice(0, 10) || reportWindow.dueDate,
    status,
  });

  const submitReport = async (status: WeeklyReportPayload['status']) => {
    setSaving(true);
    setError('');

    try {
      const savedReport = await createWeeklyReport(buildPayload(status));
      setReportId(savedReport._id);
      setReportStatus(savedReport.status);
      setMessage(status === 'draft' ? 'Đã lưu nháp vào MongoDB' : 'Đã nộp báo cáo vào MongoDB');
    } catch (err) {
      setError(status === 'draft' ? 'Không lưu được bản nháp' : 'Không nộp được báo cáo');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const exportDocx = async () => {
    setExporting(true);
    setError('');

    try {
      const savedReportId = reportId || (await createWeeklyReport(buildPayload('draft')))._id;
      setReportId(savedReportId);
      const blob = await exportWeeklyReportDocxById(savedReportId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileTitle = `BÁO CÁO CÔNG TÁC ${(period?.title || reportWindow.period).toUpperCase()}`;
      link.href = url;
      link.download = `${fileTitle.toLowerCase().replace(/\s+/g, '-')}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage('Đã xuất file DOCX');
    } catch (err: any) {
      let errorMessage = 'Không xuất được file DOCX';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.error) errorMessage = json.error;
        } catch { /* ignore */ }
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      setError(errorMessage);
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const submitSavedReport = async () => {
    if (reportId && reportStatus === 'draft') {
      setSaving(true);
      setError('');
      try {
        const report = await submitWeeklyReport(reportId);
        setReportStatus(report.status);
        setMessage('Đã nộp báo cáo vào MongoDB');
      } catch {
        setError('Không nộp được báo cáo');
      } finally {
        setSaving(false);
      }
      return;
    }

    await submitReport('pending');
  };

  return (
    <AppLayout
      title="Nhập báo cáo cho nhân viên"
      subtitle="Biểu mẫu web bám theo cấu trúc template Word chính."
      actions={
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-60"
            type="button"
            disabled={saving || loading || reportStatus !== '' && reportStatus !== 'draft'}
            onClick={() => void submitReport('draft')}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu nháp
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-surface-container-high px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-surface-container-highest"
            type="button"
          >
            <Eye className="h-4 w-4" />
            Xem trước
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-container disabled:opacity-60"
            type="button"
            disabled={exporting || loading}
            onClick={() => void exportDocx()}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Xuất DOCX
          </button>
        </div>
      }
      bottomStatus={
        <span className="hidden items-center gap-2 text-sm text-on-surface-variant sm:flex">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {message}
        </span>
      }
      bottomBar={
        <>
          <button
            className="rounded-lg border border-outline-variant px-5 py-2.5 font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-white shadow-level-1 transition-colors hover:bg-primary-container disabled:opacity-60"
            type="button"
            disabled={saving || loading || reportStatus !== '' && reportStatus !== 'draft'}
            onClick={() => void submitSavedReport()}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            Nộp báo cáo
          </button>
        </>
      }
    >
      <div className="mx-auto max-w-4xl">
        {error && (
          <div className="mb-4 rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm text-error">
            {error}. Kiểm tra backend port 5002 và kết nối MongoDB.
          </div>
        )}
        {loading && (
          <div className="mb-4 rounded-lg border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface-variant">
            Đang tải kỳ báo cáo và bản nháp...
          </div>
        )}

        <form className="space-y-6 pb-8">
          <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-level-1">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="text-center">
                <p className="font-semibold uppercase">{department}</p>
                <p className="font-semibold uppercase">CẢI CÁCH HÀNH CHÍNH, KHOA HỌC CÔNG NGHỆ</p>
              </div>
              <div className="text-center">
                <p className="font-semibold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-semibold">Độc lập - Tự do - Hạnh phúc</p>
              </div>
            </div>

            <p className="mt-6 text-right italic">Phù Mỹ Bắc, {reportWindow.dueDateLabel}</p>

            <div className="mt-6 text-center">
              <h3 className="text-xl font-bold uppercase text-on-surface">
                BÁO CÁO CÔNG TÁC {(period?.title || reportWindow.period).toUpperCase()}
              </h3>
              <p className="mt-1 font-semibold">
                {period
                  ? `(Từ ngày ${formatSlashDate(new Date(period.startDate))} đến ngày ${formatSlashDate(new Date(period.dueDate))})`
                  : reportWindow.dateRange}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-level-1">
            <h3 className="mb-4 border-b border-outline-variant pb-2 font-headline-sm text-base font-bold uppercase text-primary">
              I. Tình hình hoạt động {reportWindow.activityPeriod}
            </h3>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block font-semibold text-on-surface">1. Cải cách hành chính</label>
                <textarea
                  className="min-h-[160px] w-full resize-y rounded-md border border-outline-variant bg-surface p-4 text-sm text-on-surface outline-none placeholder:text-outline focus:border-primary"
                  placeholder="Nhập các nội dung theo từng dòng. Khi xuất Word, mỗi dòng sẽ thành một gạch đầu dòng."
                  value={form.administrativeReform}
                  onChange={(event) => updateField('administrativeReform', event.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold text-on-surface">2. Khoa học công nghệ và Chuyển đổi số</label>
                <textarea
                  className="min-h-[160px] w-full resize-y rounded-md border border-outline-variant bg-surface p-4 text-sm text-on-surface outline-none placeholder:text-outline focus:border-primary"
                  placeholder="Nhập các nội dung theo từng dòng. Khi xuất Word, mỗi dòng sẽ thành một gạch đầu dòng."
                  value={form.digitalTransformation}
                  onChange={(event) => updateField('digitalTransformation', event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-level-1">
            <h3 className="mb-3 border-b border-outline-variant pb-2 font-headline-sm text-base font-bold uppercase text-primary">
              II. Phương hướng, nhiệm vụ {reportWindow.nextPeriod}
            </h3>
            <p className="mb-3 text-sm text-on-surface-variant">
              Trong {reportWindow.nextPeriod.toLowerCase()}, sẽ tập trung vào các nhiệm vụ cụ thể như sau:
            </p>
            <textarea
              className="min-h-[150px] w-full resize-y rounded-md border border-outline-variant bg-surface p-4 text-sm text-on-surface outline-none placeholder:text-outline focus:border-primary"
              placeholder="Nhập nhiệm vụ tuần sau theo từng dòng."
              value={form.nextTasks}
              onChange={(event) => updateField('nextTasks', event.target.value)}
            />
          </section>

          <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-level-1">
            <p>
              Trên đây là báo cáo tình hình hoạt động lĩnh vực {field} được thực hiện vào {reportWindow.activityPeriod.toLowerCase()} và
              phương hướng hoạt động {reportWindow.nextPeriod.toLowerCase()} của chuyên viên phụ trách.
            </p>
            <p className="mt-2">Kính báo cáo lãnh đạo Phòng biết và chỉ đạo./.</p>
            <div className="mt-8 text-right">
              <p className="font-semibold">Người báo cáo</p>
              <p className="mt-12 font-semibold">{sender}</p>
            </div>
          </section>
        </form>
      </div>
    </AppLayout>
  );
}
