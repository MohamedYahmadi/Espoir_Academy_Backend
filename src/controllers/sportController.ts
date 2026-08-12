import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.js';
import Sport from '../models/Sport.js';

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

    const sport = await Sport.create({
      name,
      nameArabic,
      price,
      description,
      image,
      maxCapacity,
      minAge,
      maxAge,
      scheduleInfo,
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
