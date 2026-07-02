import { useEffect, useState } from 'react';
import { Loader2, Plus, RotateCcw, UserX } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { createUser, disableUser, getUsers, resetUserPassword } from '../api/authApi';
import type { CreateUserPayload, ManagedUser } from '../types/user';

const initialForm: CreateUserPayload = {
  username: '',
  password: '123456',
  fullName: '',
  department: 'PHÒNG VĂN HÓA - XÃ HỘI',
  role: 'staff',
  position: '',
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
    await disableUser(id);
    await loadUsers();
  };

  const resetPassword = async (id: string) => {
    await resetUserPassword(id);
    setMessage('Đã đặt lại mật khẩu về 123456');
    await loadUsers();
  };

  return (
    <AppLayout title="Quản lý tài khoản" subtitle="Admin tạo tài khoản nhân viên và viewer, không dùng đăng ký công khai.">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
          <h3 className="mb-4 text-base font-semibold">Tạo tài khoản</h3>
          <div className="space-y-3">
            {(['username', 'password', 'fullName', 'department', 'position'] as const).map((field) => (
              <input
                key={field}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder={field}
                type={field === 'password' ? 'password' : 'text'}
                value={form[field] || ''}
                onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
              />
            ))}
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            >
              <option value="staff">Nhân viên</option>
              <option value="viewer">Viewer</option>
              <option value="department_lead">Lãnh đạo phòng</option>
              <option value="office_clerk">Văn thư/tổng hợp</option>
              <option value="admin">Admin</option>
            </select>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-60"
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

        <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
          <h3 className="mb-4 text-base font-semibold">Danh sách tài khoản</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant text-xs uppercase text-on-surface-variant">
                <tr>
                  <th className="py-2">Tài khoản</th>
                  <th className="py-2">Họ tên</th>
                  <th className="py-2">Vai trò</th>
                  <th className="py-2">Trạng thái</th>
                  <th className="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id || user.id} className="border-b border-surface-container-low">
                    <td className="py-3 font-semibold">{user.username}</td>
                    <td className="py-3">{user.fullName}</td>
                    <td className="py-3">{user.role}</td>
                    <td className="py-3">{user.isActive === false ? 'Đã khóa' : 'Hoạt động'}</td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <button className="rounded-lg border border-outline-variant p-2" type="button" onClick={() => void resetPassword(user._id || user.id)}>
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button className="rounded-lg border border-outline-variant p-2" type="button" onClick={() => void disable(user._id || user.id)}>
                          <UserX className="h-4 w-4" />
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
