import { apiClient } from './client';

export interface AppNotification {
  _id: string;
  recipientId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

export async function getNotifications(limit: number = 20) {
  const response = await apiClient.get<NotificationResponse>('/notifications', { params: { limit } });
  return response.data;
}

export async function markNotificationAsRead(id: string) {
  const response = await apiClient.patch<AppNotification>(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsAsRead() {
  const response = await apiClient.patch<{ success: boolean }>('/notifications/read-all');
  return response.data;
}
