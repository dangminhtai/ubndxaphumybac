import { useEffect, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  LogIn,
  FileText,
  CalendarDays,
  Users,
  Download,
  ClipboardList,
  CalendarClock,
  Search,
  AlertTriangle,
  Database,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { getAuditLogs, getSystemDiagnostics } from '../api/auditLogApi';
import type { AuditLogEntry, AuditLogResponse, SystemDiagnostics } from '../api/auditLogApi';

const CATEGORIES = [
  { value: '', label: 'Tất cả' },
  { value: 'auth', label: 'Xác thực' },
  { value: 'report', label: 'Báo cáo' },
  { value: 'period', label: 'Kỳ báo cáo' },
  { value: 'user', label: 'Tài khoản' },
  { value: 'export', label: 'DOCX' },
  { value: 'summary', label: 'Tổng hợp tháng' },
  { value: 'schedule', label: 'Lịch công tác' },
];

function getCategoryIcon(category: string) {
  switch (category) {
    case 'auth': return LogIn;
    case 'report': return FileText;
    case 'period': return CalendarDays;
    case 'user': return Users;
    case 'export': return Download;
    case 'summary': return ClipboardList;
    case 'schedule': return CalendarClock;
    default: return Activity;
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'auth': return 'bg-blue-100 text-blue-700';
    case 'report': return 'bg-emerald-100 text-emerald-700';
    case 'period': return 'bg-amber-100 text-amber-700';
    case 'user': return 'bg-purple-100 text-purple-700';
    case 'export': return 'bg-rose-100 text-rose-700';
    case 'summary': return 'bg-cyan-100 text-cyan-700';
    case 'schedule': return 'bg-indigo-100 text-indigo-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getActionCode(action: string) {
  const map: Record<string, string> = {
    login_success: 'LOGIN',
    login_failed: 'LOGIN_FAILED',
    logout: 'LOGOUT',
    user_created: 'ADD',
    user_disabled: 'DISABLE',
    password_reset: 'RESET_PASSWORD',
    password_changed: 'CHANGE_PASSWORD',
    report_saved_draft: 'MODIFY',
    report_submitted: 'SUBMIT',
    period_created: 'ADD',
    period_opened: 'UNLOCK',
    period_locked: 'LOCK',
    period_archived: 'ARCHIVE',
    docx_exported: 'EXPORT',
    summary_generated: 'ADD',
    summary_updated: 'MODIFY',
  };
  return map[action] || action.toUpperCase();
}

function getActionTitle(action: string) {
  const code = getActionCode(action);
  const map: Record<string, string> = {
    LOGIN: 'Đăng nhập',
    LOGIN_FAILED: 'Đăng nhập thất bại',
    LOGOUT: 'Đăng xuất',
    ADD: 'Thêm mới',
    EDIT: 'Chỉnh sửa',
    MODIFY: 'Cập nhật/sửa nội dung',
    DELETE: 'Xóa',
    RENAME: 'Đổi tên',
    DISABLE: 'Khóa/vô hiệu hóa',
    LOCK: 'Khóa',
    UNLOCK: 'Mở khóa',
    ARCHIVE: 'Lưu trữ',
    SUBMIT: 'Nộp/gửi',
    EXPORT: 'Xuất file',
    RESET_PASSWORD: 'Đặt lại mật khẩu',
    CHANGE_PASSWORD: 'Đổi mật khẩu',
  };
  return map[code] || code;
}

function getActionColor(action: string) {
  const code = getActionCode(action);
  if (['ADD', 'LOGIN', 'UNLOCK'].includes(code)) return 'bg-emerald-100 text-emerald-700';
  if (['MODIFY', 'EDIT', 'RENAME', 'CHANGE_PASSWORD'].includes(code)) return 'bg-blue-100 text-blue-700';
  if (['DELETE', 'DISABLE', 'LOCK', 'LOGIN_FAILED'].includes(code)) return 'bg-red-100 text-red-700';
  if (['EXPORT', 'SUBMIT', 'ARCHIVE', 'RESET_PASSWORD'].includes(code)) return 'bg-amber-100 text-amber-700';
  return 'bg-surface-container-high text-on-surface';
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function LogRow({ log }: { log: AuditLogEntry }) {
  const Icon = getCategoryIcon(log.category);
  const colorClass = getCategoryColor(log.category);

  return (
    <tr className="border-b border-outline-variant transition-colors hover:bg-surface-container-low">
      <td className="px-4 py-3 text-sm text-on-surface-variant whitespace-nowrap">
        {formatDateTime(log.createdAt)}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
          <Icon className="h-3.5 w-3.5" />
          {CATEGORIES.find((c) => c.value === log.category)?.label || log.category}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${getActionColor(log.action)}`}
          title={getActionTitle(log.action)}
        >
          {getActionCode(log.action)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-on-surface">
        {log.fullName || log.username || '—'}
      </td>
      <td className="px-4 py-3 text-sm text-on-surface-variant max-w-xs truncate" title={log.details}>
        {log.details || '—'}
      </td>
    </tr>
  );
}

function LogCard({ log }: { log: AuditLogEntry }) {
  const Icon = getCategoryIcon(log.category);
  const colorClass = getCategoryColor(log.category);

  return (
    <div className="flex flex-col gap-2 border-b border-outline-variant p-4 transition-colors hover:bg-surface-container-low">
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
          <Icon className="h-3.5 w-3.5" />
          {CATEGORIES.find((c) => c.value === log.category)?.label || log.category}
        </span>
        <span className="text-xs text-on-surface-variant whitespace-nowrap">
          {formatDateTime(log.createdAt)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-on-surface">
          {log.fullName || log.username || 'Hệ thống'}
        </span>
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${getActionColor(log.action)}`}
          title={getActionTitle(log.action)}
        >
          {getActionCode(log.action)}
        </span>
      </div>
      {log.details && (
        <p className="text-sm text-on-surface-variant line-clamp-2">
          {log.details}
        </p>
      )}
    </div>
  );
}

export default function AdminLogs() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [diagnosticsError, setDiagnosticsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [actionSearch, setActionSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getAuditLogs({
        page,
        limit: 20,
        category: category || undefined,
        action: actionSearch || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setData(result);
    } catch {
      setError('Không tải được nhật ký hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs();
    getSystemDiagnostics()
      .then(setDiagnostics)
      .catch(() => setDiagnosticsError('Không kết nối được API chẩn đoán hệ thống'));
  }, [page]);

  const handleFilter = () => {
    setPage(1);
    void fetchLogs();
  };

  return (
    <AppLayout
      title="Nhật ký hệ thống"
      subtitle="Theo dõi tất cả hoạt động trên hệ thống báo cáo"
    >
      <div className="space-y-4">
        <section className="border-y border-outline-variant bg-surface-container-low px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Database className={`h-5 w-5 ${diagnostics?.mongodb === 'connected' ? 'text-emerald-600' : 'text-error'}`} />
              <div>
                <p className="text-sm font-semibold text-on-surface">Trạng thái vận hành</p>
                <p className="text-xs text-on-surface-variant">
                  MongoDB: {diagnostics?.mongodb || 'không xác định'}
                  {diagnostics ? ` · Uptime: ${diagnostics.uptimeSeconds}s` : ''}
                </p>
              </div>
            </div>
            <span className={`w-fit rounded-md px-2.5 py-1 text-xs font-semibold ${diagnostics?.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {diagnostics?.status === 'healthy' ? 'HEALTHY' : 'DEGRADED'}
            </span>
          </div>
          {diagnosticsError && <p className="mt-3 text-sm text-error">{diagnosticsError}</p>}
          {diagnostics && diagnostics.recentErrors.length > 0 && (
            <div className="mt-4 border-t border-outline-variant pt-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-on-surface">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Lỗi backend gần nhất
              </div>
              <div className="space-y-2">
                {diagnostics.recentErrors.slice(0, 5).map((item) => (
                  <div key={item.requestId} className="grid gap-1 text-xs text-on-surface-variant sm:grid-cols-[160px_170px_1fr]">
                    <span>{formatDateTime(item.timestamp)}</span>
                    <span className="font-semibold text-error">{item.code} · {item.statusCode}</span>
                    <span className="break-all">{item.method} {item.path} · ID: {item.requestId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Filter bar */}
        <div className="rounded-xl border border-outline-variant bg-white p-3 shadow-level-1 md:p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-on-surface">Bộ lọc</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs text-on-surface-variant">Loại</label>
              <select
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-on-surface-variant">Hành động</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-outline" />
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
                  placeholder="ADD, MODIFY, DELETE..."
                  value={actionSearch}
                  onChange={(e) => setActionSearch(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-on-surface-variant">Từ ngày</label>
              <input
                type="date"
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-on-surface-variant">Đến ngày</label>
              <input
                type="date"
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-container"
                type="button"
                onClick={handleFilter}
              >
                Lọc
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
              <span className="ml-3 text-sm text-on-surface-variant">Đang tải nhật ký...</span>
            </div>
          ) : data && data.logs.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-on-surface-variant">
                        Thời gian
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-on-surface-variant">
                        Loại
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-on-surface-variant">
                        Hành động
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-on-surface-variant">
                        Người dùng
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-on-surface-variant">
                        Chi tiết
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((log) => (
                      <LogRow key={log._id} log={log} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col md:hidden">
                {data.logs.map((log) => (
                  <LogCard key={log._id} log={log} />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-outline-variant px-4 py-3">
                <span className="text-sm text-on-surface-variant">
                  Hiển thị {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} / {data.total} bản ghi
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
              <Activity className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm font-medium">Chưa có nhật ký nào</p>
              <p className="text-xs">Các hoạt động trên hệ thống sẽ được ghi lại tại đây</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
