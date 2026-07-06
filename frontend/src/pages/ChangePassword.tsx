import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { changePassword, skipPasswordChange } from '../api/authApi';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const response = await changePassword({ currentPassword, newPassword });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      navigate('/dashboard');
    } catch {
      setError('Không đổi được mật khẩu. Kiểm tra mật khẩu hiện tại và độ dài mật khẩu mới.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await skipPasswordChange();
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/dashboard');
    } catch {
      setError('Lỗi khi bỏ qua đổi mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-on-surface">
      <form className="w-full max-w-md rounded-xl border border-outline-variant bg-white p-6 shadow-level-1" onSubmit={submit}>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Đổi mật khẩu bắt buộc</h1>
            <p className="text-sm text-on-surface-variant">Tài khoản mặc định hoặc tài khoản mới cấp phải đổi mật khẩu trước khi dùng hệ thống.</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-error">{error}</div>}

        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 outline-none focus:border-primary"
            placeholder="Mật khẩu hiện tại"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <input
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 outline-none focus:border-primary"
            placeholder="Mật khẩu mới"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <input
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 outline-none focus:border-primary"
            placeholder="Nhập lại mật khẩu mới"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        <div className="mt-5 flex gap-3">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container-low px-4 py-2.5 font-semibold text-on-surface transition-colors hover:bg-surface-container-highest disabled:opacity-60"
            type="button"
            disabled={loading}
            onClick={() => void handleSkip()}
          >
            Bỏ qua
          </button>
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60" type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Đổi mật khẩu
          </button>
        </div>
      </form>
    </div>
  );
}
