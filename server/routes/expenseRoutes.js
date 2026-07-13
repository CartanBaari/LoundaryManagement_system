import express from 'express';
import {
  createExpense,
  deleteExpense,
  getExpenseById,
  getExpenses,
  getExpenseStats,
  updateExpense,
} from '../controllers/expenseController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/stats/overview', authorize('admin'), getExpenseStats);
router.get('/', authorize('admin'), getExpenses);
router.get('/:id', authorize('admin'), getExpenseById);
router.post('/', authorize('admin'), createExpense);
router.put('/:id', authorize('admin'), updateExpense);
router.delete('/:id', authorize('admin'), deleteExpense);

export default router;
