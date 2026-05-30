import { useState, useCallback, useEffect } from 'react';
import { notificationAPI } from '../services/api';

export const useNotifications = (options = {}) => {
  const { autoFetch = false, limit = 10, refreshInterval = 0 } = options;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emailStatus, setEmailStatus] = useState({
    configured: true,
    message: '',
    missing: [],
  });

  const fetchNotifications = useCallback(async (limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationAPI.getAll({ limit });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.log('[v0] Error fetching notifications:', err.message);
      setError(err.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id) => {
    try {
      setError(null);
      await notificationAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((notif) => (notif._id === id ? { ...notif, isRead: true } : notif))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.log('[v0] Error marking notification as read:', err.message);
      setError(err.response?.data?.message || 'Failed to mark as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      setError(null);
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.log(' Error marking all as read:', err.message);
      setError(err.response?.data?.message || 'Failed to mark all as read');
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      setError(null);
      await notificationAPI.delete(id);
      setNotifications((prev) => {
        const deletedNotification = prev.find((notif) => notif._id === id);
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return prev.filter((notif) => notif._id !== id);
      });
    } catch (err) {
      console.log('Error deleting notification:', err.message);
      setError(err.response?.data?.message || 'Failed to delete notification');
    }
  }, []);

  const sendBroadcast = useCallback(async (data) => {
    try {
      setError(null);
      const response = await notificationAPI.sendBroadcast(data);
      return response.data;
    } catch (err) {
      console.log('Error sending broadcast message:', err.message);
      setError(err.response?.data?.message || 'Failed to send broadcast message');
      throw err;
    }
  }, []);

  const sendDirect = useCallback(async (data) => {
    try {
      setError(null);
      const response = await notificationAPI.sendDirect(data);
      return response.data;
    } catch (err) {
      console.log(' Error sending direct message:', err.message);
      setError(err.response?.data?.message || 'Failed to send direct message');
      throw err;
    }
  }, []);

  const fetchEmailStatus = useCallback(async () => {
    try {
      const response = await notificationAPI.getEmailStatus();
      setEmailStatus({
        configured: Boolean(response.data.configured),
        message: response.data.message || '',
        missing: response.data.missing || [],
      });
      return response.data;
    } catch (err) {
      const nextError = err.response?.data?.message || 'Failed to fetch email status';
      setEmailStatus({
        configured: false,
        message: nextError,
        missing: err.response?.data?.missing || [],
      });
      setError(nextError);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (!autoFetch) {
      return undefined;
    }

    fetchNotifications(limit);

    if (!refreshInterval) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      fetchNotifications(limit);
    }, refreshInterval);

    return () => window.clearInterval(intervalId);
  }, [autoFetch, fetchNotifications, limit, refreshInterval]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendBroadcast,
    sendDirect,
    emailStatus,
    fetchEmailStatus,
  };
};
