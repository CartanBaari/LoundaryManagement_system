import express from 'express';
import {
  createExpenseCategory,
  deleteExpenseCategory,
  getExpenseCategories,
  updateExpenseCategory,
} from '../controllers/expenseCategoryController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'staff'), getExpenseCategories);
router.post('/', authorize('admin'), createExpenseCategory);
router.put('/:id', authorize('admin'), updateExpenseCategory);
router.delete('/:id', authorize('admin'), deleteExpenseCategory);

export default router;
