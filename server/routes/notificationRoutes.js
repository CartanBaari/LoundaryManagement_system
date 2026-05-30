import express from 'express';
import {
  getNotifications,
  getEmailStatus,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendBroadcastMessage,
  sendDirectMessage,
} from '../controllers/notificationController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/email-status', authorize('admin'), getEmailStatus);
router.post('/broadcast', authorize('admin'), sendBroadcastMessage);
router.post('/direct', authorize('admin'), sendDirectMessage);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;
