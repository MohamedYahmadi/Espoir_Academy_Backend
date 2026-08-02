import { Router } from 'express';
import {
  getAllPayments,
  getMyPayments,
  createPayment,
  updatePaymentStatus,
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  createPaymentValidator,
  updatePaymentStatusValidator,
  paymentStatusQueryValidator,
} from '../validators/index.js';

const router = Router();

// GET /api/payments - Admin only: List all payments
router.get(
  '/',
  protect,
  authorize('admin'),
  paymentStatusQueryValidator,
  getAllPayments
);

// GET /api/payments/my - Parent only: View own payments
router.get(
  '/my',
  protect,
  authorize('parent'),
  getMyPayments
);

// POST /api/payments - Admin only: Create payment record
router.post(
  '/',
  protect,
  authorize('admin'),
  createPaymentValidator,
  createPayment
);

// PATCH /api/payments/:id/status - Admin only: Update payment status
router.patch(
  '/:id/status',
  protect,
  authorize('admin'),
  updatePaymentStatusValidator,
  updatePaymentStatus
);

export default router;