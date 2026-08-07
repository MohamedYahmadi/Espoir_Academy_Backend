import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.js';
import Child from '../models/Child.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import Payment from '../models/Payment.js';
import { sendAdminUserUpdatedEmail } from '../services/emailService.js';
import { saveFile, deleteFile } from '../services/storageService.js';

/**
 * Persist a single uploaded file and return its relative storage path
 */
const persistFile = async (file: Express.Multer.File): Promise<string> =>
  saveFile(file.buffer, {
    folder: 'documents',
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
  });

/**
 * POST /api/children
 * Parent only: Add a new child with optional document uploads
 */
export const createChild = async (
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

    const { firstName, lastName, dateOfBirth, gender, medicalNotes } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const documents: {
      photoUrl?: string;
      birthCertificateUrl?: string;
      medicalCertificateUrl?: string;
    } = {};

    if (files) {
      if (files.photo) documents.photoUrl = await persistFile(files.photo[0]);
      if (files.birthCertificate) documents.birthCertificateUrl = await persistFile(files.birthCertificate[0]);
      if (files.medicalCertificate) documents.medicalCertificateUrl = await persistFile(files.medicalCertificate[0]);
    }

    const isComplete = !!(documents.photoUrl && documents.birthCertificateUrl && documents.medicalCertificateUrl);

    const parentId = req.user!.role === 'admin' && req.body.parentId
      ? req.body.parentId
      : req.user!.id;

    const child = await Child.create({
      parentId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      medicalNotes: medicalNotes || '',
      documents,
      isComplete,
    });

    res.status(201).json({
      success: true,
      status: 201,
      message: 'Child profile created successfully.',
      data: child,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while creating child profile.',
    });
  }
};

/**
 * GET /api/children
 * Parent only: Get all children belonging to the authenticated parent
 */
export const getMyChildren = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const children = await Child.find({ parentId: req.user!.id }).sort({
      createdAt: -1,
    });

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

/**
 * GET /api/children/:id
 * Parent only: Get single child details (with parent ownership guard)
 */
export const getChildById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const query = req.user!.role === 'admin'
      ? { _id: id }
      : { _id: id, parentId: req.user!.id };

    const child = await Child.findOne(query);

    if (!child) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Child not found or not associated with your account.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      status: 200,
      data: child,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching child details.',
    });
  }
};

/**
 * PUT /api/children/:id
 * Parent only: Update child info
 */
export const updateChild = async (
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
    const { firstName, lastName, dateOfBirth, gender, medicalNotes } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const query = req.user!.role === 'admin'
      ? { _id: id }
      : { _id: id, parentId: req.user!.id };

    const child = await Child.findOne(query);

    if (!child) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Child not found or not associated with your account.',
      });
      return;
    }

    // Update text fields
    if (firstName !== undefined) child.firstName = firstName;
    if (lastName !== undefined) child.lastName = lastName;
    if (dateOfBirth !== undefined) child.dateOfBirth = dateOfBirth;
    if (gender !== undefined) child.gender = gender;
    if (medicalNotes !== undefined) child.medicalNotes = medicalNotes;

    // Update documents if new files are provided
    if (files) {
      if (files.photo) {
        const old = child.documents.photoUrl;
        child.documents.photoUrl = await persistFile(files.photo[0]);
        if (old) await deleteFile(old).catch(() => {});
      }
      if (files.birthCertificate) {
        const old = child.documents.birthCertificateUrl;
        child.documents.birthCertificateUrl = await persistFile(files.birthCertificate[0]);
        if (old) await deleteFile(old).catch(() => {});
      }
      if (files.medicalCertificate) {
        const old = child.documents.medicalCertificateUrl;
        child.documents.medicalCertificateUrl = await persistFile(files.medicalCertificate[0]);
        if (old) await deleteFile(old).catch(() => {});
      }

      // Update isComplete flag
      child.isComplete = !!(
        child.documents.photoUrl &&
        child.documents.birthCertificateUrl &&
        child.documents.medicalCertificateUrl
      );
    }

    await child.save();

    // If admin updated the child, notify the parent via email (non-blocking)
    if (req.user!.role === 'admin') {
      const parent = await User.findById(child.parentId);
      if (parent) {
        sendAdminUserUpdatedEmail(parent.email, parent.fullName).catch((err) =>
          console.error('Failed to send admin child update email:', err)
        );
      }
    }

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Child updated successfully.',
      data: child,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while updating child.',
    });
  }
};

/**
 * PATCH /api/children/:id/documents
 * Parent only: Upload documents for existing child
 */
export const uploadChildDocuments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (!files || Object.keys(files).length === 0) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'No files provided. Upload at least one document.',
      });
      return;
    }

    const query = req.user!.role === 'admin'
      ? { _id: id }
      : { _id: id, parentId: req.user!.id };

    const child = await Child.findOne(query);
    if (!child) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Child not found or not associated with your account.',
      });
      return;
    }

    if (files.photo) {
      const old = child.documents.photoUrl;
      child.documents.photoUrl = await persistFile(files.photo[0]);
      if (old) await deleteFile(old).catch(() => {});
    }
    if (files.birthCertificate) {
      const old = child.documents.birthCertificateUrl;
      child.documents.birthCertificateUrl = await persistFile(files.birthCertificate[0]);
      if (old) await deleteFile(old).catch(() => {});
    }
    if (files.medicalCertificate) {
      const old = child.documents.medicalCertificateUrl;
      child.documents.medicalCertificateUrl = await persistFile(files.medicalCertificate[0]);
      if (old) await deleteFile(old).catch(() => {});
    }

    // Update isComplete flag
    child.isComplete = !!(
      child.documents.photoUrl &&
      child.documents.birthCertificateUrl &&
      child.documents.medicalCertificateUrl
    );

    await child.save();

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Documents uploaded successfully.',
      data: child,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while uploading documents.',
    });
  }
};

/**
 * DELETE /api/children/:id
 * Parent or Admin: Delete child profile and cascade enrollments and payments
 */
export const deleteChild = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const query = req.user!.role === 'admin'
      ? { _id: id }
      : { _id: id, parentId: req.user!.id };

    const child = await Child.findOneAndDelete(query);

    if (!child) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Child not found or not associated with your account.',
      });
      return;
    }

    // Cascade delete enrollments and payments
    await Promise.all([
      Enrollment.deleteMany({ childId: id }),
      Payment.deleteMany({ childId: id }),
    ]);

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Child profile deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while deleting child profile.',
    });
  }
};