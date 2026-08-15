import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.js';
import Enrollment from '../models/Enrollment.js';
import Child from '../models/Child.js';
import Sport from '../models/Sport.js';
import User from '../models/User.js';
import { sendEnrollmentCreatedEmail, sendEnrollmentStatusEmail } from '../services/emailService.js';

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

/**
 * POST /api/enrollments
 * Parent only: Request enrollment with business validations
 */
export const createEnrollment = async (
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

    const { childId, sportId, parentNotes, schedule } = req.body;
    const parentId = req.user!.id;

    // =========================================================
    // VALIDATION 1: Parent Ownership Guard
    // =========================================================
    const child = await Child.findOne({
      _id: childId,
      parentId: parentId,
    });

    if (!child) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Child not found or not associated with your account.',
      });
      return;
    }

    // =========================================================
    // VALIDATION 2: Check sport exists
    // =========================================================
    const sport = await Sport.findById(sportId);
    if (!sport) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Sport not found.',
      });
      return;
    }

    // =========================================================
    // VALIDATION 3: Age Eligibility Verification
    // =========================================================
    const childAge = calculateAge(child.dateOfBirth);

    if (childAge < sport.minAge) {
      res.status(400).json({
        success: false,
        status: 400,
        message: `Child age (${childAge}) is below the minimum required age (${sport.minAge}) for ${sport.name}.`,
      });
      return;
    }

    if (childAge > sport.maxAge) {
      res.status(400).json({
        success: false,
        status: 400,
        message: `Child age (${childAge}) exceeds the maximum allowed age (${sport.maxAge}) for ${sport.name}.`,
      });
      return;
    }

    // =========================================================
    // VALIDATION 4: Check if child has required documents
    // =========================================================
    if (!child.documents?.photoUrl || !child.documents?.birthCertificateUrl || !child.documents?.medicalCertificateUrl) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'Please upload all required documents (photo, birth certificate, medical certificate) before enrolling.',
      });
      return;
    }

    // =========================================================
    // VALIDATION 5: Duplicate Enrollment Prevention
    // =========================================================
    const existingEnrollment = await Enrollment.findOne({
      childId,
      sportId,
      status: { $in: ['PENDING', 'APPROVED'] },
    });

    if (existingEnrollment) {
      res.status(400).json({
        success: false,
        status: 400,
        message: `This child is already enrolled (${existingEnrollment.status.toLowerCase()}) in ${sport.name}.`,
      });
      return;
    }

    // =========================================================
    // VALIDATION 5: Capacity Check
    // =========================================================
    const activeEnrollmentCount = await Enrollment.countDocuments({
      sportId,
      status: { $in: ['PENDING', 'APPROVED'] },
    });

    if (activeEnrollmentCount >= sport.maxCapacity) {
      res.status(400).json({
        success: false,
        status: 400,
        message: `Sport capacity reached. ${sport.name} is full (${sport.maxCapacity} spots).`,
      });
      return;
    }

    // =========================================================
    // Create enrollment
    // =========================================================
    const normalizedSchedule = schedule && typeof schedule === 'object'
      ? {
          day: String(schedule.day || ''),
          startTime: String(schedule.startTime || ''),
          endTime: String(schedule.endTime || ''),
        }
      : undefined;

    const enrollment = await Enrollment.create({
      childId,
      sportId,
      parentNotes: parentNotes || '',
      schedule: normalizedSchedule,
    });

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('childId', 'firstName lastName dateOfBirth gender')
      .populate('sportId', 'name price');

    // Send enrollment created email to parent (non-blocking)
    const parent = await User.findById(parentId);
    if (parent) {
      const childName = `${child.firstName} ${child.lastName}`;
      sendEnrollmentCreatedEmail(parent.email, parent.fullName, childName, sport.name).catch((err) =>
        console.error('Failed to send enrollment created email:', err)
      );
    }

    res.status(201).json({
      success: true,
      status: 201,
      message: 'Enrollment request submitted successfully.',
      data: populatedEnrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while creating enrollment.',
    });
  }
};

/**
 * GET /api/enrollments/my-kids
 * GET /api/enrollments/child/:childId
 * Parent only: Fetch enrollment list & status for all children or a specific child
 */
export const getMyKidsEnrollments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { childId } = req.params;

    if (childId) {
      // Fetch enrollments for a specific child
      // Verify parent owns this child
      const child = await Child.findOne({
        _id: childId,
        parentId: req.user!.id,
      });

      if (!child) {
        res.status(404).json({
          success: false,
          status: 404,
          message: 'Child not found or not associated with your account.',
        });
        return;
      }

      const enrollments = await Enrollment.find({ childId })
        .populate({
          path: 'childId',
          select: 'firstName lastName dateOfBirth gender documents.photoUrl',
        })
        .populate({
          path: 'sportId',
          select: 'name price scheduleInfo',
        })
        .sort({ submittedAt: -1 });

      res.status(200).json({
        success: true,
        status: 200,
        count: enrollments.length,
        data: enrollments,
      });
      return;
    }

    // First get all children owned by this parent
    const children = await Child.find({ parentId: req.user!.id }).select('_id');
    const childIds = children.map((c) => c._id);

    // Then get enrollments for those children
    const enrollments = await Enrollment.find({
      childId: { $in: childIds },
    })
      .populate({
        path: 'childId',
        select: 'firstName lastName dateOfBirth gender documents.photoUrl',
      })
      .populate({
        path: 'sportId',
        select: 'name price scheduleInfo',
      })
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      status: 200,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching enrollments.',
    });
  }
};

/**
 * GET /api/enrollments/admin
 * Admin only: List all enrollments with optional status filter
 */
export const getAllEnrollments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status } = req.query;

    const filter: Record<string, unknown> = {};
    if (status && typeof status === 'string') {
      filter.status = status;
    }

    const enrollments = await Enrollment.find(filter)
      .populate({
        path: 'childId',
        select:
          'firstName lastName dateOfBirth gender documents.photoUrl documents.birthCertificateUrl documents.medicalCertificateUrl parentId',
        populate: {
          path: 'parentId',
          select: 'fullName email phone',
        },
      })
      .populate({
        path: 'sportId',
        select: 'name price minAge maxAge maxCapacity scheduleInfo',
      })
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      status: 200,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching all enrollments.',
    });
  }
};

/**
 * PATCH /api/enrollments/admin/:id/status
 * Admin only: Approve or Reject enrollment
 */
export const updateEnrollmentStatus = async (
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

    const enrollment = await Enrollment.findById(id);

    if (!enrollment) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Enrollment not found.',
      });
      return;
    }

    if (enrollment.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        status: 400,
        message: `Cannot update. Enrollment is already ${enrollment.status.toLowerCase()}.`,
      });
      return;
    }

    enrollment.status = status;
    await enrollment.save();

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate({
        path: 'childId',
        select: 'firstName lastName dateOfBirth gender documents.photoUrl parentId',
        populate: {
          path: 'parentId',
          select: 'fullName email phone',
        },
      })
      .populate({
        path: 'sportId',
        select: 'name price scheduleInfo',
      });

    // Send enrollment status email to parent (non-blocking)
    if (populatedEnrollment) {
      const child = populatedEnrollment.childId as any;
      const sport = populatedEnrollment.sportId as any;
      const parent = child?.parentId;

      if (parent && sport) {
        const childName = `${child.firstName} ${child.lastName}`;
        sendEnrollmentStatusEmail(
          parent.email,
          parent.fullName,
          childName,
          sport.name,
          status
        ).catch((err) =>
          console.error('Failed to send enrollment status email:', err)
        );
      }
    }

    const action = status === 'APPROVED' ? 'approved' : 'rejected';

    res.status(200).json({
      success: true,
      status: 200,
      message: `Enrollment ${action} successfully.`,
      data: populatedEnrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while updating enrollment status.',
    });
  }
};