import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import logo from '../../assets/logo.png';
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Search,
  UserPen,
  Users,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { User } from '../../types/user';
import { getNotifications } from '../../api/notificationApi';

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
  { to: '/employee-report', label: 'Nhập báo cáo', icon: UserPen, roles: ['staff', 'department_lead', 'user'] },
  { to: '/my-reports', label: 'Báo cáo của tôi', icon: ClipboardList, roles: ['staff', 'department_lead', 'user'] },
  { to: '/monthly-report', label: 'Báo cáo tháng', icon: CalendarDays, roles: ['staff', 'department_lead', 'user'] },
  { to: '/admin/periods', label: 'Kỳ báo cáo', icon: CalendarDays, roles: ['admin'] },
  { to: '/admin/users', label: 'Tài khoản', icon: Users, roles: ['admin'] },
  { to: '/weekly-summary', label: 'Tổng hợp tuần', icon: ClipboardList, roles: ['admin'] },
  { to: '/document-catalog', label: 'Tra cứu danh mục', icon: BookOpenCheck },
  { to: '/work-schedules', label: 'Lịch công tác', icon: CalendarDays },
  { to: '/work-schedules/stats', label: 'Thống kê lịch', icon: BarChart3, roles: ['admin', 'department_lead'] },
  { to: '/admin/logs', label: 'Nhật ký hệ thống', icon: Activity, roles: ['admin', 'viewer'] },
  { to: '/archive', label: 'Kho lưu trữ', icon: Archive, roles: ['admin', 'viewer', 'department_lead', 'office_clerk'] },
  { to: '/notifications', label: 'Thông báo', icon: Bell },
];

// Bottom nav: 4-5 key items depending on role
function getMobileNavItems(role: string | undefined) {
  if (role === 'admin') {
    return [
      { to: '/dashboard', label: 'Trang chủ', icon: Home },
      { to: '/weekly-summary', label: 'Tổng hợp', icon: ClipboardList },
      { to: '/work-schedules', label: 'Lịch', icon: CalendarDays },
      { to: '/notifications', label: 'Thông báo', icon: Bell },
    ];
  }
  return [
    { to: '/dashboard', label: 'Trang chủ', icon: Home },
    { to: '/employee-report', label: 'Báo cáo', icon: UserPen },
    { to: '/work-schedules', label: 'Lịch', icon: CalendarDays },
    { to: '/notifications', label: 'Thông báo', icon: Bell },
  ];
}

function readUser() {
  const rawUser = localStorage.getItem('user');
  if (!rawUser) {
    throw new Error('Thiếu thông tin người dùng trong phiên đăng nhập');
  }
  return JSON.parse(rawUser) as Partial<User>;
}

export default function AppLayout({ title, subtitle, children, actions, bottomBar, bottomStatus }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = readUser();
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.roles || (user.role && item.roles.includes(user.role)));
  const mobileNavItems = getMobileNavItems(user.role);

  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const latestNotifIdRef = useRef<string | null>(null);

  // Request system notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchCount = () => {
      getNotifications(1)
        .then((res) => {
          setUnreadCount(res.unreadCount);
          if (res.notifications && res.notifications.length > 0) {
            const latest = res.notifications[0];
            // If the latest notification is unread and it's a new ID (or initial load)
            if (latestNotifIdRef.current !== latest._id && !latest.isRead) {
              // Play sound
              try {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(() => {});
              } catch (e) {}

              // Show System Desktop Notification
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  const notification = new Notification('🔔 Có thông báo mới', {
                    body: latest.title,
                    icon: '/logo.png'
                  });
                  notification.onclick = function() {
                    window.focus();
                    navigate('/notifications');
                    notification.close();
                  };
                } catch (e) {}
              }

              // Show toast
              toast((t) => (
                <div onClick={() => { toast.dismiss(t.id); navigate('/notifications'); }} className="cursor-pointer">
                  <p className="font-bold text-[14px]">🔔 Có thông báo mới</p>
                  <p className="text-sm mt-1">{latest.title}</p>
                </div>
              ), { duration: 6000, position: 'top-right', style: { border: '1px solid #dce9ff' } });
            }
            latestNotifIdRef.current = latest._id;
          }
        })
        .catch(() => {});
    };
    
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md">
      {/* ─── Desktop Sidebar (hidden on mobile) ─── */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-sidebar-width flex-col bg-primary text-on-primary md:flex">
        <div className="flex items-center gap-2 border-b border-white/10 p-4">
          <div className="flex shrink-0">
            <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold whitespace-nowrap truncate">PHÒNG VĂN HÓA - XÃ HỘI</h1>
            <p className="text-xs text-white/70 whitespace-nowrap truncate">Hệ thống quản lý báo cáo</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-stack-md">
          <ul className="flex flex-col gap-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const commonClass =
                'flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm font-medium transition-colors';

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

      {/* ─── Mobile Drawer Overlay ─── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 h-full w-72 bg-primary text-on-primary shadow-xl animate-slide-in"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideIn .2s ease-out' }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <img src={logo} alt="Logo" className="h-7 w-auto shrink-0 object-contain" />
                <span className="text-[14px] font-bold whitespace-nowrap truncate">PHÒNG VĂN HÓA - XÃ HỘI</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="rounded-full p-1 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3">
              <ul className="flex flex-col gap-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                        {item.to === '/notifications' && unreadCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="border-t border-white/10 px-3 py-3">
              <div className="mb-3 px-3 text-xs text-white/50 truncate">{user.fullName} • {user.role}</div>
              <Link
                to="/login"
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
              >
                <LogOut className="h-5 w-5" />
                <span>Đăng xuất</span>
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* ─── Main Content Area ─── */}
      <div className="min-h-screen md:ml-sidebar-width">
        {/* ─── Top Header ─── */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-outline-variant bg-surface px-4 md:h-16 md:px-container-padding">
          {/* Mobile: hamburger menu */}
          <button
            className="rounded-lg p-2 text-on-surface hover:bg-surface-container-high md:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop: search bar */}
          <div className="relative hidden w-80 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <input
              className="w-full rounded-full border border-transparent bg-surface-container-low py-2 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-outline focus:border-primary"
              placeholder="Tìm kiếm báo cáo..."
              type="search"
            />
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              className="relative rounded-full p-2 text-primary transition-colors hover:bg-surface-container-high"
              type="button"
              aria-label="Thông báo"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-error px-1 text-[9px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <div className="hidden items-center gap-3 border-l border-outline-variant pl-4 sm:flex">
              <div className="text-right">
                <div className="text-sm font-semibold">{user.fullName}</div>
                <div className="text-xs text-on-surface-variant">{user.role}</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-sm font-semibold text-primary">
                {user.fullName?.trim().charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* ─── Page Content ─── */}
        <main className={`mx-auto w-full max-w-[1440px] px-4 py-4 md:px-container-padding md:py-stack-lg ${bottomBar ? 'pb-36 md:pb-28' : 'pb-20 md:pb-8'}`}>
          <div className="mb-4 flex flex-col gap-2 md:mb-stack-lg md:flex-row md:items-end md:justify-between md:gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-on-surface md:text-headline-lg md:font-headline-lg">{title}</h2>
              {subtitle && <p className="mt-1 text-sm text-on-surface-variant md:text-base">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2 md:flex-shrink-0">{actions}</div>}
          </div>

          {children}
        </main>
      </div>

      {/* ─── Bottom Action Bar (form pages) ─── */}
      {bottomBar && (
        <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-outline-variant bg-surface-container-lowest px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:bottom-0 md:left-sidebar-width md:px-container-padding md:py-4">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="text-xs text-on-surface-variant md:text-sm">{bottomStatus}</div>
            <div className="flex flex-wrap justify-end gap-2 md:gap-4">{bottomBar}</div>
          </div>
        </div>
      )}

      {/* ─── Mobile Bottom Navigation ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-outline-variant bg-surface md:hidden">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          const isNotif = item.to === '/notifications';
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {isNotif && unreadCount > 0 && (
                <span className="absolute -right-1 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1 text-[9px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
        {/* More menu button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-[10px] font-medium text-on-surface-variant"
        >
          <Menu className="h-5 w-5" />
          <span>Thêm</span>
        </button>
      </nav>

      {/* Inline keyframe for drawer slide-in */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
