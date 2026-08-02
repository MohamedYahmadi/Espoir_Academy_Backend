import { Router } from 'express';
import {
  getAllSports,
  createSport,
  updateSport,
  deleteSport,
} from '../controllers/sportController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  createSportValidator,
  updateSportValidator,
  sportIdValidator,
} from '../validators/index.js';

const router = Router();

// GET /api/sports - Public/Parent: Fetch all sports
router.get('/', getAllSports);

// POST /api/sports - Admin only: Create a new sport
router.post(
  '/',
  protect,
  authorize('admin'),
  createSportValidator,
  createSport
);

// PUT /api/sports/:id - Admin only: Update sport
router.put(
  '/:id',
  protect,
  authorize('admin'),
  updateSportValidator,
  updateSport
);

// DELETE /api/sports/:id - Admin only: Remove a sport
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  sportIdValidator,
  deleteSport
);

export default router;