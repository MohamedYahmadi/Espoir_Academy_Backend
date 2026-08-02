import { Router } from 'express';
import {
  getAllSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/scheduleController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  createScheduleValidator,
  updateScheduleValidator,
  scheduleIdValidator,
} from '../validators/index.js';

const router = Router();

// GET /api/schedules - Public: View all schedules
router.get('/', getAllSchedules);

// POST /api/schedules - Admin only: Create schedule
router.post(
  '/',
  protect,
  authorize('admin'),
  createScheduleValidator,
  createSchedule
);

// PUT /api/schedules/:id - Admin only: Update schedule
router.put(
  '/:id',
  protect,
  authorize('admin'),
  updateScheduleValidator,
  updateSchedule
);

// DELETE /api/schedules/:id - Admin only: Delete schedule
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  scheduleIdValidator,
  deleteSchedule
);

export default router;