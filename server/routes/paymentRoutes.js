import express from 'express';
import { createPayment, getPayments } from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', authorize('admin', 'staff'), getPayments);
router.post('/', authorize('admin'), createPayment);

export default router;
