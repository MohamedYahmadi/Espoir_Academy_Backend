import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// All notification routes are protected and parent-only
router.use(protect, authorize('parent'));

// GET /api/notifications - Parent's notifications
router.get('/', getNotifications);

// GET /api/notifications/unread-count
router.get('/unread-count', getUnreadCount);

// PATCH /api/notifications/read-all
router.patch('/read-all', markAllNotificationsRead);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', markNotificationRead);

export default router;
