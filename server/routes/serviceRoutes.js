import express from 'express';
import {
  createService,
  deleteService,
  getServices,
  updateService,
} from '../controllers/serviceController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getServices);
router.post('/', authorize('admin'), createService);
router.put('/:id', authorize('admin'), updateService);
router.delete('/:id', authorize('admin'), deleteService);

export default router;
