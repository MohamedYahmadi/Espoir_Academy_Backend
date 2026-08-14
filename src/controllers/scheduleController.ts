import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.js';
import Schedule from '../models/Schedule.js';
import Sport from '../models/Sport.js';
import Enrollment from '../models/Enrollment.js';
import Child from '../models/Child.js';
import User from '../models/User.js';
import { sendScheduleUpdateEmail } from '../services/emailService.js';
import { notifyParentsOfSport } from '../services/notificationService.js';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Derive the day-of-week name from a date string or Date.
 */
const getDayOfWeek = (date: string | Date): string => {
  const d = new Date(date);
  return DAY_NAMES[d.getDay()];
};

/**
 * GET /api/schedules
 * Public: View all schedules optionally filtered by sport or date
 */
export const getAllSchedules = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { sportId, dayOfWeek, date, from, to } = req.query;
    const filter: Record<string, unknown> = {};

    if (sportId && typeof sportId === 'string') {
      filter.sportId = sportId;
    }
    if (dayOfWeek && typeof dayOfWeek === 'string') {
      filter.dayOfWeek = dayOfWeek;
    }
    if (date && typeof date === 'string') {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.date = { $gte: start, $lt: end };
    }
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from && typeof from === 'string') {
        range.$gte = new Date(from);
      }
      if (to && typeof to === 'string') {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
      }
      filter.date = { ...(filter.date as object), ...range };
    }

    const schedules = await Schedule.find(filter)
      .populate('sportId', 'name price minAge maxAge')
      .sort({ date: 1, startTime: 1 });

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
      date,
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
      date,
      dayOfWeek: dayOfWeek || getDayOfWeek(date),
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

    // Notify parents of children enrolled in this sport (targeted)
    if (schedule.sportId) {
      const sport = await Sport.findById(schedule.sportId).select('name');
      const dateStr = new Date(schedule.date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      await notifyParentsOfSport(schedule.sportId, {
        type: 'SCHEDULE_CREATED',
        title: 'Nouvelle séance planifiée',
        message: `Une nouvelle séance de ${sport?.name || 'sport'} a été ajoutée le ${dateStr} à ${schedule.startTime}.`,
        sportId: schedule.sportId,
        scheduleId: schedule._id,
      });
    }

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
    const updateData = req.body as Record<string, unknown>;

    if (updateData.date && !updateData.dayOfWeek) {
      updateData.dayOfWeek = getDayOfWeek(updateData.date as string);
    }

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

    // Notify parents of children enrolled in this sport (targeted)
    if (schedule.sportId) {
      const sport = await Sport.findById(schedule.sportId).select('name');
      const dateStr = new Date(schedule.date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      await notifyParentsOfSport(schedule.sportId, {
        type: 'SCHEDULE_UPDATED',
        title: 'Séance mise à jour',
        message: `La séance de ${sport?.name || 'sport'} du ${dateStr} est désormais à ${schedule.startTime} - ${schedule.endTime}.`,
        sportId: schedule.sportId,
        scheduleId: schedule._id,
      });
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