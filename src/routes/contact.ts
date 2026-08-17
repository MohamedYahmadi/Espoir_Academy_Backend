import { Router } from 'express';
import {
  sendContactMessage,
  getMyMessages,
  getAllMessages,
  replyContactMessage,
} from '../controllers/contactController.js';
import { protect, protectOptional, authorize } from '../middleware/auth.js';
import {
  contactMessageValidator,
  contactReplyValidator,
  contactMessageIdValidator,
} from '../validators/index.js';

const router = Router();

// POST /api/contact - Send a message to the academy
// Authenticated users: message persisted + email. Anonymous users: email only.
router.post('/', protectOptional, contactMessageValidator, sendContactMessage);

// GET /api/contact/my - Logged-in user: their own messages and replies
router.get('/my', protect, getMyMessages);

// GET /api/contact/messages - Admin only: all contact messages
router.get(
  '/messages',
  protect,
  authorize('admin'),
  getAllMessages
);

// POST /api/contact/:id/reply - Admin only: reply to a message
router.post(
  '/:id/reply',
  protect,
  authorize('admin'),
  contactMessageIdValidator,
  contactReplyValidator,
  replyContactMessage
);

export default router;