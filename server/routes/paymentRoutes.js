import express from 'express';
import {
  createPayment,
  deletePayment,
  getOutstandingPayments,
  getPaymentById,
  getPaymentInvoices,
  getPaymentReports,
  getPayments,
  getPaymentStats,
  updatePayment,
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/stats/overview', authorize('admin', 'staff'), getPaymentStats);
router.get('/reports/summary', authorize('admin', 'staff'), getPaymentReports);
router.get('/outstanding', authorize('admin'), getOutstandingPayments);
router.get('/invoices', authorize('admin', 'staff', 'client'), getPaymentInvoices);
router.get('/', authorize('admin', 'staff'), getPayments);
router.get('/:id', authorize('admin', 'staff'), getPaymentById);
router.post('/', authorize('admin'), createPayment);
router.put('/:id', authorize('admin'), updatePayment);
router.delete('/:id', authorize('admin'), deletePayment);

export default router;
