import express from 'express';
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
} from '../controllers/paymentMethodController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'staff'), getPaymentMethods);
router.post('/', authorize('admin'), createPaymentMethod);
router.put('/:id', authorize('admin'), updatePaymentMethod);
router.delete('/:id', authorize('admin'), deletePaymentMethod);

export default router;
