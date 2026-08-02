import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.js';
import Schedule from '../models/Schedule.js';
import Sport from '../models/Sport.js';
import Enrollment from '../models/Enrollment.js';
import Child from '../models/Child.js';
import User from '../models/User.js';
import { sendScheduleUpdateEmail } from '../services/emailService.js';

/**
 * GET /api/schedules
 * Public: View all schedules optionally filtered by sport
 */
export const getAllSchedules = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { sportId, dayOfWeek } = req.query;
    const filter: Record<string, unknown> = {};

    if (sportId && typeof sportId === 'string') {
      filter.sportId = sportId;
    }
    if (dayOfWeek && typeof dayOfWeek === 'string') {
      filter.dayOfWeek = dayOfWeek;
    }

    const schedules = await Schedule.find(filter)
      .populate('sportId', 'name price minAge maxAge')
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      status: 200,
      count: schedules.length,
      data: schedules,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching schedules.',
    });
  }
};

/**
 * POST /api/schedules
 * Admin only: Create a schedule
 */
export const createSchedule = async (
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

    const {
      sportId,
      dayOfWeek,
      startTime,
      endTime,
      groupName,
      minAge,
      maxAge,
      maxCapacity,
      coachName,
      location,
    } = req.body;

    // Verify sport exists
    const sport = await Sport.findById(sportId);
    if (!sport) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Sport not found.',
      });
      return;
    }

    const schedule = await Schedule.create({
      sportId,
      dayOfWeek,
      startTime,
      endTime,
      groupName,
      minAge,
      maxAge,
      maxCapacity,
      coachName,
      location,
    });

    const populatedSchedule = await Schedule.findById(schedule._id).populate(
      'sportId',
      'name price minAge maxAge'
    );

    res.status(201).json({
      success: true,
      status: 201,
      message: 'Schedule created successfully.',
      data: populatedSchedule,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while creating schedule.',
    });
  }
};

/**
 * PUT /api/schedules/:id
 * Admin only: Update a schedule and notify affected parents
 */
export const updateSchedule = async (
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
    const updateData = req.body;

    const schedule = await Schedule.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('sportId', 'name price minAge maxAge');

    if (!schedule) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Schedule not found.',
      });
      return;
    }

    // Send schedule update emails to parents of enrolled children (non-blocking)
    const sport = schedule.sportId as any;
    if (sport) {
      // Build schedule info string for the email
      const scheduleInfo = `${schedule.dayOfWeek} : ${schedule.startTime} - ${schedule.endTime}${schedule.location ? ` | Lieu: ${schedule.location}` : ''}${schedule.coachName ? ` | Coach: ${schedule.coachName}` : ''}`;

      // Find all approved enrollments for this sport
      const enrollments = await Enrollment.find({
        sportId: sport._id,
        status: 'APPROVED',
      }).populate({
        path: 'childId',
        select: 'firstName lastName parentId',
        populate: {
          path: 'parentId',
          select: 'fullName email',
        },
      });

      // Send email to each parent
      for (const enrollment of enrollments) {
        const child = enrollment.childId as any;
        const parent = child?.parentId;
        if (parent && parent.email) {
          const childName = `${child.firstName} ${child.lastName}`;
          sendScheduleUpdateEmail(
            parent.email,
            parent.fullName,
            childName,
            sport.name,
            scheduleInfo
          ).catch((err) =>
            console.error('Failed to send schedule update email:', err)
          );
        }
      }
    }

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Schedule updated successfully.',
      data: schedule,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while updating schedule.',
    });
  }
};

/**
 * DELETE /api/schedules/:id
 * Admin only: Delete a schedule
 */
export const deleteSchedule = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findByIdAndDelete(id);

    if (!schedule) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Schedule not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Schedule deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while deleting schedule.',
    });
  }
};