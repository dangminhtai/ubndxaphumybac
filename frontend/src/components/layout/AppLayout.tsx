import { NavLink, Link } from 'react-router-dom';
import {
  Activity,
  Archive,
  Bell,
  CalendarDays,
  ClipboardList,
  Home,
  LogOut,
  Search,
  Settings,
  Shield,
  UserPen,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { User } from '../../types/user';

interface AppLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  bottomBar?: ReactNode;
  bottomStatus?: ReactNode;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Trang chủ', icon: Home },
  { to: '/employee-report', label: 'Nhập báo cáo', icon: UserPen, roles: ['admin', 'staff', 'department_lead'] },
  { to: '/my-reports', label: 'Báo cáo của tôi', icon: ClipboardList, roles: ['staff', 'department_lead'] },
  { to: '/monthly-report', label: 'Báo cáo tháng', icon: CalendarDays, roles: ['staff', 'department_lead'] },
  { to: '/admin/periods', label: 'Kỳ báo cáo', icon: CalendarDays, roles: ['admin'] },
  { to: '/admin/users', label: 'Tài khoản', icon: Users, roles: ['admin'] },
  { to: '/monthly-summary', label: 'Tổng hợp tháng', icon: ClipboardList, roles: ['admin'] },
  { to: '/admin/logs', label: 'Nhật ký hệ thống', icon: Activity, roles: ['admin', 'viewer'] },
  { to: '/archive', label: 'Kho lưu trữ', icon: Archive },
  { to: '#', label: 'Thông báo', icon: Bell },
];

function readUser() {
  return JSON.parse(localStorage.getItem('user') || '{}') as Partial<User>;
}

export default function AppLayout({ title, subtitle, children, actions, bottomBar, bottomStatus }: AppLayoutProps) {
  const user = readUser();
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role || ''));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md">
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-sidebar-width flex-col bg-primary text-on-primary md:flex">
        <div className="flex items-center gap-3 border-b border-white/10 p-container-padding">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold">UBND Cấp Xã</h1>
            <p className="text-xs text-white/70">Hệ thống quản lý báo cáo</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-stack-md">
          <ul className="flex flex-col gap-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const commonClass =
                'flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm font-medium transition-colors';

              if (item.to === '#') {
                return (
                  <li key={item.label}>
                    <a
                      href="#"
                      className={`${commonClass} border-transparent text-white/70 hover:bg-white/5 hover:text-white`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </a>
                  </li>
                );
              }

              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `${commonClass} ${
                        isActive
                          ? 'border-white bg-white/10 text-white'
                          : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-3 py-stack-md">
          <a
            href="#"
            className="flex items-center gap-3 rounded-lg border-l-4 border-transparent px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
          >
            <Settings className="h-5 w-5" />
            <span>Cài đặt</span>
          </a>
          <Link
            to="/login"
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg border-l-4 border-transparent px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            <span>Đăng xuất</span>
          </Link>
        </div>
      </aside>

      <div className="min-h-screen md:ml-sidebar-width">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-container-padding">
          <div className="relative hidden w-80 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <input
              className="w-full rounded-full border border-transparent bg-surface-container-low py-2 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-outline focus:border-primary"
              placeholder="Tìm kiếm báo cáo..."
              type="search"
            />
          </div>

          <div className="ml-auto flex items-center gap-4">
            <button
              className="rounded-full p-2 text-primary transition-colors hover:bg-surface-container-high"
              type="button"
              aria-label="Thông báo"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 border-l border-outline-variant pl-4">
              <div className="text-right">
                <div className="text-sm font-semibold">{user.fullName || 'Nguyễn Văn A'}</div>
                <div className="text-xs text-on-surface-variant">{user.role || user.department || 'Cán bộ'}</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-sm font-semibold text-primary">
                {(user.fullName || 'A').trim().charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-container-padding py-stack-lg pb-28">
          <div className="mb-stack-lg flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">{title}</h2>
              {subtitle && <p className="mt-1 text-on-surface-variant">{subtitle}</p>}
            </div>
            {actions}
          </div>

          {children}
        </main>
      </div>

      {bottomBar && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-outline-variant bg-surface-container-lowest px-container-padding py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:left-sidebar-width">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div>{bottomStatus}</div>
            <div className="flex justify-end gap-4">{bottomBar}</div>
          </div>
        </div>
      )}
    </div>
  );
}
