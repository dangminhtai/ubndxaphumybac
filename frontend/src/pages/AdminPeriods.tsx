import { useEffect, useState } from 'react';
import { Archive as ArchiveIcon, CalendarClock, Check, Lock, Pencil, Unlock, X, Trash2, Sparkles, Plus } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Dialog from '../components/ui/Dialog';
import Modal from '../components/ui/Modal';
import { archivePeriod, getPeriods, lockPeriod, openPeriod, updatePeriodDueDate, deletePeriod, createPeriodManually, forceGeneratePeriod } from '../api/periodApi';
import type { ReportPeriod } from '../types/report';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Đang mở' },
    locked: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Đã khóa' },
    draft: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Nháp' },
    archived: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Lưu trữ' },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export default function AdminPeriods() {
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [editingId, setEditingId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [dialogState, setDialogState] = useState({ isOpen: false, periodId: '', action: '' });

  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');
  
  const [manualForm, setManualForm] = useState({
    type: 'weekly' as 'weekly' | 'monthly',
    title: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    weekNumber: 1,
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
  });

  // Auto-generate title based on inputs
  useEffect(() => {
    if (manualForm.type === 'weekly') {
      setManualForm(prev => ({
        ...prev,
        title: `Tuần ${String(prev.weekNumber).padStart(2, '0')} tháng ${prev.month} năm ${prev.year}`
      }));
    } else {
      setManualForm(prev => ({
        ...prev,
        title: `Tháng ${prev.month} năm ${prev.year}`
      }));
    }
  }, [manualForm.type, manualForm.weekNumber, manualForm.month, manualForm.year]);

  const loadPeriods = async () => {
    setPeriods(await getPeriods());
  };

  useEffect(() => {
    void loadPeriods();
  }, []);

  const saveNewDueDate = async (id: string) => {
    await updatePeriodDueDate(id, editDueDate);
    setEditingId('');
    await loadPeriods();
  };

  const startEdit = (period: ReportPeriod) => {
    setEditingId(period._id);
    setEditDueDate(new Date(period.dueDate).toISOString().slice(0, 10));
  };

  const handleForceGenerate = async (type: 'weekly' | 'monthly') => {
    setLoadingAction(true);
    setErrorMsg('');
    try {
      await forceGeneratePeriod(type);
      await loadPeriods();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Không thể tự động tạo kỳ báo cáo');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    setModalError('');
    try {
      await createPeriodManually({
        type: manualForm.type,
        title: manualForm.title,
        year: manualForm.year,
        month: manualForm.type === 'monthly' ? manualForm.month : undefined,
        weekNumber: manualForm.type === 'weekly' ? manualForm.weekNumber : undefined,
        startDate: manualForm.startDate,
        dueDate: manualForm.dueDate,
      });
      setIsManualModalOpen(false);
      await loadPeriods();
      // Reset form
      setManualForm({
        type: 'weekly',
        title: '',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        weekNumber: 1,
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
      });
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Không thể tạo kỳ báo cáo thủ công');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <AppLayout title="Quản lý kỳ báo cáo" subtitle="Hệ thống tự động tạo kỳ báo cáo tuần (Thứ 2 → Thứ 5). Admin có thể gia hạn, khóa hoặc lưu trữ.">
      <Dialog
        isOpen={dialogState.isOpen}
        type="confirm"
        title={dialogState.action === 'delete' ? 'Xóa kỳ báo cáo' : 'Lưu trữ kỳ báo cáo'}
        message={
          dialogState.action === 'delete'
            ? 'Bạn có chắc chắn muốn xóa kỳ báo cáo này? Việc này sẽ xóa toàn bộ các báo cáo thuộc kỳ này và KHÔNG THỂ HOÀN TÁC.'
            : 'Bạn có chắc muốn đưa kỳ báo cáo này vào lưu trữ vĩnh viễn?'
        }
        confirmText={dialogState.action === 'delete' ? 'Xóa' : 'Lưu trữ'}
        isDanger={true}
        onConfirm={async () => {
          const { periodId, action } = dialogState;
          setDialogState({ isOpen: false, periodId: '', action: '' });
          try {
            if (action === 'archive') {
              await archivePeriod(periodId);
            } else if (action === 'delete') {
              await deletePeriod(periodId);
            }
            await loadPeriods();
          } catch (err: any) {
            setErrorMsg(err.response?.data?.error || 'Đã xảy ra lỗi khi thực hiện thao tác');
          }
        }}
        onCancel={() => setDialogState({ isOpen: false, periodId: '', action: '' })}
      />
      <section className="rounded-xl border border-outline-variant bg-white p-4 shadow-level-1 md:p-5">
        {errorMsg && (
          <div className="mb-4 rounded-lg bg-error-container p-3 text-sm text-on-error-container">
            {errorMsg}
          </div>
        )}

        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Danh sách kỳ báo cáo</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void handleForceGenerate('weekly')}
              disabled={loadingAction}
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-surface-container-low disabled:opacity-50"
              type="button"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Tạo tự động tuần hiện tại
            </button>
            <button
              onClick={() => void handleForceGenerate('monthly')}
              disabled={loadingAction}
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-white px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-surface-container-low disabled:opacity-50"
              type="button"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Tạo tự động tháng hiện tại
            </button>
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-container"
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo thủ công
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {periods.length === 0 && (
            <p className="py-8 text-center text-sm text-on-surface-variant">Chưa có kỳ báo cáo nào.</p>
          )}

          {periods.map((period) => (
            <div key={period._id} className="flex flex-col gap-3 rounded-lg border border-outline-variant p-3 md:flex-row md:items-center md:justify-between md:p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{period.title}</span>
                  <StatusBadge status={period.status} />
                </div>
                <div className="text-sm text-on-surface-variant">
                  {new Date(period.startDate).toLocaleDateString('vi-VN')} → {new Date(period.dueDate).toLocaleDateString('vi-VN')}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Edit due date */}
                {period.status !== 'archived' && editingId !== period._id && (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-container-low"
                    type="button"
                    onClick={() => startEdit(period)}
                  >
                    <Pencil className="h-4 w-4 text-primary" />
                    Sửa hạn nộp
                  </button>
                )}

                {editingId === period._id && (
                  <div className="flex items-center gap-2">
                    <input
                      className="rounded-lg border border-primary bg-surface px-3 py-1.5 text-sm outline-none"
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                    />
                    <button
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                      type="button"
                      onClick={() => void saveNewDueDate(period._id)}
                    >
                      <Check className="h-4 w-4" />
                      Lưu
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-container-low"
                      type="button"
                      onClick={() => setEditingId('')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Status actions */}
                {period.status !== 'archived' && (
                  <>
                    {period.status !== 'open' && (
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-container-low" type="button" onClick={() => void openPeriod(period._id).then(loadPeriods)}>
                        <Unlock className="h-4 w-4 text-emerald-600" />
                        Mở
                      </button>
                    )}
                    {period.status !== 'locked' && (
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-container-low" type="button" onClick={() => void lockPeriod(period._id).then(loadPeriods)}>
                        <Lock className="h-4 w-4 text-amber-600" />
                        Khóa
                      </button>
                    )}
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-error transition-colors hover:bg-error-container hover:border-error"
                      type="button"
                      onClick={() => setDialogState({ isOpen: true, periodId: period._id, action: 'archive' })}
                    >
                      <ArchiveIcon className="h-4 w-4" />
                      Lưu trữ
                    </button>
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-error transition-colors hover:bg-error-container hover:border-error"
                      type="button"
                      onClick={() => setDialogState({ isOpen: true, periodId: period._id, action: 'delete' })}
                    >
                      <Trash2 className="h-4 w-4" />
                      Xóa
                    </button>
                  </>
                )}
                {period.status === 'archived' && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-1.5 text-sm font-medium text-on-surface-variant">
                      <ArchiveIcon className="h-4 w-4" />
                      Đã lưu trữ
                    </span>
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-error transition-colors hover:bg-error-container hover:border-error"
                      type="button"
                      onClick={() => setDialogState({ isOpen: true, periodId: period._id, action: 'delete' })}
                    >
                      <Trash2 className="h-4 w-4" />
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Tạo kỳ báo cáo thủ công"
        maxWidth="max-w-md"
      >
        <form onSubmit={(e) => void handleCreateManual(e)} className="space-y-4">
          {modalError && (
            <div className="rounded-lg bg-error-container p-3 text-xs text-on-error-container">
              {modalError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">Loại kỳ báo cáo *</label>
            <select
              value={manualForm.type}
              onChange={(e) => setManualForm(prev => ({ ...prev, type: e.target.value as 'weekly' | 'monthly' }))}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="weekly">Báo cáo tuần</option>
              <option value="monthly">Báo cáo tháng</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">Tiêu đề kỳ báo cáo *</label>
            <input
              type="text"
              required
              placeholder="VD: Tuần 02 tháng 7 năm 2026 hoặc Tháng 7 năm 2026"
              value={manualForm.title}
              onChange={(e) => setManualForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Năm *</label>
              <input
                type="number"
                required
                value={manualForm.year}
                onChange={(e) => setManualForm(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Tháng *</label>
              <input
                type="number"
                required
                min="1"
                max="12"
                value={manualForm.month}
                onChange={(e) => setManualForm(prev => ({ ...prev, month: Math.max(1, Math.min(12, parseInt(e.target.value) || 1)) }))}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            {manualForm.type === 'weekly' && (
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Số tuần *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="6"
                  value={manualForm.weekNumber}
                  onChange={(e) => setManualForm(prev => ({ ...prev, weekNumber: Math.max(1, Math.min(6, parseInt(e.target.value) || 1)) }))}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Từ ngày *</label>
              <input
                type="date"
                required
                value={manualForm.startDate}
                onChange={(e) => setManualForm(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Hạn nộp *</label>
              <input
                type="date"
                required
                value={manualForm.dueDate}
                onChange={(e) => setManualForm(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loadingAction}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-container disabled:opacity-50"
            >
              Tạo kỳ báo cáo
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
