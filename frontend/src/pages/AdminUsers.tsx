import { useEffect, useState } from 'react';
import { Loader2, Plus, RotateCcw, UserX } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { createUser, disableUser, getUsers, resetUserPassword } from '../api/authApi';
import type { CreateUserPayload, ManagedUser } from '../types/user';

const initialForm: CreateUserPayload = {
  username: '',
  password: '',
  fullName: '',
  department: '',
  role: 'staff',
  position: '',
};

const fieldLabels: Record<string, string> = {
  username: 'Tên đăng nhập',
  password: 'Mật khẩu',
  fullName: 'Họ và tên',
  department: 'Phòng ban',
  position: 'Chức vụ',
};

const roleLabels: Record<string, string> = {
  staff: 'Nhân viên',
  viewer: 'Xem báo cáo',
  department_lead: 'Lãnh đạo phòng',
  office_clerk: 'Văn thư/tổng hợp',
  admin: 'Quản trị viên',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await getUsers());
    } catch {
      setError('Không tải được danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await createUser(form);
      setForm(initialForm);
      setMessage('Đã tạo tài khoản');
      await loadUsers();
    } catch {
      setError('Không tạo được tài khoản');
    } finally {
      setLoading(false);
    }
  };

  const disable = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn vô hiệu hóa tài khoản này?')) return;
    await disableUser(id);
    await loadUsers();
  };

  const resetPassword = async (id: string) => {
    const newPassword = window.prompt('Nhập mật khẩu mới cho tài khoản này');
    if (!newPassword) return;
    await resetUserPassword(id, newPassword);
    setMessage('Đã đặt lại mật khẩu mới');
    await loadUsers();
  };

  return (
    <AppLayout title="Quản lý tài khoản" subtitle="Admin tạo tài khoản nhân viên và viewer, không dùng đăng ký công khai.">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Create form */}
        <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
          <h3 className="mb-4 text-base font-semibold">Tạo tài khoản</h3>
          <div className="space-y-4">
            {(['username', 'password', 'fullName', 'department', 'position'] as const).map((field) => (
              <div key={field}>
                <label className="mb-1 block text-sm font-medium text-on-surface-variant">
                  {fieldLabels[field]}
                  {(field === 'username' || field === 'fullName') && <span className="text-error ml-0.5">*</span>}
                </label>
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder={`Nhập ${fieldLabels[field].toLowerCase()}...`}
                  type={field === 'password' ? 'password' : 'text'}
                  value={form[field] || ''}
                  onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                />
                {field === 'password' && (
                  <p className="mt-1 text-xs text-on-surface-variant">Người dùng sẽ phải đổi mật khẩu khi đăng nhập lần đầu.</p>
                )}
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface-variant">Vai trò</label>
              <select
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              >
                <option value="staff">Nhân viên</option>
                <option value="viewer">Xem báo cáo</option>
                <option value="department_lead">Lãnh đạo phòng</option>
                <option value="office_clerk">Văn thư/tổng hợp</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60"
              type="button"
              disabled={loading}
              onClick={() => void submit()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tạo tài khoản
            </button>
          </div>
          {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
        </section>

        {/* User list */}
        <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
          <h3 className="mb-4 text-base font-semibold">Danh sách tài khoản</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant text-xs uppercase text-on-surface-variant">
                <tr>
                  <th className="py-2 pr-3">Tài khoản</th>
                  <th className="py-2 pr-3">Họ tên</th>
                  <th className="py-2 pr-3">Phòng ban</th>
                  <th className="py-2 pr-3">Chức vụ</th>
                  <th className="py-2 pr-3">Vai trò</th>
                  <th className="py-2 pr-3">Trạng thái</th>
                  <th className="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id || user.id} className="border-b border-surface-container-low">
                    <td className="py-3 pr-3 font-semibold">{user.username}</td>
                    <td className="py-3 pr-3">{user.fullName}</td>
                    <td className="py-3 pr-3 text-on-surface-variant">{user.department || '—'}</td>
                    <td className="py-3 pr-3 text-on-surface-variant">{user.position || '—'}</td>
                    <td className="py-3 pr-3">
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs font-semibold">
                        {roleLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      {user.isActive === false ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">Đã khóa</span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Hoạt động</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-lg border border-outline-variant p-2 transition-colors hover:bg-surface-container-low"
                          type="button"
                          title="Đặt lại mật khẩu"
                          onClick={() => void resetPassword(user._id || user.id)}
                        >
                          <RotateCcw className="h-4 w-4 text-amber-600" />
                        </button>
                        <button
                          className="rounded-lg border border-outline-variant p-2 transition-colors hover:bg-error-container"
                          type="button"
                          title="Vô hiệu hóa tài khoản"
                          onClick={() => void disable(user._id || user.id)}
                        >
                          <UserX className="h-4 w-4 text-error" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
