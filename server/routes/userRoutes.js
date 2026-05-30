import express from 'express';
import {
  createUser,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getStaffMembers,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Admin only
router.post('/', authorize('admin'), createUser);
router.get('/', authorize('admin'), getAllUsers);
router.delete('/:id', authorize('admin'), deleteUser);
router.get('/staff/list', getStaffMembers);

// User routes
router.get('/:id', getUser);
router.put('/:id', updateUser);

export default router;
