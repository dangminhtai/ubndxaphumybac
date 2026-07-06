import { useEffect, useState } from 'react';
import { Loader2, Plus, RotateCcw, UserX, Pencil, Trash2, X } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Dialog from '../components/ui/Dialog';
import type { DialogType } from '../components/ui/Dialog';
import { createUser, getUsers, resetUserPassword, updateUser, deleteUser as deleteUserApi } from '../api/authApi';
import type { CreateUserPayload, ManagedUser } from '../types/user';

const initialForm: CreateUserPayload = {
  username: '',
  password: '',
  fullName: '',
  department: 'PHÒNG VĂN HÓA - XÃ HỘI',
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
  admin: 'Quản trị viên',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      if (editingUserId) {
        await updateUser(editingUserId, form);
        setMessage('Đã cập nhật tài khoản');
        setEditingUserId(null);
      } else {
        await createUser(form);
        setMessage('Đã tạo tài khoản');
      }
      setForm(initialForm);
      await loadUsers();
    } catch {
      setError(editingUserId ? 'Không cập nhật được tài khoản' : 'Không tạo được tài khoản');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: ManagedUser) => {
    setEditingUserId(user._id || user.id);
    setForm({
      username: user.username,
      password: '', // Leave empty when editing
      fullName: user.fullName || '',
      department: user.department || '',
      role: user.role,
      position: user.position || '',
    });
    setError('');
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setForm(initialForm);
    setError('');
    setMessage('');
  };

  const disable = async (id: string, isActive: boolean) => {
    setDialogState({
      isOpen: true,
      type: 'confirm',
      title: isActive ? 'Vô hiệu hóa tài khoản' : 'Mở khóa tài khoản',
      message: isActive ? 'Bạn có chắc muốn vô hiệu hóa tài khoản này?' : 'Bạn có chắc muốn mở khóa tài khoản này?',
      confirmText: 'Đồng ý',
      onConfirm: async () => {
        closeDialog();
        await updateUser(id, { isActive: !isActive });
        await loadUsers();
      }
    });
  };

  const handleDelete = async (id: string) => {
    setDialogState({
      isOpen: true,
      type: 'confirm',
      title: 'Xóa tài khoản',
      message: 'Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản này?',
      confirmText: 'Xóa',
      isDanger: true,
      onConfirm: async () => {
        closeDialog();
        try {
          await deleteUserApi(id);
          setMessage('Đã xóa tài khoản');
          await loadUsers();
        } catch {
          setError('Lỗi khi xóa tài khoản');
        }
      }
    });
  };

  const resetPassword = async (id: string) => {
    setDialogState({
      isOpen: true,
      type: 'prompt',
      title: 'Đặt lại mật khẩu',
      message: 'Nhập mật khẩu mới cho tài khoản này:',
      inputPlaceholder: 'Mật khẩu mới...',
      confirmText: 'Đặt lại',
      onConfirm: async (newPassword?: string) => {
        closeDialog();
        if (!newPassword) return;
        await resetUserPassword(id, newPassword);
        setMessage('Đã đặt lại mật khẩu mới');
        await loadUsers();
      }
    });
  };

  return (
    <AppLayout title="Quản lý tài khoản" subtitle="Admin tạo tài khoản nhân viên và viewer, không dùng đăng ký công khai.">
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
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Create form */}
        <section className="rounded-xl border border-outline-variant bg-white p-4 shadow-level-1 self-start lg:sticky lg:top-24 md:p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold">{editingUserId ? 'Cập nhật tài khoản' : 'Tạo tài khoản'}</h3>
            {editingUserId && (
              <button onClick={cancelEdit} className="text-on-surface-variant hover:text-on-surface">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="space-y-4">
            {(['username', 'password', 'fullName', 'position'] as const).map((field) => {
              if (editingUserId && field === 'username') return null; // Can't change username
              return (
              <div key={field}>
                <label className="mb-1 block text-sm font-medium text-on-surface-variant">
                  {fieldLabels[field]}
                  {(field === 'username' || field === 'fullName') && <span className="text-error ml-0.5">*</span>}
                </label>
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder={field === 'password' && editingUserId ? 'Bỏ trống nếu không đổi...' : `Nhập ${fieldLabels[field].toLowerCase()}...`}
                  type={field === 'password' ? 'password' : 'text'}
                  value={form[field] || ''}
                  disabled={field === 'username' && editingUserId !== null}
                  onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                />
                {field === 'password' && !editingUserId && (
                  <p className="mt-1 text-xs text-on-surface-variant">Tài khoản có thể đăng nhập ngay mà không bắt buộc đổi mật khẩu.</p>
                )}
              </div>
              );
            })}
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface-variant">Phòng ban</label>
              <select
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60 disabled:bg-surface-container-low"
                value={form.department || 'PHÒNG VĂN HÓA - XÃ HỘI'}
                disabled={form.role === 'staff'}
                onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
              >
                <option value="PHÒNG VĂN HÓA - XÃ HỘI">PHÒNG VĂN HÓA - XÃ HỘI</option>
                <option value="UBND Cấp Xã">UBND Cấp Xã</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface-variant">Vai trò</label>
              <select
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                value={form.role}
                onChange={(event) => {
                  const newRole = event.target.value;
                  setForm((current) => ({
                    ...current,
                    role: newRole,
                    department: (newRole === 'staff') ? 'PHÒNG VĂN HÓA - XÃ HỘI' : current.department,
                  }));
                }}
              >
                <option value="staff">Nhân viên</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60 transition-colors hover:bg-primary-container"
              type="button"
              disabled={loading}
              onClick={() => void submit()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingUserId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
              {editingUserId ? 'Cập nhật tài khoản' : 'Tạo tài khoản'}
            </button>
          </div>
          {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
        </section>

        {/* User list */}
        <section className="rounded-xl border border-outline-variant bg-white p-4 shadow-level-1 md:p-5">
          <h3 className="mb-4 text-base font-semibold">Danh sách tài khoản</h3>
          <div className="hidden md:block overflow-x-auto">
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
                          title="Sửa thông tin"
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </button>
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
                          title={user.isActive === false ? 'Mở khóa tài khoản' : 'Vô hiệu hóa tài khoản'}
                          onClick={() => void disable(user._id || user.id, user.isActive ?? true)}
                        >
                          <UserX className="h-4 w-4 text-error" />
                        </button>
                        <button
                          className="rounded-lg border border-outline-variant p-2 transition-colors hover:bg-error-container bg-red-50 border-red-200"
                          type="button"
                          title="Xóa vĩnh viễn"
                          onClick={() => void handleDelete(user._id || user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile card list */}
          <div className="flex flex-col gap-3 md:hidden">
            {users.map((user) => (
              <div key={user._id || user.id} className="rounded-lg border border-outline-variant p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{user.fullName}</div>
                    <div className="text-xs text-on-surface-variant">@{user.username}</div>
                    <div className="text-xs text-on-surface-variant mt-1">{user.department || '—'} • {user.position || '—'}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold">
                      {roleLabels[user.role] || user.role}
                    </span>
                    {user.isActive === false ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">Đã khóa</span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Hoạt động</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-2 pt-2 border-t border-outline-variant">
                  <button className="flex-1 rounded-lg border border-outline-variant py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(user)}>Sửa</button>
                  <button className="flex-1 rounded-lg border border-outline-variant py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50" onClick={() => void resetPassword(user._id || user.id)}>Đặt MK</button>
                  <button className="flex-1 rounded-lg border border-outline-variant py-1.5 text-xs font-medium text-error hover:bg-error-container" onClick={() => void disable(user._id || user.id, user.isActive ?? true)}>{user.isActive === false ? 'Mở khóa' : 'Khóa'}</button>
                  <button className="rounded-lg border border-red-200 bg-red-50 py-1.5 px-2 text-xs font-medium text-red-600 hover:bg-red-100" onClick={() => void handleDelete(user._id || user.id)}>Xóa</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
