import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.js';
import Sport from '../models/Sport.js';
import { notifyAllParents } from '../services/notificationService.js';
import { saveFile, deleteFile } from '../services/storageService.js';

/**
 * GET /api/sports
 * Public/Parent: Fetch all sports and pricing details
 */
export const getAllSports = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const sports = await Sport.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      status: 200,
      count: sports.length,
      data: sports,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while fetching sports.',
    });
  }
};

/**
 * POST /api/sports
 * Admin only: Create a new sport
 */
export const createSport = async (
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

    const { name, nameArabic, price, description, image, maxCapacity, minAge, maxAge, scheduleInfo } = req.body;

    let sportImage = image;
    if (req.file) {
      sportImage = await saveFile(req.file.buffer, {
        folder: 'sports',
        fieldname: 'image',
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
    }

    const sport = await Sport.create({
      name,
      nameArabic,
      price,
      description,
      image: sportImage,
      maxCapacity,
      minAge,
      maxAge,
      scheduleInfo,
    });

    // Notify all active parents about the new sport
    await notifyAllParents({
      type: 'SPORT_CREATED',
      title: 'Nouveau sport disponible',
      message: `Le sport ${name} est maintenant disponible à l'inscription.`,
      sportId: sport._id,
    });

    res.status(201).json({
      success: true,
      status: 201,
      message: 'Sport created successfully.',
      data: sport,
    });
  } catch (error: any) {
    // Handle duplicate sport name
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        status: 400,
        message: `Sport '${req.body.name}' already exists.`,
      });
      return;
    }
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while creating sport.',
    });
  }
};

/**
 * PUT /api/sports/:id
 * Admin only: Update sport pricing, capacity, or age parameters
 */
export const updateSport = async (
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

    const existingSport = await Sport.findById(id);
    if (!existingSport) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Sport not found.',
      });
      return;
    }

    if (req.file) {
      const sportImage = await saveFile(req.file.buffer, {
        folder: 'sports',
        fieldname: 'image',
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      updateData.image = sportImage;

      if (existingSport.image) {
        await deleteFile(existingSport.image).catch(() => {});
      }
    }

    const sport = await Sport.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!sport) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Sport not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Sport updated successfully.',
      data: sport,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        status: 400,
        message: `Sport name '${req.body.name}' already exists.`,
      });
      return;
    }
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while updating sport.',
    });
  }
};

/**
 * DELETE /api/sports/:id
 * Admin only: Remove a sport
 */
export const deleteSport = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const sport = await Sport.findByIdAndDelete(id);

    if (!sport) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Sport not found.',
      });
      return;
    }

    // Remove the sport image from storage (best-effort)
    if (sport.image) {
      await deleteFile(sport.image).catch(() => {});
    }

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Sport deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 500,
      message: 'Server error while deleting sport.',
    });
  }
};
