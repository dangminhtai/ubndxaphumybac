import { useEffect, useState } from 'react';
import { Bell, Check, CheckCircle2, ChevronRight, Loader2, Info, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Dialog from '../components/ui/Dialog';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteAllNotifications,
  deleteNotification,
} from '../api/notificationApi';
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
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type?: 'alert' | 'confirm';
    title?: string;
    message: string;
    isDanger?: boolean;
    onConfirmAction?: () => void;
  }>({ isOpen: false, message: '' });

  const closeDialog = () => setDialogState({ isOpen: false, message: '' });

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
      setDialogState({ isOpen: true, type: 'alert', message: 'Có lỗi xảy ra khi cập nhật thông báo' });
    }
  };

  const handleDeleteAll = () => {
    setDialogState({
      isOpen: true,
      type: 'confirm',
      title: 'Xác nhận xóa tất cả',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ thông báo không? Hành động này không thể hoàn tác.',
      isDanger: true,
      onConfirmAction: async () => {
        closeDialog();
        try {
          await deleteAllNotifications();
          setNotifications([]);
        } catch {
          setDialogState({ isOpen: true, type: 'alert', message: 'Có lỗi xảy ra khi xóa thông báo' });
        }
      },
    });
  };

  const handleDeleteOne = (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    setDialogState({
      isOpen: true,
      type: 'confirm',
      title: 'Xác nhận xóa',
      message: 'Bạn có muốn xóa thông báo này không?',
      isDanger: true,
      onConfirmAction: async () => {
        closeDialog();
        try {
          await deleteNotification(notifId);
          setNotifications(prev => prev.filter(n => n._id !== notifId));
        } catch {
          setDialogState({ isOpen: true, type: 'alert', message: 'Có lỗi xảy ra khi xóa thông báo' });
        }
      },
    });
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
        type={dialogState.type || 'alert'}
        title={dialogState.title || 'Thông báo hệ thống'}
        message={dialogState.message}
        isDanger={dialogState.isDanger}
        confirmText={dialogState.type === 'confirm' ? 'Xóa' : 'Đồng ý'}
        cancelText="Hủy"
        onConfirm={() => {
          if (dialogState.onConfirmAction) {
            dialogState.onConfirmAction();
          } else {
            closeDialog();
          }
        }}
        onCancel={closeDialog}
      />
      <div className="mx-auto max-w-4xl space-y-6">
        {error && (
          <div className="rounded-lg bg-error-container p-4 text-sm text-error">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-white p-3 shadow-level-1 sm:flex-row sm:items-center sm:justify-between md:p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-on-surface">Thông báo của bạn</h3>
              <p className="text-sm text-on-surface-variant">Bạn có {unreadCount} thông báo chưa đọc</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-surface-container-low md:gap-2 md:px-4 md:text-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                Đánh dấu đọc tất cả
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-error/30 px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-error/10 md:gap-2 md:px-4 md:text-sm"
              >
                <Trash2 className="h-4 w-4" />
                Xóa tất cả
              </button>
            )}
          </div>
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
                  className={`group flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-surface-container-lowest md:gap-4 md:p-4 ${
                    notif.isRead ? 'opacity-70' : 'bg-surface-container-low'
                  }`}
                >
                  <div className="mt-1 flex-shrink-0">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full md:h-10 md:w-10 ${notif.isRead ? 'bg-surface-container-highest text-on-surface-variant' : 'bg-primary-container text-primary'}`}>
                      {notif.type === 'period_opened' ? <Check className="h-4 w-4 md:h-5 md:w-5" /> : <Info className="h-4 w-4 md:h-5 md:w-5" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                      <h4 className={`text-sm ${notif.isRead ? 'font-medium text-on-surface' : 'font-semibold text-primary'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-on-surface-variant whitespace-nowrap md:text-xs md:ml-2">
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
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {!notif.isRead && (
                      <div className="h-2.5 w-2.5 rounded-full bg-error" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteOne(e, notif._id)}
                      className="rounded-md p-1.5 text-on-surface-variant/50 transition-colors hover:bg-error/10 hover:text-error"
                      title="Xóa thông báo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
