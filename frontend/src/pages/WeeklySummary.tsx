import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bold,
  CheckCircle2,
  FileText,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Save,
  Download,
  Underline,
  Wand2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import {
  getWeeklySummary,
  generateWeeklySummary,
  updateWeeklySummary,
  exportWeeklySummaryDocx,
} from '../api/weeklySummaryApi';
import type {
  MissingEmployee,
  WeeklyEmployeeReport,
  WeeklySummary as IWeeklySummary,
  WeeklySummaryResponse,
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

interface EditorSection {
  title: string;
  placeholder: string;
  heightClass: string;
  fieldKey: keyof IWeeklySummary;
}

const SECTIONS: EditorSection[] = [
  {
    title: 'Kết quả thực hiện',
    placeholder: 'Nhập nội dung tổng hợp...',
    heightClass: 'min-h-[250px]',
    fieldKey: 'content',
  },
  {
    title: 'Khó khăn, vướng mắc',
    placeholder: 'Nhập khó khăn...',
    heightClass: 'min-h-[150px]',
    fieldKey: 'difficulties',
  },
  {
    title: 'Kiến nghị, đề xuất',
    placeholder: 'Nhập kiến nghị...',
    heightClass: 'min-h-[150px]',
    fieldKey: 'proposals',
  },
  {
    title: 'Nhiệm vụ trọng tâm thời gian tới',
    placeholder: 'Nhập nhiệm vụ...',
    heightClass: 'min-h-[150px]',
    fieldKey: 'nextTasks',
  },
];

function Toolbar({
  textareaRef,
  onChange,
  orderedList = false,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (val: string) => void;
  orderedList?: boolean;
}) {
  const handleFormat = (type: 'bold' | 'italic' | 'underline' | 'list' | 'ordered-list') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = '';
    switch (type) {
      case 'bold':
        replacement = `**${selectedText || 'in đậm'}**`;
        break;
      case 'italic':
        replacement = `*${selectedText || 'in nghiêng'}*`;
        break;
      case 'underline':
        replacement = `<u>${selectedText || 'gạch chân'}</u>`;
        break;
      case 'list': {
        const lines = selectedText.split('\n');
        replacement = lines.map(line => line.startsWith('- ') ? line : `- ${line}`).join('\n');
        if (!selectedText) replacement = '- ';
        break;
      }
      case 'ordered-list': {
        const lines = selectedText.split('\n');
        replacement = lines.map((line, idx) => {
          const prefix = `${idx + 1}. `;
          return line.startsWith(prefix) ? line : `${prefix}${line}`;
        }).join('\n');
        if (!selectedText) replacement = '1. ';
        break;
      }
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
    }, 0);
  };

  return (
    <div className="flex items-center gap-2 rounded-t-lg border-b border-outline-variant bg-surface-container-low p-2">
      <button
        className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high transition-colors"
        type="button"
        title="In đậm (Bold)"
        onClick={() => handleFormat('bold')}
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high transition-colors"
        type="button"
        title="In nghiêng (Italic)"
        onClick={() => handleFormat('italic')}
      >
        <Italic className="h-4 w-4" />
      </button>
      <button
        className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high transition-colors"
        type="button"
        title="Gạch chân (Underline)"
        onClick={() => handleFormat('underline')}
      >
        <Underline className="h-4 w-4" />
      </button>
      <div className="mx-1 h-5 w-px bg-outline-variant" />
      <button
        className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high transition-colors"
        type="button"
        title="Danh sách gạch đầu dòng"
        onClick={() => handleFormat('list')}
      >
        <List className="h-4 w-4" />
      </button>
      {orderedList && (
        <button
          className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high transition-colors"
          type="button"
          title="Danh sách đánh số"
          onClick={() => handleFormat('ordered-list')}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ReportEditor({
  section,
  value,
  onChange,
}: {
  section: EditorSection;
  value: string;
  onChange: (val: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <section>
      <div className="mb-stack-sm flex items-center gap-2">
        <h3 className="font-headline-sm text-base text-on-surface font-semibold">{section.title}</h3>
      </div>
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface focus-within:border-primary">
        <Toolbar textareaRef={textareaRef} onChange={onChange} orderedList={true} />
        <textarea
          ref={textareaRef}
          className={`${section.heightClass} w-full resize-y border-none bg-transparent p-4 font-doc-preview text-doc-preview text-on-surface outline-none`}
          placeholder={section.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </section>
  );
}

export default function WeeklySummaryPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const [periodId, setPeriodId] = useState(query.get('periodId') || '');
  const [form, setForm] = useState<Partial<IWeeklySummary>>({
    content: '',
    difficulties: '',
    proposals: '',
    nextTasks: '',
    periodTitle: '',
  });
  const [employeeReports, setEmployeeReports] = useState<WeeklyEmployeeReport[]>([]);
  const [missingEmployees, setMissingEmployees] = useState<MissingEmployee[]>([]);
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  
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
    setForm({
      content: data.summary.content || '',
      difficulties: data.summary.difficulties || '',
      proposals: data.summary.proposals || '',
      nextTasks: data.summary.nextTasks || '',
      periodTitle: data.summary.periodTitle,
    });
    setEmployeeReports(data.employeeReports);
    setMissingEmployees(data.missingEmployees);
    setSubmissionStats(data.submissionStats);
    setSelectedPeriod(data.period);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        let currentPeriodId = periodId;

        if (!currentPeriodId) {
          const currentWeekly = await getCurrentPeriod('weekly');
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
        setPeriods(weeklyPeriods);
        applyResponse(summary);
      } catch (err: unknown) {
        setError(formatApiError(err, 'Không tải được bản tổng hợp tuần'));
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [navigate, periodId]);

  const updateField = (fieldName: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [fieldName]: value }));
  };

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

  const handleExport = async () => {
    if (!periodId) return;
    setExporting(true);
    setError('');
    try {
      if (!(await handleSave())) return;
      const blob = await exportWeeklySummaryDocx(periodId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tong-hop-bao-cao-tuan-${form.periodTitle?.replace(/\s+/g, '-').toLowerCase()}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage('Đã xuất file DOCX');
    } catch (err: unknown) {
      let errorMessage = 'Không xuất được file DOCX';
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
            onChange={(event) => {
              const nextPeriodId = event.target.value;
              setPeriodId(nextPeriodId);
              navigate(`/weekly-summary?periodId=${nextPeriodId}`, { replace: true });
            }}
            aria-label="Chọn kỳ báo cáo tuần"
          >
            {periods.map((period) => (
              <option key={period._id} value={period._id}>{period.title}</option>
            ))}
          </select>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-surface-container-high px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-surface-container-highest disabled:opacity-60"
            type="button"
            disabled={generating || loading}
            onClick={() => void handleGenerate()}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Tạo tổng hợp tự động
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-60"
            type="button"
            disabled={exporting || loading}
            onClick={() => void handleExport()}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Lưu & Xuất DOCX
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
            disabled={saving || loading}
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
          <form className="flex-1 space-y-stack-lg">
            <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-level-1 md:p-stack-lg">
              <div className="flex flex-col gap-stack-lg">
                {SECTIONS.map((section, idx) => (
                  <ReportEditor
                    key={idx}
                    section={section}
                    value={(form[section.fieldKey] as string) || ''}
                    onChange={(val) => updateField(section.fieldKey, val)}
                  />
                ))}
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
                          <div className="mb-3">{r.content || 'Không có'}</div>
                          
                          {r.difficulties && (
                            <>
                              <div className="font-semibold mb-1">Khó khăn:</div>
                              <div className="mb-3">{r.difficulties}</div>
                            </>
                          )}
                          
                          {r.proposals && (
                            <>
                              <div className="font-semibold mb-1">Đề xuất:</div>
                              <div className="mb-3">{r.proposals}</div>
                            </>
                          )}
                          
                          {r.nextTasks && (
                            <>
                              <div className="font-semibold mb-1">Nhiệm vụ tới:</div>
                              <div className="mb-3">{r.nextTasks}</div>
                            </>
                          )}
                          
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => void handleReturn(r._id)}
                              disabled={loading}
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
