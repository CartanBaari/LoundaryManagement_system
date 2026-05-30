import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getUserIdsByRoles } from './userRoleService.js';

export const createNotification = async ({
  userId,
  recipientModel = 'User',
  orderId = null,
  message,
  type = 'system',
  sentBy = null,
}) => {
  if (!userId || !message) {
    return null;
  }

  return Notification.create({
    userId,
    recipientModel,
    orderId,
    message,
    type,
    sentBy,
  });
};

export const notifyUsersByRole = async ({ roles = [], orderId = null, message, type = 'system', sentBy = null }) => {
  if (!roles.length || !message) {
    return [];
  }

  const userIds = await getUserIdsByRoles(roles);
  const users = await User.find({ _id: { $in: userIds }, isActive: true }).select('_id');

  if (!users.length) {
    return [];
  }

  const payload = users.map((user) => ({
    userId: user._id,
    recipientModel: 'User',
    orderId,
    message,
    type,
    sentBy,
  }));

  return Notification.insertMany(payload);
};

export const notifyUserIds = async ({ userIds = [], orderId = null, message, type = 'system', sentBy = null }) => {
  const validIds = [...new Set(userIds.filter(Boolean).map((id) => id.toString()))];

  if (!validIds.length || !message) {
    return [];
  }

  const payload = validIds.map((userId) => ({
    userId,
    recipientModel: 'User',
    orderId,
    message,
    type,
    sentBy,
  }));

  return Notification.insertMany(payload);
};
