import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock as LockIcon, EyeOff, Eye } from 'lucide-react';
import { login } from '../api/authApi';
import logo from '../assets/logo.png';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await login({ username, password });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      navigate('/dashboard');
    } catch {
      setError('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased relative min-h-screen flex items-center justify-center">
      {/* Subtle Background Decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="w-full h-full bg-cover bg-center opacity-30 mix-blend-multiply" 
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDuKH-WmXV-QMYLQemBG_qjxZfsnkHQxv5LJexwCiM1MVezXiHuqhriqjE6m47AjJH-QYzYChWtvLaZY_CYSfcNllRLaMx_Xe83mnCQguOA1YfXzeWRuvqMn99bZQjDSXFqi5l36MxmUFagNsNJm1z8BjbkBHPI94X4zQzdbioaY4alrjTJw_6KwibAfpnH8lwPyGuxW9ISUMbjH2f-olihj-FOBk3Qvjur0U4qEU_5Bu6t1tcjks_VWIdSD-DvDgSf4CkOPiEK8gtz')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-surface/50 to-surface/95"></div>
      </div>
      
      {/* Login Card Container */}
      <div className="relative z-10 w-full max-w-[440px] px-4 md:px-container-padding">
        {/* The Card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant overflow-hidden">
          {/* Card Header */}
          <div className="p-5 pb-4 flex flex-col items-center border-b border-surface-container md:p-8 md:pb-6">
            <img 
              className="h-16 w-auto object-contain mb-3 md:h-24 md:mb-stack-md" 
              alt="National Emblem" 
              src={logo}
            />
            <h1 className="font-headline-sm text-base md:text-headline-sm text-primary text-center uppercase tracking-wide">
              HỆ THỐNG QUẢN LÝ
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-unit text-center">
              Phòng Văn hóa - Xã hội xã Phù Mỹ Bắc
            </p>
          </div>
          
          {/* Card Body / Form */}
          <div className="p-5 md:p-8">
            {error && <div className="text-error mb-4 text-center text-sm">{error}</div>}
            <form onSubmit={handleLogin} className="flex flex-col gap-stack-md">
              {/* Username Field */}
              <div className="flex flex-col gap-unit">
                <label className="font-body-md text-body-md text-on-surface font-semibold" htmlFor="username">Tên đăng nhập</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                  <input 
                    className="w-full pl-10 pr-3 py-2.5 min-h-[44px] border border-outline-variant rounded-lg bg-surface-bright focus:bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/70" 
                    id="username" 
                    name="username" 
                    placeholder="Nhập tên đăng nhập" 
                    required 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Password Field */}
              <div className="flex flex-col gap-unit">
                <label className="font-body-md text-body-md text-on-surface font-semibold" htmlFor="password">Mật khẩu</label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                  <input 
                    className="w-full pl-10 pr-10 py-2.5 min-h-[44px] border border-outline-variant rounded-lg bg-surface-bright focus:bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/70" 
                    id="password" 
                    name="password" 
                    placeholder="Nhập mật khẩu" 
                    required 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors" 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              {/* Options Row */}
              <div className="flex items-center justify-between mt-unit mb-stack-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/50" type="checkbox"/>
                  <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors">Ghi nhớ đăng nhập</span>
                </label>
                <a className="font-body-md text-body-md text-primary hover:text-primary-container font-medium hover:underline transition-all" href="#">
                  Quên mật khẩu?
                </a>
              </div>
              
              {/* Submit Button */}
              <button 
                className="w-full bg-primary hover:bg-primary-container text-on-primary font-body-lg text-body-lg font-semibold py-3 min-h-[44px] rounded-lg shadow-sm hover:shadow transition-all flex justify-center items-center gap-2 disabled:opacity-50" 
                type="submit"
                disabled={loading}
              >
                <span>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</span>
              </button>
            </form>
          </div>
          
        </div>
        
        {/* Footer */}
        <div className="mt-stack-lg text-center font-body-md text-body-md text-on-surface-variant opacity-80">
          <p>@UBND Phù Mỹ Bắc</p>
        </div>
      </div>
    </div>
  );
}
