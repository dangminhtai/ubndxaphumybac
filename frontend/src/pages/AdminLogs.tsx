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
  Search,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { getAuditLogs } from '../api/auditLogApi';
import type { AuditLogEntry, AuditLogResponse } from '../api/auditLogApi';

const CATEGORIES = [
  { value: '', label: 'Tất cả' },
  { value: 'auth', label: 'Đăng nhập/xuất' },
  { value: 'report', label: 'Báo cáo' },
  { value: 'period', label: 'Kỳ báo cáo' },
  { value: 'user', label: 'Tài khoản' },
  { value: 'export', label: 'Xuất DOCX' },
  { value: 'summary', label: 'Tổng hợp' },
];

function getCategoryIcon(category: string) {
  switch (category) {
    case 'auth': return LogIn;
    case 'report': return FileText;
    case 'period': return CalendarDays;
    case 'user': return Users;
    case 'export': return Download;
    case 'summary': return ClipboardList;
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
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getActionLabel(action: string) {
  const map: Record<string, string> = {
    login_success: 'Đăng nhập',
    login_failed: 'Đăng nhập thất bại',
    logout: 'Đăng xuất',
    user_created: 'Tạo tài khoản',
    user_disabled: 'Khóa tài khoản',
    password_reset: 'Reset mật khẩu',
    password_changed: 'Đổi mật khẩu',
    report_saved_draft: 'Lưu nháp',
    report_submitted: 'Nộp báo cáo',
    period_created: 'Tạo kỳ BC',
    period_opened: 'Mở kỳ BC',
    period_locked: 'Khóa kỳ BC',
    docx_exported: 'Xuất DOCX',
    summary_generated: 'Tạo tổng hợp',
    summary_updated: 'Cập nhật tổng hợp',
  };
  return map[action] || action;
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
        <span className="rounded-md bg-surface-container-high px-2 py-0.5 text-xs font-medium text-on-surface">
          {getActionLabel(log.action)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-on-surface">
        {log.fullName || log.username || '—'}
      </td>
      <td className="px-4 py-3 text-sm text-on-surface-variant max-w-xs truncate">
        {log.details || '—'}
      </td>
    </tr>
  );
}

export default function AdminLogs() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
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
        {/* Filter bar */}
        <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-level-1">
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
                  placeholder="Tìm hành động..."
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
              <div className="overflow-x-auto">
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
