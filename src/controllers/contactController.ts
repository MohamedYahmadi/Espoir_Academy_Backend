import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';
import ContactMessage from '../models/ContactMessage.js';
import {
  sendContactMessageEmail,
  sendContactReplyEmail,
} from '../services/emailService.js';
import { notifyUser } from '../services/notificationService.js';

/**
 * POST /api/contact
 * Authenticated user: message is persisted (visible in the admin backoffice)
 * and delivered to the academy inbox.
 * Anonymous user: message is delivered to the academy inbox ONLY (email), it
 * is not persisted in the app — the admin replies directly from the email.
 */
export const sendContactMessage = async (
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

    const { name, phone, sport, message, email } = req.body;

    // Authenticated user
    if (req.user?.id) {
      const user = await User.findById(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          status: 404,
          message: 'User not found.',
        });
        return;
      }

      // Persist the message so the admin can view and reply to it in the backoffice
      const contactMessage = await ContactMessage.create({
        userId: user._id,
        senderName: name || user.fullName,
        senderEmail: user.email,
        phone: phone || user.phone || '',
        sport: sport || '',
        message,
      });

      // Deliver to the academy inbox via the same SMTP account used for all emails
      await sendContactMessageEmail({
        senderEmail: user.email,
        senderName: contactMessage.senderName,
        phone: contactMessage.phone,
        sport: contactMessage.sport || '',
        message,
      });

      res.status(201).json({
        success: true,
        status: 201,
        message: 'Message envoyé avec succès.',
        data: contactMessage,
      });
      return;
    }

    // Anonymous user: email only, nothing persisted in the app
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'Un email valide est requis pour envoyer un message.',
      });
      return;
    }

    await sendContactMessageEmail({
      senderEmail: email,
      senderName: name || email,
      phone: phone || '',
      sport: sport || '',
      message,
    });

    res.status(201).json({
      success: true,
      status: 201,
      message: 'Message envoyé avec succès. Nous vous répondrons par email.',
      data: { email },
    });
  } catch (error) {
    console.error('Failed to send contact message:', error);
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while sending your message. Please try again later.',
    });
  }
};

/**
 * GET /api/contact/my
 * Logged-in user: fetch their own contact messages and admin replies
 */
export const getMyMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const messages = await ContactMessage.find({ userId: req.user!.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      status: 200,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error('Failed to fetch user messages:', error);
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching your messages.',
    });
  }
};

/**
 * GET /api/contact/messages
 * Admin only: list all contact messages with sender info, newest first
 */
export const getAllMessages = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const messages = await ContactMessage.find()
      .populate('userId', 'fullName email phone role isActive')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      status: 200,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error('Failed to fetch contact messages:', error);
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching messages.',
    });
  }
};

/**
 * POST /api/contact/:id/reply
 * Admin only: reply to a message — delivers the response in-app (notification
 * center) and sends a backup email to the user.
 */
export const replyContactMessage = async (
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
    const { reply } = req.body;

    const message = await ContactMessage.findById(id);
    if (!message) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Message not found.',
      });
      return;
    }

    message.reply = reply;
    message.repliedAt = new Date();
    message.read = true;
    await message.save();

    // In-app notification (primary channel)
    await notifyUser(message.userId, {
      type: 'CONTACT_REPLY',
      title: 'Réponse de l\'académie',
      message: reply,
    });

    // Backup email to the user's inbox
    const user = await User.findById(message.userId);
    if (user && user.isActive) {
      await sendContactReplyEmail({
        to: user.email,
        fullName: user.fullName,
        originalMessage: message.message,
        reply,
      }).catch((error) => {
        console.error('Failed to send contact reply email:', error);
      });
    }

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Réponse envoyée avec succès.',
      data: message,
    });
  } catch (error) {
    console.error('Failed to reply to contact message:', error);
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while sending the reply.',
    });
  }
};