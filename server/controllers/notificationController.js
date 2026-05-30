import Notification from '../models/Notification.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { emailIsConfigured, getMissingEmailConfig, sendBulkEmail, sendEmail } from '../utils/emailService.js';
import { attachRoleToUsers } from '../utils/userRoleService.js';
import { findClientById, findClients } from '../utils/accountService.js';

// Get user notifications
export const getNotifications = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const filter = {
    userId: req.user._id,
    recipientModel: req.user.role === 'client' ? 'Client' : 'User',
  };

  if (req.user.role === 'client') {
    filter.orderId = { $ne: null };
  }

  const notifications = await Notification.find(filter)
    .populate({
      path: 'orderId',
      select: 'orderNumber status userId',
      populate: {
        path: 'userId',
        select: 'name email',
      },
    })
    .populate('sentBy', 'name email')
    .sort('-createdAt')
    .limit(parseInt(limit, 10));

  const sentByUsers = notifications
    .map((notification) => notification.sentBy)
    .filter(Boolean);
  const decoratedSenders = await attachRoleToUsers(sentByUsers);
  const senderRoleMap = new Map(decoratedSenders.map((user) => [user._id.toString(), user.role]));

  const notificationsWithRoles = notifications.map((notification) => {
    const notificationObject = notification.toObject();

    if (notificationObject.sentBy?._id) {
      notificationObject.sentBy.role =
        senderRoleMap.get(notificationObject.sentBy._id.toString()) || 'client';
    }

    return notificationObject;
  });

  const unreadCount = await Notification.countDocuments({
    ...filter,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    unreadCount,
    notifications: notificationsWithRoles,
  });
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req, res) => {
  let notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  // Check if user owns this notification
  if (
    notification.userId.toString() !== req.user._id.toString() ||
    notification.recipientModel !== (req.user.role === 'client' ? 'Client' : 'User')
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this notification',
    });
  }

  notification.isRead = true;
  notification = await notification.save();

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    notification,
  });
});

// Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    {
      userId: req.user._id,
      recipientModel: req.user.role === 'client' ? 'Client' : 'User',
      isRead: false,
    },
    { isRead: true }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  });
});

// Delete notification
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found',
    });
  }

  if (
    notification.userId.toString() !== req.user._id.toString() ||
    notification.recipientModel !== (req.user.role === 'client' ? 'Client' : 'User')
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this notification',
    });
  }

  await notification.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully',
  });
});

export const getEmailStatus = asyncHandler(async (req, res) => {
  const configured = emailIsConfigured();

  res.status(200).json({
    success: true,
    configured,
    message: configured
      ? 'Email service is configured and ready.'
      : `Email service is not configured correctly. Fix: ${getMissingEmailConfig().join(', ')}`,
    missing: configured ? [] : getMissingEmailConfig(),
  });
});

export const sendBroadcastMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Message is required',
    });
  }

  const clients = await findClients({ isActive: true });

  if (!clients.length) {
    return res.status(404).json({
      success: false,
      message: 'No active customers found',
    });
  }

  if (!emailIsConfigured()) {
    return res.status(503).json({
      success: false,
      message: `Email service is not configured correctly. Fix: ${getMissingEmailConfig().join(', ')}`,
    });
  }

  const emailResult = await sendBulkEmail({
    recipients: clients,
    subject: 'LaundryHub customer update',
    textBuilder: (client) =>
      `Hello ${client.name || 'Customer'},\n\n${message.trim()}\n\nThank you,\nLaundryHub`,
    htmlBuilder: (client) =>
      `<p>Hello ${client.name || 'Customer'},</p><p>${message.trim()}</p><p>Thank you,<br/>LaundryHub</p>`,
  });

  res.status(200).json({
    success: true,
    message: 'Customer emails dispatched successfully.',
    recipients: clients.length,
    emailSent: emailResult.sent,
    emailSkipped: emailResult.skipped,
  });
});

export const sendDirectMessage = asyncHandler(async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Customer and message are required',
    });
  }

  const customer = await findClientById(userId, { isActive: true });

  if (!customer) {
    return res.status(404).json({
      success: false,
      message: 'Customer not found',
    });
  }

  if (!emailIsConfigured()) {
    return res.status(503).json({
      success: false,
      message: `Email service is not configured correctly. Fix: ${getMissingEmailConfig().join(', ')}`,
    });
  }

  if (customer.email) {
    await sendEmail({
      to: customer.email,
      subject: 'LaundryHub customer update',
      text: `Hello ${customer.name},\n\n${message.trim()}\n\nThank you,\nLaundryHub`,
      html: `<p>Hello ${customer.name},</p><p>${message.trim()}</p><p>Thank you,<br/>LaundryHub</p>`,
    });
  }

  res.status(200).json({
    success: true,
    message: `Email delivered successfully to ${customer.name}.`,
    emailSent: Boolean(customer.email),
  });
});
