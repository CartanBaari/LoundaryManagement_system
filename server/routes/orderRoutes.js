import express from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  getOrderStats,
  getDailyOrderLimitStatus,
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes (protected)
router.use(protect);

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/stats/overview', getOrderStats);
router.get('/daily-limit/status', getDailyOrderLimitStatus);
router.get('/:id', getOrder);

// Admin and staff only
router.put('/:id', updateOrder);
router.delete('/:id', authorize('admin'), deleteOrder);

export default router;
