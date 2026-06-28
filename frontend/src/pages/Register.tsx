import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Lock as LockIcon, Building2, Briefcase, EyeOff, Eye } from 'lucide-react';
import { register } from '../api/authApi';

const DEPARTMENTS = [
  'UBND Cấp Xã',
  'Công an xã',
  'Trạm Y tế',
  'Bộ phận Tài chính',
  'Phòng Văn hóa',
  'Bộ phận Địa chính',
  'Bộ phận Tư pháp',
  'Thôn 1',
  'Thôn 2',
  'Thôn 3',
  'Bản A',
  'Bản B',
];

const ROLES = [
  { value: 'user', label: 'Cán bộ' },
  { value: 'admin', label: 'Quản trị viên' },
];

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    department: '',
    role: 'user',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      const response = await register({
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        department: form.department,
        role: form.role,
      });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Đăng ký thất bại');
      } else {
        setError('Đăng ký thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased relative min-h-screen flex items-center justify-center py-10">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="w-full h-full bg-cover bg-center opacity-30 mix-blend-multiply"
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDuKH-WmXV-QMYLQemBG_qjxZfsnkHQxv5LJexwCiM1MVezXiHuqhriqjE6m47AjJH-QYzYChWtvLaZY_CYSfcNllRLaMx_Xe83mnCQguOA1YfXzeWRuvqMn99bZQjDSXFqi5l36MxmUFagNsNJm1z8BjbkBHPI94X4zQzdbioaY4alrjTJw_6KwibAfpnH8lwPyGuxW9ISUMbjH2f-olihj-FOBk3Qvjur0U4qEU_5Bu6t1tcjks_VWIdSD-DvDgSf4CkOPiEK8gtz')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/50 to-surface/95" />
      </div>

      <div className="relative z-10 w-full max-w-[480px] px-container-padding">
        <div className="bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-6 flex flex-col items-center border-b border-surface-container">
            <img
              className="w-16 h-16 object-contain mb-stack-md"
              alt="National Emblem"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEhm2fau82Ii0foaFdx-SjHvfINraH_03XWpDeiwu4J2CqNawLVjC4141WkgKoj_IrShqIDB-ih2as9s0xv8NC8Pjutk93N6REvZrD6aObknMiPnswLEFTsFRZ-7iu-UrxkOzEHpKt8wupxvFW2g9OUqB1Bx7zmwLUnvI04YpMHLfjBJUEMGdECqvWUUm-tRC-FAzdmiPk54tq3NsdLyBHXtauTnefXwby14y1jheOMEAJSsN9scPC7Yrl88Cg_NMz2GwsNcd_vFSg"
            />
            <h1 className="font-headline-sm text-headline-sm text-primary text-center uppercase tracking-wide">
              Tạo tài khoản mới
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-unit text-center">
              Hệ thống Quản lý Báo cáo – UBND Cấp Xã
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-error-container text-error text-sm text-center">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
              {/* Họ tên */}
              <div className="flex flex-col gap-unit">
                <label className="font-body-md text-body-md text-on-surface font-semibold" htmlFor="fullName">
                  Họ và tên <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={form.fullName}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-outline-variant rounded-lg bg-surface-bright focus:bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/70"
                  />
                </div>
              </div>

              {/* Tên đăng nhập */}
              <div className="flex flex-col gap-unit">
                <label className="font-body-md text-body-md text-on-surface font-semibold" htmlFor="username">
                  Tên đăng nhập <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    placeholder="username"
                    value={form.username}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-outline-variant rounded-lg bg-surface-bright focus:bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/70"
                  />
                </div>
              </div>

              {/* Đơn vị */}
              <div className="flex flex-col gap-unit">
                <label className="font-body-md text-body-md text-on-surface font-semibold" htmlFor="department">
                  Đơn vị / Bộ phận <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5 pointer-events-none" />
                  <select
                    id="department"
                    name="department"
                    required
                    value={form.department}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-outline-variant rounded-lg bg-surface-bright focus:bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  >
                    <option value="">-- Chọn đơn vị --</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vai trò */}
              <div className="flex flex-col gap-unit">
                <label className="font-body-md text-body-md text-on-surface font-semibold" htmlFor="role">
                  Vai trò
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5 pointer-events-none" />
                  <select
                    id="role"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-outline-variant rounded-lg bg-surface-bright focus:bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mật khẩu */}
              <div className="flex flex-col gap-unit">
                <label className="font-body-md text-body-md text-on-surface font-semibold" htmlFor="password">
                  Mật khẩu <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-10 py-2 border border-outline-variant rounded-lg bg-surface-bright focus:bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/70"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu */}
              <div className="flex flex-col gap-unit">
                <label className="font-body-md text-body-md text-on-surface font-semibold" htmlFor="confirmPassword">
                  Xác nhận mật khẩu <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập lại mật khẩu"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-outline-variant rounded-lg bg-surface-bright focus:bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/70"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-container text-on-primary font-body-lg text-body-lg font-semibold py-3 rounded-lg shadow-sm hover:shadow transition-all flex justify-center items-center gap-2 disabled:opacity-50 mt-stack-sm"
              >
                {loading ? 'Đang xử lý...' : 'Tạo tài khoản'}
              </button>
            </form>
          </div>

          {/* Footer link */}
          <div className="bg-surface-container-low px-8 py-4 border-t border-surface-container text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline transition-all">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-stack-lg text-center font-body-md text-body-md text-on-surface-variant opacity-80">
          <p>Phiên bản 2.0.1 - © 2024 UBND Cấp Xã</p>
        </div>
      </div>
    </div>
  );
}
