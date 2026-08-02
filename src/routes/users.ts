import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  getUserChildren,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { updateUserValidator, userIdValidator } from '../validators/index.js';

const router = Router();

// GET /api/users - Admin only: List all users
router.get(
  '/',
  protect,
  authorize('admin'),
  getAllUsers
);

// GET /api/users/:id - Admin only: Get user + children
router.get(
  '/:id',
  protect,
  authorize('admin'),
  userIdValidator,
  getUserById
);

// PUT /api/users/:id - Admin only: Update user
router.put(
  '/:id',
  protect,
  authorize('admin'),
  updateUserValidator,
  updateUser
);

// DELETE /api/users/:id - Admin only: Deactivate user
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  userIdValidator,
  deactivateUser
);

// GET /api/users/:id/children - Admin only: Get user's children
router.get(
  '/:id/children',
  protect,
  authorize('admin'),
  userIdValidator,
  getUserChildren
);

export default router;