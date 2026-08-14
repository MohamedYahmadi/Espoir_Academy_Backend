import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

/**
 * GET /api/notifications
 * Parent only: Fetch the authenticated user's notifications, newest first.
 * Optional query: ?limit=50, ?unreadOnly=true
 */
export const getNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const unreadOnly = req.query.unreadOnly === 'true';

    const filter: Record<string, unknown> = { recipientId: userId };
    if (unreadOnly) {
      filter.read = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 200));

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      read: false,
    });

    res.status(200).json({
      success: true,
      status: 200,
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching notifications.',
    });
  }
};

/**
 * GET /api/notifications/unread-count
 * Parent only: Get the number of unread notifications.
 */
export const getUnreadCount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      read: false,
    });

    res.status(200).json({
      success: true,
      status: 200,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching unread count.',
    });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Parent only: Mark a single notification as read.
 */
export const markNotificationRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Notification not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Notification marked as read.',
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while updating notification.',
    });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Parent only: Mark all of the user's notifications as read.
 */
export const markAllNotificationsRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    const result = await Notification.updateMany(
      { recipientId: userId, read: false },
      { read: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      status: 200,
      message: 'All notifications marked as read.',
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while updating notifications.',
    });
  }
};
