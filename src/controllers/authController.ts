import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail, sendProfileUpdateEmail, sendPasswordChangedEmail } from '../services/emailService.js';
import { saveFile, deleteFile } from '../services/storageService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate JWT token
const generateToken = (id: string, role: string): string => {
  const expiresIn: any = process.env.JWT_EXPIRES_IN || '30d';
  return jwt.sign({ id, role }, process.env.JWT_SECRET!, {
    expiresIn,
  });
};

/**
 * POST /api/auth/register
 * Register a new parent account
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        status: 400,
        message: errors.array().map((e) => e.msg).join(', '),
      });
      return;
    }

    const { fullName, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'An account with this email already exists.',
      });
      return;
    }

    const user = await User.create({
      fullName,
      email,
      password,
      phone,
      isVerified: false,
    });

    // Generate a verification token and send the confirmation email
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    sendVerificationEmail(user.email, user.fullName, verificationToken).catch((err) =>
      console.error('Failed to send verification email:', err)
    );

    res.status(201).json({
      success: true,
      status: 201,
      message:
        'Account created successfully. Please check your email to verify your account before logging in.',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error during registration.',
    });
  }
};

/**
 * GET /api/auth/verify-email/:token
 * Verify a user's email address using the emailed token
 */
export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;

    const hashedToken = crypto
      .createHash('sha256')
      .update(token as string)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid or expired verification link.',
      });
      return;
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // Send the welcome email after a successful verification (non-blocking)
    sendWelcomeEmail(user.email, user.fullName).catch((err) =>
      console.error('Failed to send welcome email:', err)
    );

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Email verified successfully.',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while verifying email.',
    });
  }
};

/**
 * POST /api/auth/resend-verification
 * Resend the email verification link to an unverified account
 */
export const resendVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        status: 400,
        message: errors.array().map((e) => e.msg).join(', '),
      });
      return;
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether the email exists
      res.status(200).json({
        success: true,
        status: 200,
        message: 'If this account exists, a verification email has been sent.',
      });
      return;
    }

    if (user.isVerified) {
      res.status(200).json({
        success: true,
        status: 200,
        message: 'This account is already verified. You can log in.',
      });
      return;
    }

    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    sendVerificationEmail(user.email, user.fullName, verificationToken).catch((err) =>
      console.error('Failed to send verification email:', err)
    );

    res.status(200).json({
      success: true,
      status: 200,
      message: 'A new verification email has been sent. Please check your inbox.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while resending verification email.',
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        status: 400,
        message: errors.array().map((e) => e.msg).join(', '),
      });
      return;
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({
        success: false,
        status: 401,
        message: 'Invalid email or password.',
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        status: 403,
        message: 'Your account has been deactivated. Contact the administrator.',
      });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        status: 403,
        code: 'EMAIL_NOT_VERIFIED',
        message:
          'Please verify your email address before logging in. Check your inbox for the verification link.',
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        status: 401,
        message: 'Invalid email or password.',
      });
      return;
    }

    const token = generateToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          profilePicture: user.profilePicture,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error during login.',
    });
  }
};

/**
 * GET /api/auth/profile
 * Get current authenticated user profile
 */
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      status: 200,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching profile.',
    });
  }
};

/**
 * POST /api/auth/profile-picture
 * Upload current user's profile picture
 */
export const uploadProfilePicture = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'No file uploaded. Please select a profile picture.',
      });
      return;
    }

    const profilePicture = await saveFile(req.file.buffer, {
      folder: 'profiles',
      fieldname: 'profilePicture',
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    const oldProfilePicture = user.profilePicture;
    user.profilePicture = profilePicture;
    await user.save();

    // Remove the previous picture from storage (best-effort)
    if (oldProfilePicture) {
      await deleteFile(oldProfilePicture).catch(() => {});
    }

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Profile picture updated successfully.',
      data: { profilePicture: user.profilePicture },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while uploading profile picture.',
    });
  }
};

/**
 * DELETE /api/auth/profile-picture
 * Remove the current user's profile picture
 */
export const removeProfilePicture = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
      return;
    }

    const oldProfilePicture = user.profilePicture;
    user.profilePicture = '';
    await user.save();

    // Remove the picture from storage (best-effort)
    if (oldProfilePicture) {
      await deleteFile(oldProfilePicture).catch(() => {});
    }

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Profile picture removed successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while removing profile picture.',
    });
  }
};

/**
 * PUT /api/auth/profile
 * Update current authenticated user profile
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        status: 400,
        message: errors.array().map((e) => e.msg).join(', '),
      });
      return;
    }

    const { fullName, phone, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user!.id).select('+password');

    if (!user) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
      return;
    }

    let passwordChanged = false;

    // Update basic fields
    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;

    // Update password if provided
    if (currentPassword && newPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        res.status(400).json({
          success: false,
          status: 400,
          message: 'Current password is incorrect.',
        });
        return;
      }
      user.password = newPassword;
      passwordChanged = true;
    }

    await user.save();

    // Send email (non-blocking) — password-changed email when relevant, else profile update email
    if (passwordChanged) {
      sendPasswordChangedEmail(user.email, user.fullName).catch((err) =>
        console.error('Failed to send password changed email:', err)
      );
    } else {
      sendProfileUpdateEmail(user.email, user.fullName).catch((err) =>
        console.error('Failed to send profile update email:', err)
      );
    }

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Profile updated successfully.',
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while updating profile.',
    });
  }
};

/**
 * POST /api/auth/forgot-password
 * Generate reset password token and send via email
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        status: 400,
        message: errors.array().map((e) => e.msg).join(', '),
      });
      return;
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'No account found with this email address.',
      });
      return;
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Send password reset email (non-blocking)
    sendPasswordResetEmail(user.email, user.fullName, resetToken).catch((err) =>
      console.error('Failed to send password reset email:', err)
    );

    res.status(200).json({
      success: true,
      status: 200,
      message: 'If an account with this email exists, a password reset link has been sent.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while processing forgot password request.',
    });
  }
};

/**
 * POST /api/auth/reset-password/:token
 * Reset password with token
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        status: 400,
        message: errors.array().map((e) => e.msg).join(', '),
      });
      return;
    }

    const { token } = req.params;
    const { password } = req.body;

    // Hash the token from params to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token as string).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid or expired reset token.',
      });
      return;
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const jwtToken = generateToken(user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Password reset successful.',
      data: { token: jwtToken },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while resetting password.',
    });
  }
};