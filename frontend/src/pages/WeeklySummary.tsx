import { ReportRichTextView } from '../components/ReportRichTextEditor';
import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  FileText,
  Loader2,
  Save,
  Download,
  Wand2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import GroupedSummaryEditor from '../components/GroupedSummaryEditor';
import SourceFieldMapping from '../components/SourceFieldMapping';
import { weeklyLabel } from '../utils/weeklyLabel';
import {
  getWeeklySummary,
  generateWeeklySummary,
  updateWeeklySummary,
  exportWeeklySummaryDocx,
  exportWeeklySummaryPdf,
} from '../api/weeklySummaryApi';
import type {
  MissingEmployee,
  WeeklyEmployeeReport,
  WeeklySummary as IWeeklySummary,
  WeeklySummaryResponse,
  SummaryGroup,
} from '../api/weeklySummaryApi';
import { getCurrentPeriod, getPeriods } from '../api/periodApi';
import { returnReport } from '../api/reportApi';
import { formatApiError } from '../utils/apiError';
import type { ReportPeriod } from '../types/report';
import Dialog from '../components/ui/Dialog';
import type { DialogType } from '../components/ui/Dialog';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function WeeklySummaryPage() {
  const dirty = useRef(false);
  const busy = useRef(false);
  const query = useQuery();
  const navigate = useNavigate();
  const [periodId, setPeriodId] = useState(query.get('periodId') || '');
  const [form, setForm] = useState<Partial<IWeeklySummary>>({
    entries: [],
    periodTitle: '',
  });
  const [employeeReports, setEmployeeReports] = useState<WeeklyEmployeeReport[]>([]);
  const [missingEmployees, setMissingEmployees] = useState<MissingEmployee[]>([]);
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [groups, setGroups] = useState<SummaryGroup[]>([]);
  const [nextPeriodTitle, setNextPeriodTitle] = useState('');
  const [sourceIssues, setSourceIssues] = useState<NonNullable<WeeklySummaryResponse['sourceIssues']>>([]);
  const [fieldCoverage, setFieldCoverage] = useState({ expected: 8, submitted: 0 });
  const readOnly = selectedPeriod?.status === 'archived';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Dialog state
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: DialogType;
    title: string;
    message?: string;
    inputPlaceholder?: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: (val?: string) => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    onConfirm: () => {},
  });

  const closeDialog = () => setDialogState(prev => ({ ...prev, isOpen: false }));

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submissionStats, setSubmissionStats] = useState({ expected: 0, submitted: 0, missing: 0, late: 0, duplicateReports: 0 });

  const applyResponse = (data: WeeklySummaryResponse) => {
    dirty.current = false;
    setForm({
      sourceReportIds: data.summary.sourceReportIds,
      entries: data.summary.entries || [],
      periodTitle: data.summary.periodTitle,
    });
    setEmployeeReports(data.employeeReports);
    setMissingEmployees(data.missingEmployees);
    setSubmissionStats(data.submissionStats);
    setSelectedPeriod(data.period);
    setGroups(data.groups);
    setNextPeriodTitle(data.nextPeriodTitle);
    setSourceIssues(data.sourceIssues || []);
    setFieldCoverage(data.fieldCoverage || { expected: 8, submitted: 0 });
  };

  busy.current = saving || exporting || generating;
  useEffect(() => {
    if (!periodId) return;
    let active = true;
    let fetching = false;
    const timer = setInterval(async () => {
      if (fetching || busy.current) return;
      fetching = true;
      try {
        const data = await getWeeklySummary(periodId);
        if (!active || busy.current) return;
        if (!dirty.current && data.autoFilled) applyResponse(data);
        else {
          setEmployeeReports(data.employeeReports); setMissingEmployees(data.missingEmployees);
          setSubmissionStats(data.submissionStats); setSourceIssues(data.sourceIssues || []);
          setFieldCoverage(data.fieldCoverage || { expected: 8, submitted: 0 });
        }
      } catch { /* Preserve the current draft during a temporary refresh failure. */ }
      finally { fetching = false; }
    }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [periodId]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        let currentPeriodId = periodId;

        if (!currentPeriodId) {
          const currentWeekly = await getCurrentPeriod('weekly');
          if (!active) return;
          if (currentWeekly && currentWeekly._id) {
            currentPeriodId = currentWeekly._id;
            setPeriodId(currentPeriodId);
            navigate(`/weekly-summary?periodId=${currentPeriodId}`, { replace: true });
          } else {
            setError('Chưa có kỳ báo cáo tuần nào đang mở.');
            setLoading(false);
            return;
          }
        }

        const [weeklyPeriods, summary] = await Promise.all([
          getPeriods('weekly'),
          getWeeklySummary(currentPeriodId),
        ]);
        if (!active) return;
        setPeriods(weeklyPeriods);
        applyResponse(summary);
      } catch (err: unknown) {
        if (active) setError(formatApiError(err, 'Không tải được bản tổng hợp tuần'));
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();
    return () => { active = false; };
  }, [navigate, periodId]);

  const handleSave = async () => {
    if (!periodId) return false;
    setSaving(true);
    setError('');
    try {
      applyResponse(await updateWeeklySummary(periodId, form));
      setMessage('Đã lưu bản tổng hợp');
      return true;
    } catch (err: unknown) {
      setError(formatApiError(err, 'Không lưu được bản tổng hợp tuần'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!periodId) return;
    
    const submittedCount = submissionStats.submitted;
    const isEarly = submissionStats.expected > 0 && submittedCount < submissionStats.expected;
    const message = isEarly
      ? `Hiện có ${submittedCount}/${submissionStats.expected} nhân viên nộp đúng kỳ tuần này. Tổng hợp sẽ chỉ dùng các báo cáo đang hiển thị và ghi đè nội dung hiện tại.`
      : 'Tạo tổng hợp tự động sẽ ghi đè nội dung hiện tại bằng dữ liệu từ các báo cáo chuyên viên đã nộp. Bạn có chắc chắn?';

    setDialogState({
      isOpen: true,
      type: 'confirm',
      title: isEarly ? 'Tổng hợp báo cáo sớm' : 'Tạo tổng hợp tự động',
      message,
      confirmText: 'Đồng ý',
      onConfirm: async () => {
        closeDialog();
        setGenerating(true);
        setError('');
        try {
          applyResponse(await generateWeeklySummary(periodId));
          setMessage('Đã tổng hợp dữ liệu thành công');
        } catch (err: unknown) {
          setError(formatApiError(err, 'Không tạo được bản tổng hợp tuần'));
        } finally {
          setGenerating(false);
        }
      },
    });
  };

  const handleExport = async (format: 'docx' | 'pdf' = 'docx') => {
    if (!periodId) return;
    setExporting(true);
    setError('');
    try {
      if (!readOnly && !(await handleSave())) return;
      const blob = await (format === 'pdf' ? exportWeeklySummaryPdf(periodId) : exportWeeklySummaryDocx(periodId));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao-cao-${form.periodTitle?.replace(/\s+/g, '-').toLowerCase()}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(`Đã xuất file ${format.toUpperCase()}`);
    } catch (err: unknown) {
      let errorMessage = `Không xuất được file ${format.toUpperCase()}`;
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: unknown } }).response;
        if (response?.data instanceof Blob) {
        try {
          const text = await response.data.text();
          const json = JSON.parse(text);
          if (json.error) {
            errorMessage = `${json.error} · Mã lỗi: ${json.code || 'EXPORT_FAILED'}${json.requestId ? ` · Mã tra cứu: ${json.requestId}` : ''}`;
          }
        } catch { /* ignore */ }
        } else {
          errorMessage = formatApiError(err, errorMessage);
        }
      } else {
        errorMessage = formatApiError(err, errorMessage);
      }
      setError(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const handleReturn = async (reportId: string) => {
    setDialogState({
      isOpen: true,
      type: 'prompt',
      title: 'Trả lại báo cáo',
      message: 'Nhập lý do trả lại báo cáo này:',
      inputPlaceholder: 'Lý do...',
      confirmText: 'Trả về',
      isDanger: true,
      onConfirm: async (reason?: string) => {
        if (!reason) {
          closeDialog();
          return;
        }
        closeDialog();
        
        try {
          setLoading(true);
          await returnReport(reportId, reason);
          setMessage('Đã trả lại báo cáo cho nhân viên');
          // Remove from the list
          setEmployeeReports(current => current.filter(r => r._id !== reportId));
          applyResponse(await getWeeklySummary(periodId));
        } catch (err: unknown) {
          setError(formatApiError(err, 'Không trả lại được báo cáo'));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <AppLayout title="Tổng hợp báo cáo tuần" subtitle="Đang tải dữ liệu...">
        <div className="flex justify-center p-8 text-outline">Đang tải...</div>
      </AppLayout>
    );
  }

  if (!periodId) {
    return (
      <AppLayout title="Tổng hợp báo cáo tuần" subtitle="Lỗi tham số">
        <div className="p-4 bg-error-container text-error rounded-lg">Không tìm thấy kỳ báo cáo (thiếu periodId)</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`Tổng hợp báo cáo - ${form.periodTitle || 'Đang tải...'}`}
      subtitle="Chỉ tổng hợp báo cáo của chuyên viên thuộc đúng kỳ tuần đang chọn."
      bottomStatus={
        <span className="hidden items-center gap-2 text-sm text-on-surface-variant md:flex">
          {message && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          {message}
        </span>
      }
      actions={
        <div className="flex flex-wrap gap-3">
          <select
            className="min-w-56 rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
            value={periodId}
            disabled={saving || exporting || generating}
            onChange={(event) => {
              const nextPeriodId = event.target.value;
              setPeriodId(nextPeriodId);
              navigate(`/weekly-summary?periodId=${nextPeriodId}`, { replace: true });
            }}
            aria-label="Chọn kỳ báo cáo tuần"
          >
            {periods.map((period) => (
              <option key={period._id} value={period._id}>{weeklyLabel(period.startDate)} ({new Date(period.startDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })})</option>
            ))}
          </select>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-surface-container-high px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-surface-container-highest disabled:opacity-60"
            type="button"
            disabled={generating || saving || exporting || loading || readOnly}
            onClick={() => void handleGenerate()}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Tạo tổng hợp tự động
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-60"
            type="button"
            disabled={exporting || saving || generating || loading}
            onClick={() => void handleExport('docx')}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {readOnly ? 'Xuất DOCX' : 'Lưu & Xuất DOCX'}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-60"
            type="button" disabled={exporting || saving || generating || loading} onClick={() => void handleExport('pdf')}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {readOnly ? 'Xuất PDF' : 'Lưu & Xuất PDF'}
          </button>
        </div>
      }
      bottomBar={
        <>
          <Dialog
            isOpen={dialogState.isOpen}
            type={dialogState.type}
            title={dialogState.title}
            message={dialogState.message}
            inputPlaceholder={dialogState.inputPlaceholder}
            confirmText={dialogState.confirmText}
            cancelText={dialogState.cancelText}
            isDanger={dialogState.isDanger}
            onConfirm={dialogState.onConfirm}
            onCancel={closeDialog}
          />
          <button
            className="inline-flex items-center gap-1.5 md:gap-2 rounded-lg bg-primary px-4 py-2 text-sm md:text-base md:px-6 md:py-2.5 font-semibold text-white shadow-level-1 transition-colors hover:bg-primary-container disabled:opacity-60"
            type="button"
            disabled={saving || exporting || generating || loading || readOnly}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Save className="h-4 w-4 md:h-5 md:w-5" />}
            Lưu bản tổng hợp
          </button>
        </>
      }
    >
      <div className="mx-auto max-w-5xl">
        {error && (
          <div className="mb-4 rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}
        {loading && (
          <div className="mb-4 rounded-lg border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface-variant">
            Đang tải dữ liệu...
          </div>
        )}

        <div className="mb-stack-md flex items-center gap-2 text-sm text-on-surface-variant">
          <FileText className="h-4 w-4" />
          <span>Tổng hợp báo cáo</span>
          <span>/</span>
          <span className="font-semibold text-primary">{form.periodTitle}</span>
          {selectedPeriod && (
            <span>
              ({new Date(selectedPeriod.startDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
              {' - '}
              {new Date(selectedPeriod.dueDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })})
            </span>
          )}
        </div>

        <p className="mb-3 text-sm text-on-surface-variant">Đã có nguồn cho {fieldCoverage.submitted}/{fieldCoverage.expected} lĩnh vực.</p>
        {sourceIssues.length > 0 && <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Nguồn báo cáo có {sourceIssues.length} vấn đề thiếu/trùng mã lĩnh vực. Đối soát ở danh sách báo cáo bên cạnh trước khi tạo tổng hợp; nội dung đang soạn không tự bị thay đổi.
          <ul className="mt-2 list-disc pl-5">{sourceIssues.map((issue, index) => <li key={index}>{employeeReports.find((report) => report._id === issue.reportId)?.sender || issue.reportId}: {issue.code === 'DUPLICATE_FIELD_SOURCE' ? `Trùng ${issue.fieldCode}` : 'Chưa có mã lĩnh vực hợp lệ'}</li>)}</ul>
        </div>}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Dự kiến', submissionStats.expected],
            ['Đã nộp', submissionStats.submitted],
            ['Chưa nộp', submissionStats.missing],
            ['Nộp trễ', submissionStats.late],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-outline-variant bg-white px-4 py-3">
              <div className="text-xs text-on-surface-variant">{label}</div>
              <div className="mt-1 text-xl font-semibold text-on-surface">{value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 pb-8">
          <form className="min-w-0 flex-1 space-y-stack-lg" onSubmit={(event) => event.preventDefault()}>
            <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-level-1 md:p-stack-lg">
              <div className="flex flex-col gap-stack-lg">
                <GroupedSummaryEditor entries={form.entries || []} groups={groups} currentTitle={form.periodTitle || ''} nextTitle={nextPeriodTitle} readOnly={readOnly || saving || exporting || generating} onChange={(entries) => { dirty.current = true; setForm((current) => ({ ...current, entries })); }} />
              </div>
            </div>
          </form>

          {/* Sidebar for Employee Reports */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="sticky top-24 rounded-xl border border-outline-variant bg-white p-4 shadow-level-1">
              <h3 className="mb-4 font-headline-sm text-base font-semibold text-on-surface">
                Báo cáo đúng kỳ ({employeeReports.length})
              </h3>
              {employeeReports.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Chưa có báo cáo nào được nộp trong kỳ này.</p>
              ) : (
                <div className="flex max-h-[600px] flex-col gap-3 overflow-y-auto pr-1">
                  {employeeReports.map((r) => (
                    <div key={r._id} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between text-left"
                        onClick={() => setExpandedReportId(expandedReportId === r._id ? null : r._id)}
                      >
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                            {r.sender}
                            {r.isLate && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">Nộp trễ</span>}
                          </div>
                          <div className="text-xs text-on-surface-variant">{r.department}</div>
                        </div>
                        {expandedReportId === r._id ? (
                          <ChevronUp className="h-4 w-4 text-on-surface-variant" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-on-surface-variant" />
                        )}
                      </button>

                      {expandedReportId === r._id && (
                        <div className="mt-3 border-t border-outline-variant pt-3 text-sm text-on-surface whitespace-pre-wrap">
                          <div className="font-semibold mb-1">Kết quả thực hiện:</div>
                          <div className="mb-3"><ReportRichTextView value={r.content} format={r.contentFormat} /></div>
                          
                          {r.difficulties && (
                            <>
                              <div className="font-semibold mb-1">Khó khăn:</div>
                              <div className="mb-3"><ReportRichTextView value={r.difficulties} format={r.contentFormat} /></div>
                            </>
                          )}
                          
                          {r.proposals && (
                            <>
                              <div className="font-semibold mb-1">Đề xuất:</div>
                              <div className="mb-3"><ReportRichTextView value={r.proposals} format={r.contentFormat} /></div>
                            </>
                          )}
                          
                          {r.nextTasks && (
                            <>
                              <div className="font-semibold mb-1">Nhiệm vụ tới:</div>
                              <div className="mb-3"><ReportRichTextView value={r.nextTasks} format={r.contentFormat} /></div>
                            </>
                          )}
                          <SourceFieldMapping reportId={r._id} readOnly={Boolean(readOnly)} onSaved={async () => {
                            const data = await getWeeklySummary(periodId);
                            setEmployeeReports(data.employeeReports); setSourceIssues(data.sourceIssues || []);
                            setFieldCoverage(data.fieldCoverage || { expected: 8, submitted: 0 });
                            setMessage('Đã cập nhật mã nguồn. Tạo tổng hợp khi đã đối soát xong.');
                          }} />
                          
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => void handleReturn(r._id)}
                              disabled={loading || readOnly || saving || exporting || generating}
                              className="inline-flex items-center gap-2 rounded-lg bg-error-container px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error/20 disabled:opacity-60"
                            >
                              Trả về (Yêu cầu sửa)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {missingEmployees.length > 0 && (
                <div className="mt-5 border-t border-outline-variant pt-4">
                  <h4 className="mb-2 text-sm font-semibold text-on-surface">Chưa nộp ({missingEmployees.length})</h4>
                  <ul className="space-y-2 text-sm text-on-surface-variant">
                    {missingEmployees.map((employee) => (
                      <li key={employee._id}>
                        <div className="font-medium text-on-surface">{employee.fullName}</div>
                        <div className="text-xs">{employee.department}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
