import { useEffect, useState } from 'react';
import { Bell, Check, CheckCircle2, ChevronRight, Loader2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Dialog from '../components/ui/Dialog';
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../api/notificationApi';
import type { AppNotification } from '../api/notificationApi';

function formatTime(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogState, setDialogState] = useState({ isOpen: false, message: '' });

  const closeDialog = () => setDialogState(prev => ({ ...prev, isOpen: false }));

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications(50);
      setNotifications(data.notifications);
    } catch {
      setError('Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch {
      setDialogState({ isOpen: true, message: 'Có lỗi xảy ra khi cập nhật thông báo' });
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      try {
        await markNotificationAsRead(notif._id);
        setNotifications(notifications.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      } catch (e) {
        console.error(e);
      }
    }
    
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <AppLayout
      title="Thông báo"
      subtitle="Quản lý và theo dõi các sự kiện, yêu cầu hệ thống"
    >
      <Dialog
        isOpen={dialogState.isOpen}
        type="alert"
        title="Thông báo hệ thống"
        message={dialogState.message}
        onConfirm={closeDialog}
        onCancel={closeDialog}
      />
      <div className="mx-auto max-w-4xl space-y-6">
        {error && (
          <div className="rounded-lg bg-error-container p-4 text-sm text-error">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-white p-4 shadow-level-1">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-on-surface">Thông báo của bạn</h3>
              <p className="text-sm text-on-surface-variant">Bạn có {unreadCount} thông báo chưa đọc</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => void handleMarkAllRead()}
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low"
            >
              <CheckCircle2 className="h-4 w-4" />
              Đánh dấu đọc tất cả
            </button>
          )}
        </div>

        <div className="rounded-xl border border-outline-variant bg-white shadow-level-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
              <Bell className="mb-4 h-12 w-12 opacity-30" />
              <p className="font-medium">Chưa có thông báo nào</p>
              <p className="text-sm text-center max-w-sm mt-1">Khi có kỳ báo cáo mới hoặc các cập nhật quan trọng, hệ thống sẽ gửi thông báo đến bạn tại đây.</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant">
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => void handleNotificationClick(notif)}
                  className={`flex cursor-pointer gap-4 p-4 transition-colors hover:bg-surface-container-lowest ${
                    notif.isRead ? 'opacity-70' : 'bg-surface-container-low'
                  }`}
                >
                  <div className="mt-1 flex-shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${notif.isRead ? 'bg-surface-container-highest text-on-surface-variant' : 'bg-primary-container text-primary'}`}>
                      {notif.type === 'period_opened' ? <Check className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h4 className={`text-sm ${notif.isRead ? 'font-medium text-on-surface' : 'font-semibold text-primary'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-xs text-on-surface-variant whitespace-nowrap ml-2">
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className={`mt-1 text-sm ${notif.isRead ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                      {notif.message}
                    </p>
                    {notif.link && (
                      <div className="mt-2 flex items-center text-xs font-medium text-primary">
                        Xem chi tiết
                        <ChevronRight className="ml-1 h-3 w-3" />
                      </div>
                    )}
                  </div>
                  {!notif.isRead && (
                    <div className="flex flex-shrink-0 items-center justify-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-error" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
