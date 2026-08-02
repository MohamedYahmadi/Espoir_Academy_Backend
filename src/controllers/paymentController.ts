import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.js';
import Payment from '../models/Payment.js';
import Enrollment from '../models/Enrollment.js';
import Child from '../models/Child.js';

/**
 * GET /api/payments
 * Admin only: List all payments with optional status filter
 */
export const getAllPayments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: Record<string, unknown> = {};

    if (status && typeof status === 'string') {
      filter.status = status;
    }

    const payments = await Payment.find(filter)
      .populate({
        path: 'childId',
        select: 'firstName lastName parentId',
        populate: { path: 'parentId', select: 'fullName email phone' },
      })
      .populate({
        path: 'enrollmentId',
        select: 'status sportId',
        populate: { path: 'sportId', select: 'name price' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      status: 200,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching payments.',
    });
  }
};

/**
 * GET /api/payments/my
 * Parent only: View own payments
 */
export const getMyPayments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Get all children owned by this parent
    const children = await Child.find({ parentId: req.user!.id }).select('_id');
    const childIds = children.map((c) => c._id);

    const payments = await Payment.find({ childId: { $in: childIds } })
      .populate({
        path: 'childId',
        select: 'firstName lastName',
      })
      .populate({
        path: 'enrollmentId',
        select: 'status sportId',
        populate: { path: 'sportId', select: 'name price' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      status: 200,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching payments.',
    });
  }
};

/**
 * POST /api/payments
 * Admin only: Create a payment record for an enrollment
 */
export const createPayment = async (
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

    const { childId, enrollmentId, amount, dueDate, notes } = req.body;

    // Verify enrollment exists
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Enrollment not found.',
      });
      return;
    }

    const payment = await Payment.create({
      childId,
      enrollmentId,
      amount,
      dueDate: dueDate || undefined,
      notes: notes || '',
    });

    // Update enrollment payment status to PENDING
    enrollment.paymentStatus = 'PENDING';
    await enrollment.save();

    const populatedPayment = await Payment.findById(payment._id)
      .populate({ path: 'childId', select: 'firstName lastName' })
      .populate({
        path: 'enrollmentId',
        select: 'status sportId',
        populate: { path: 'sportId', select: 'name price' },
      });

    res.status(201).json({
      success: true,
      status: 201,
      message: 'Payment record created successfully.',
      data: populatedPayment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while creating payment.',
    });
  }
};

/**
 * PATCH /api/payments/:id/status
 * Admin only: Update payment status
 */
export const updatePaymentStatus = async (
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
    const { status } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Payment not found.',
      });
      return;
    }

    payment.status = status;
    if (status === 'PAID') {
      payment.paidAt = new Date();
    }
    await payment.save();

    // Update enrollment payment status accordingly
    const enrollment = await Enrollment.findById(payment.enrollmentId);
    if (enrollment) {
      enrollment.paymentStatus = status === 'PAID' ? 'PAID' : 'PENDING';
      await enrollment.save();
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate({ path: 'childId', select: 'firstName lastName' })
      .populate({
        path: 'enrollmentId',
        select: 'status sportId paymentStatus',
        populate: { path: 'sportId', select: 'name price' },
      });

    res.status(200).json({
      success: true,
      status: 200,
      message: `Payment status updated to ${status}.`,
      data: populatedPayment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while updating payment status.',
    });
  }
};