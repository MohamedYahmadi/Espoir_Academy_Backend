import { Router } from 'express';
import {
  register,
  login,
  verifyEmail,
  resendVerification,
  getProfile,
  updateProfile,
  uploadProfilePicture,
  removeProfilePicture,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadProfilePicture as uploadProfileMiddleware } from '../middleware/uploadProfile.js';
import {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  resendVerificationValidator,
} from '../validators/index.js';

const router = Router();

// POST /api/auth/register - Register a parent account
router.post('/register', registerValidator, register);

// GET /api/auth/verify-email/:token - Verify an email address
router.get('/verify-email/:token', verifyEmail);

// POST /api/auth/resend-verification - Resend verification email
router.post('/resend-verification', resendVerificationValidator, resendVerification);

// POST /api/auth/login - Authenticate and return JWT
router.post('/login', loginValidator, login);

// Protected routes - Both admin and parent can manage their own profile
// GET /api/auth/profile - Get current user profile
router.get('/profile', protect, authorize('admin', 'parent'), getProfile);

// PUT /api/auth/profile - Update current user profile
router.put('/profile', protect, authorize('admin', 'parent'), updateProfileValidator, updateProfile);

// POST /api/auth/profile-picture - Upload profile picture
router.post('/profile-picture', protect, authorize('admin', 'parent'), uploadProfileMiddleware, uploadProfilePicture);

// DELETE /api/auth/profile-picture - Remove profile picture
router.delete('/profile-picture', protect, authorize('admin', 'parent'), removeProfilePicture);

// POST /api/auth/forgot-password - Generate reset token
router.post('/forgot-password', forgotPasswordValidator, forgotPassword);

// POST /api/auth/reset-password/:token - Reset password with token
router.post('/reset-password/:token', resetPasswordValidator, resetPassword);

export default router;