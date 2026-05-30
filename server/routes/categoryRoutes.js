import express from 'express';
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../controllers/categoryController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getCategories);
router.post('/', authorize('admin'), createCategory);
router.put('/:id', authorize('admin'), updateCategory);
router.delete('/:id', authorize('admin'), deleteCategory);

export default router;
