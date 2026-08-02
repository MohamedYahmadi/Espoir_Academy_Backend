import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  uploadProfilePicture,
  removeProfilePicture,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { uploadProfilePicture as uploadProfileMiddleware } from '../middleware/uploadProfile.js';
import {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from '../validators/index.js';

const router = Router();

// POST /api/auth/register - Register a parent account
router.post('/register', registerValidator, register);

// POST /api/auth/login - Authenticate and return JWT
router.post('/login', loginValidator, login);

// Protected routes
// GET /api/auth/profile - Get current user profile
router.get('/profile', protect, getProfile);

// PUT /api/auth/profile - Update current user profile
router.put('/profile', protect, updateProfileValidator, updateProfile);

// POST /api/auth/profile-picture - Upload profile picture
router.post('/profile-picture', protect, uploadProfileMiddleware, uploadProfilePicture);

// DELETE /api/auth/profile-picture - Remove profile picture
router.delete('/profile-picture', protect, removeProfilePicture);

// POST /api/auth/forgot-password - Generate reset token
router.post('/forgot-password', forgotPasswordValidator, forgotPassword);

// POST /api/auth/reset-password/:token - Reset password with token
router.post('/reset-password/:token', resetPasswordValidator, resetPassword);

export default router;