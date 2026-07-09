import express from 'express';
import {
  createPayment,
  getOutstandingPayments,
  getPaymentInvoices,
  getPaymentReports,
  getPayments,
  getPaymentStats,
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/stats/overview', authorize('admin', 'staff'), getPaymentStats);
router.get('/reports/summary', authorize('admin', 'staff'), getPaymentReports);
router.get('/outstanding', authorize('admin'), getOutstandingPayments);
router.get('/invoices', authorize('admin', 'staff', 'client'), getPaymentInvoices);
router.get('/', authorize('admin', 'staff'), getPayments);
router.post('/', authorize('admin'), createPayment);

export default router;
