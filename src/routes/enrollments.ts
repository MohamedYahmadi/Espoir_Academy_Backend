import { Router } from 'express';
import {
  createEnrollment,
  getMyKidsEnrollments,
  getAllEnrollments,
  updateEnrollmentStatus,
} from '../controllers/enrollmentController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  createEnrollmentValidator,
  enrollmentStatusValidator,
  statusQueryValidator,
} from '../validators/index.js';

const router = Router();

// POST /api/enrollments - Parent only: Request enrollment
router.post(
  '/',
  protect,
  authorize('parent'),
  createEnrollmentValidator,
  createEnrollment
);

// GET /api/enrollments/child/:childId - Parent only: Fetch enrollments for a specific child
router.get(
  '/child/:childId',
  protect,
  authorize('parent'),
  getMyKidsEnrollments
);

// GET /api/enrollments/my-kids - Parent only: Fetch my kids enrollments
router.get(
  '/my-kids',
  protect,
  authorize('parent'),
  getMyKidsEnrollments
);

// GET /api/enrollments/admin - Admin only: List all enrollments
router.get(
  '/admin',
  protect,
  authorize('admin'),
  statusQueryValidator,
  getAllEnrollments
);

// PATCH /api/enrollments/admin/:id/status - Admin only: Approve/Reject
router.patch(
  '/admin/:id/status',
  protect,
  authorize('admin'),
  enrollmentStatusValidator,
  updateEnrollmentStatus
);

export default router;