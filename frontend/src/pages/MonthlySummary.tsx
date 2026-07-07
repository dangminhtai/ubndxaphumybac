import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
  getMonthlySummary,
  generateMonthlySummary,
  updateMonthlySummary,
  exportMonthlySummaryDocx,
} from '../api/monthlySummaryApi';
import type { MonthlySummary as IMonthlySummary } from '../api/monthlySummaryApi';
import { getCurrentPeriod } from '../api/periodApi';
import { returnReport } from '../api/reportApi';
import Dialog from '../components/ui/Dialog';
import type { DialogType } from '../components/ui/Dialog';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

interface EditorSection {
  title: string;
  placeholder: string;
  heightClass: string;
  fieldKey: keyof IMonthlySummary;
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

function Toolbar() {
  return (
    <div className="flex items-center gap-2 rounded-t-lg border-b border-outline-variant bg-surface-container-low p-2">
      <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" type="button">
        <Bold className="h-4 w-4" />
      </button>
      <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" type="button">
        <Italic className="h-4 w-4" />
      </button>
      <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" type="button">
        <Underline className="h-4 w-4" />
      </button>
      <div className="mx-1 h-5 w-px bg-outline-variant" />
      <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" type="button">
        <List className="h-4 w-4" />
      </button>
      <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" type="button">
        <ListOrdered className="h-4 w-4" />
      </button>
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
  return (
    <section>
      <div className="mb-stack-sm flex items-center gap-2">
        <h3 className="font-headline-sm text-base text-on-surface font-semibold">{section.title}</h3>
      </div>
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface focus-within:border-primary">
        <Toolbar />
        <textarea
          className={`${section.heightClass} w-full resize-y border-none bg-transparent p-4 font-doc-preview text-doc-preview text-on-surface outline-none`}
          placeholder={section.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </section>
  );
}

export default function MonthlySummaryPage() {
  const query = useQuery();
  const [periodId, setPeriodId] = useState(query.get('periodId') || '');
  const [form, setForm] = useState<Partial<IMonthlySummary>>({
    content: '',
    difficulties: '',
    proposals: '',
    nextTasks: '',
    periodTitle: '',
  });
  const [employeeReports, setEmployeeReports] = useState<any[]>([]);
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        let currentPeriodId = periodId;

        if (!currentPeriodId) {
          const currentMonthly = await getCurrentPeriod('monthly');
          if (currentMonthly && currentMonthly._id) {
            currentPeriodId = currentMonthly._id;
            setPeriodId(currentPeriodId);
          } else {
            setError('Chưa có kỳ báo cáo tháng nào đang mở.');
            setLoading(false);
            return;
          }
        }

        const data = await getMonthlySummary(currentPeriodId);
        setForm({
          content: data.content || '',
          difficulties: data.difficulties || '',
          proposals: data.proposals || '',
          nextTasks: data.nextTasks || '',
          periodTitle: data.periodTitle,
        });
        if (data.employeeReports) {
          setEmployeeReports(data.employeeReports);
        }
      } catch (err: any) {
        setError('Lỗi tải bản tổng hợp: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [periodId]);

  const updateField = (fieldName: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [fieldName]: value }));
  };

  const handleSave = async () => {
    if (!periodId) return;
    setSaving(true);
    setError('');
    try {
      await updateMonthlySummary(periodId, form);
      setMessage('Đã lưu bản tổng hợp');
    } catch (err: any) {
      setError('Lỗi khi lưu: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!periodId) return;
    
    setDialogState({
      isOpen: true,
      type: 'confirm',
      title: 'Tạo tổng hợp tự động',
      message: 'Tạo tổng hợp tự động sẽ ghi đè nội dung hiện tại bằng dữ liệu từ các báo cáo chuyên viên đã nộp. Bạn có chắc chắn?',
      confirmText: 'Đồng ý',
      onConfirm: async () => {
        closeDialog();
        setGenerating(true);
        setError('');
        try {
          const data = await generateMonthlySummary(periodId);
          setForm({
            content: data.content || '',
            difficulties: data.difficulties || '',
            proposals: data.proposals || '',
            nextTasks: data.nextTasks || '',
            periodTitle: data.periodTitle,
          });
          setMessage('Đã tổng hợp dữ liệu thành công');
        } catch (err: any) {
          setError('Lỗi khi tổng hợp: ' + (err.response?.data?.error || err.message));
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
      await handleSave(); // Save before export
      const blob = await exportMonthlySummaryDocx(periodId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tong-hop-bao-cao-${form.periodTitle?.replace(/\s+/g, '-').toLowerCase()}.docx`;
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
        } catch (err: any) {
          setError('Lỗi khi trả lại báo cáo: ' + (err.response?.data?.error || err.message));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <AppLayout title="Tổng hợp báo cáo tháng" subtitle="Đang tải dữ liệu...">
        <div className="flex justify-center p-8 text-outline">Đang tải...</div>
      </AppLayout>
    );
  }

  if (!periodId) {
    return (
      <AppLayout title="Tổng hợp báo cáo tháng" subtitle="Lỗi tham số">
        <div className="p-4 bg-error-container text-error rounded-lg">Không tìm thấy kỳ báo cáo (thiếu periodId)</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`Tổng hợp báo cáo - ${form.periodTitle || 'Đang tải...'}`}
      subtitle="Quản lý và tổng hợp dữ liệu báo cáo tháng từ các chuyên viên."
      bottomStatus={
        <span className="hidden items-center gap-2 text-sm text-on-surface-variant md:flex">
          {message && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          {message}
        </span>
      }
      actions={
        <div className="flex flex-wrap gap-3">
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
                Báo cáo nhân viên ({employeeReports.length})
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
                          <div className="text-sm font-semibold text-primary">{r.sender}</div>
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
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
