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

// POST /api/enrollments - Parent or Admin: Request enrollment
router.post(
  '/',
  protect,
  authorize('parent', 'admin'),
  createEnrollmentValidator,
  createEnrollment
);

// GET /api/enrollments/child/:childId - Parent or Admin: Fetch enrollments for a specific child
router.get(
  '/child/:childId',
  protect,
  authorize('parent', 'admin'),
  getMyKidsEnrollments
);

// GET /api/enrollments/my-kids - Parent or Admin: Fetch my kids enrollments
router.get(
  '/my-kids',
  protect,
  authorize('parent', 'admin'),
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