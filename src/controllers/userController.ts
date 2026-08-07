import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';
import Child from '../models/Child.js';
import { sendAdminPasswordResetEmail, sendAdminUserUpdatedEmail } from '../services/emailService.js';

/**
 * Generate a random temporary password
 */
const generateTempPassword = (): string => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * GET /api/users
 * Admin only: List all users with optional filters
 */
export const getAllUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { role, isActive, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (role && typeof role === 'string') {
      filter.role = role;
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    if (search && typeof search === 'string') {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      status: 200,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching users.',
    });
  }
};

/**
 * GET /api/users/:id
 * Admin only: Get user details with their children
 */
export const getUserById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
      return;
    }

    const children = await Child.find({ parentId: id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      status: 200,
      data: {
        user,
        children,
        childrenCount: children.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching user.',
    });
  }
};

/**
 * PUT /api/users/:id
 * Admin only: Update user (name, email, phone, role, isActive)
 */
export const updateUser = async (
  req: AuthRequest,
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

    const { id } = req.params;
    const { fullName, email, phone, role, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
      return;
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Send admin user update email (non-blocking)
    sendAdminUserUpdatedEmail(user.email, user.fullName).catch((err) =>
      console.error('Failed to send admin user update email:', err)
    );

    res.status(200).json({
      success: true,
      status: 200,
      message: 'User updated successfully.',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while updating user.',
    });
  }
};

/**
 * PATCH /api/users/:id/reset-password
 * Admin only: Reset a user's password and send them an email with the new temporary password
 */
export const resetUserPassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
      return;
    }

    // Generate a temporary password
    const tempPassword = generateTempPassword();

    // Set the new password (will be hashed by the pre-save hook)
    user.password = tempPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send admin password reset email (non-blocking)
    sendAdminPasswordResetEmail(user.email, user.fullName, tempPassword).catch((err) =>
      console.error('Failed to send admin password reset email:', err)
    );

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Password reset successfully. The user will receive an email with the new temporary password.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while resetting user password.',
    });
  }
};

/**
 * DELETE /api/users/:id
 * Admin only: Soft delete (deactivate) user
 */
export const deactivateUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
      return;
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      status: 200,
      message: 'User deactivated successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while deactivating user.',
    });
  }
};

/**
 * GET /api/users/:id/children
 * Admin only: Get specific parent's children
 */
export const getUserChildren = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
      return;
    }

    const children = await Child.find({ parentId: id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      status: 200,
      count: children.length,
      data: children,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching children.',
    });
  }
};