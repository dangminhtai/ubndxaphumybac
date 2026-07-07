import Notification, { INotification } from '../models/Notification';
import GlobalNotification from '../models/GlobalNotification';
import User from '../models/User';

export async function createNotification(payload: {
  recipientId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
}) {
  return Notification.create(payload);
}

export async function notifyAllUsers(payload: {
  title: string;
  message: string;
  type?: string;
  link?: string;
  excludeRoles?: string[];
}) {
  const query: any = {};
  if (payload.excludeRoles && payload.excludeRoles.length > 0) {
    query.role = { $nin: payload.excludeRoles };
  }
  
  const users = await User.find(query).select('_id');
  if (users.length === 0) return;

  const notifications = users.map(user => ({
    recipientId: user._id,
    title: payload.title,
    message: payload.message,
    type: payload.type || 'system',
    link: payload.link,
  }));

  await Notification.insertMany(notifications);

  // Save to GlobalNotification for future users
  if (!payload.excludeRoles || payload.excludeRoles.length === 0) {
    await GlobalNotification.create({
      title: payload.title,
      message: payload.message,
      type: payload.type || 'system',
      link: payload.link,
    });
  }
}
export async function notifyUsersByRole(payload: {
  roles: string[];
  title: string;
  message: string;
  type?: string;
  link?: string;
}) {
  const users = await User.find({ role: { $in: payload.roles }, isActive: true }).select('_id');
  if (users.length === 0) return;

  const notifications = users.map(user => ({
    recipientId: user._id,
    title: payload.title,
    message: payload.message,
    type: payload.type || 'system',
    link: payload.link,
  }));

  await Notification.insertMany(notifications);
}

export async function getUserNotifications(userId: string, limit: number = 20) {
  const notifications = await Notification.find({ recipientId: userId })
    .sort({ createdAt: -1 })
    .limit(limit);
    
  const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });
  
  return { notifications, unreadCount };
}

export async function markAsRead(notificationId: string, userId: string) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId: userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) {
    const error = new Error('Không tìm thấy thông báo');
    Object.assign(error, { statusCode: 404 });
    throw error;
  }
  return notification;
}

export async function markAllAsRead(userId: string) {
  await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { isRead: true }
  );
  return { success: true };
}

export async function generateOnboardingNotifications(userId: string) {
  // Fetch global notifications from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const globalNotifs = await GlobalNotification.find({
    createdAt: { $gte: thirtyDaysAgo }
  });

  if (globalNotifs.length === 0) return;

  const notifications = globalNotifs.map(gn => ({
    recipientId: userId,
    title: gn.title,
    message: gn.message,
    type: gn.type,
    link: gn.link,
    createdAt: gn.createdAt,
  }));

  await Notification.insertMany(notifications);
}
