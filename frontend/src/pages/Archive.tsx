import { useEffect, useState } from 'react';
import {
  Archive as ArchiveIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  FileText,
  Download,
  Search,
  X,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Dialog from '../components/ui/Dialog';
import { getArchivedReports, getArchivedReportById } from '../api/archiveApi';
import type { ArchivedReport, ArchiveResponse } from '../api/archiveApi';
import { exportWeeklyReportDocxById } from '../api/reportApi';
import { exportMonthlySummaryDocx } from '../api/monthlySummaryApi';

const REPORT_TYPES = [
  { value: '', label: 'Tất cả loại báo cáo' },
  { value: 'weekly', label: 'Báo cáo tuần' },
  { value: 'monthly_staff', label: 'Báo cáo tháng (Chuyên viên)' },
  { value: 'monthly_summary', label: 'Tổng hợp tháng' },
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function ReportRow({ report, onDownload, onView }: { report: ArchivedReport; onDownload: (r: ArchivedReport) => void; onView: (r: ArchivedReport) => void }) {
  return (
    <tr className="border-b border-outline-variant transition-colors hover:bg-surface-container-low">
      <td className="px-4 py-3 text-sm text-on-surface-variant whitespace-nowrap">
        {formatDateTime(report.submittedAt)}
      </td>
      <td className="px-4 py-3">
        <span className="rounded-md bg-surface-container-high px-2 py-0.5 text-xs font-medium text-on-surface">
          {report.periodInfo?.title || report.periodId}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
          <FileText className="h-3.5 w-3.5" />
          {REPORT_TYPES.find((t) => t.value === report.reportType)?.label || report.reportType}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-on-surface font-medium">
        {report.title}
      </td>
      <td className="px-4 py-3 text-sm text-on-surface-variant">
        {report.sender}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onView(report)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-surface-container-high"
            title="Xem nội dung"
          >
            <FileText className="h-4 w-4" />
            Xem
          </button>
          <button
            onClick={() => onDownload(report)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-surface-container-high"
            title="Tải DOCX"
          >
            <Download className="h-4 w-4" />
            Tải về
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Archive() {
  const [data, setData] = useState<ArchiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogState, setDialogState] = useState({ isOpen: false, title: '', message: '' });
  
  // View Report state
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [loadingView, setLoadingView] = useState(false);

  const closeDialog = () => setDialogState(prev => ({ ...prev, isOpen: false }));

  const [page, setPage] = useState(1);
  const [reportType, setReportType] = useState('');
  const [senderSearch, setSenderSearch] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState('');

  const fetchArchive = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getArchivedReports({
        page,
        limit: 20,
        reportType: reportType || undefined,
        sender: senderSearch || undefined,
        year: year ? parseInt(year) : undefined,
        month: month ? parseInt(month) : undefined,
      });
      setData(result);
    } catch {
      setError('Không tải được dữ liệu kho lưu trữ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchArchive();
  }, [page]);

  const handleFilter = () => {
    setPage(1);
    void fetchArchive();
  };

  const handleDownload = async (report: ArchivedReport) => {
    try {
      let blob: Blob;
      if (report.reportType === 'monthly_summary') {
        blob = await exportMonthlySummaryDocx(report.periodId);
      } else {
        blob = await exportWeeklyReportDocxById(report._id);
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.title.toLowerCase().replace(/\s+/g, '-')}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setDialogState({
        isOpen: true,
        title: 'Lỗi xuất file DOCX',
        message: 'Không thể tải DOCX: ' + (err.response?.data?.error || err.message),
      });
    }
  };

  const handleView = async (report: ArchivedReport) => {
    try {
      setLoadingView(true);
      const fullReport = await getArchivedReportById(report._id, report.reportType);
      setViewingReport(fullReport);
    } catch (err: any) {
      setDialogState({
        isOpen: true,
        title: 'Lỗi xem báo cáo',
        message: 'Không thể xem chi tiết: ' + (err.response?.data?.error || err.message),
      });
    } finally {
      setLoadingView(false);
    }
  };

  return (
    <AppLayout
      title="Kho lưu trữ"
      subtitle="Tra cứu và tải lại các báo cáo từ những kỳ báo cáo đã lưu trữ"
    >
      <Dialog
        isOpen={dialogState.isOpen}
        type="alert"
        title={dialogState.title}
        message={dialogState.message}
        onConfirm={closeDialog}
        onCancel={closeDialog}
      />
      {loadingView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-level-3">
            <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-on-surface">{viewingReport.title}</h2>
                <p className="text-sm text-on-surface-variant">Kỳ báo cáo: {viewingReport.periodInfo?.title}</p>
              </div>
              <button
                className="rounded-full p-2 transition-colors hover:bg-surface-container-highest"
                onClick={() => setViewingReport(null)}
              >
                <X className="h-5 w-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section>
                <h3 className="mb-3 font-semibold text-primary">1. Kết quả thực hiện</h3>
                <div className="prose prose-sm max-w-none text-on-surface" dangerouslySetInnerHTML={{ __html: viewingReport.content || '<p className="text-on-surface-variant italic">Không có nội dung</p>' }} />
              </section>
              <section>
                <h3 className="mb-3 font-semibold text-primary">2. Khó khăn, vướng mắc</h3>
                <div className="prose prose-sm max-w-none text-on-surface" dangerouslySetInnerHTML={{ __html: viewingReport.difficulties || '<p className="text-on-surface-variant italic">Không có nội dung</p>' }} />
              </section>
              <section>
                <h3 className="mb-3 font-semibold text-primary">3. Kiến nghị, đề xuất</h3>
                <div className="prose prose-sm max-w-none text-on-surface" dangerouslySetInnerHTML={{ __html: viewingReport.proposals || '<p className="text-on-surface-variant italic">Không có nội dung</p>' }} />
              </section>
              <section>
                <h3 className="mb-3 font-semibold text-primary">4. Nhiệm vụ trọng tâm thời gian tới</h3>
                <div className="prose prose-sm max-w-none text-on-surface" dangerouslySetInnerHTML={{ __html: viewingReport.nextTasks || '<p className="text-on-surface-variant italic">Không có nội dung</p>' }} />
              </section>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-level-1">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-on-surface">Bộ lọc tìm kiếm</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs text-on-surface-variant">Loại báo cáo</label>
              <select
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                {REPORT_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-on-surface-variant">Năm</label>
              <input
                type="number"
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="VD: 2026"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-on-surface-variant">Tháng</label>
              <select
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="">Tất cả</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-on-surface-variant">Người gửi</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-outline" />
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
                  placeholder="Tên người gửi..."
                  value={senderSearch}
                  onChange={(e) => setSenderSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-container"
                type="button"
                onClick={handleFilter}
              >
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-level-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-3 text-sm text-on-surface-variant">Đang tải dữ liệu lưu trữ...</span>
            </div>
          ) : data && data.data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-on-surface-variant">
                        Thời gian nộp
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-on-surface-variant">
                        Kỳ báo cáo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-on-surface-variant">
                        Loại
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-on-surface-variant">
                        Tên báo cáo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-on-surface-variant">
                        Người gửi
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-on-surface-variant">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((report) => (
                      <ReportRow 
                        key={report._id} 
                        report={report} 
                        onView={handleView}
                        onDownload={handleDownload} 
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-outline-variant px-4 py-3">
                <span className="text-sm text-on-surface-variant">
                  Hiển thị {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} / {data.total} báo cáo
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Trước
                  </button>
                  <span className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white">
                    {data.page}
                  </span>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
                    type="button"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sau
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
             <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
              <ArchiveIcon className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm font-medium">Kho lưu trữ trống hoặc không tìm thấy kết quả</p>
              <p className="text-xs">Chưa có báo cáo nào được lưu trữ khớp với bộ lọc</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
