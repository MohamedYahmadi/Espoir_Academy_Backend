import { Router } from 'express';
import {
  createChild,
  getMyChildren,
  getChildById,
  updateChild,
  uploadChildDocuments as uploadChildDocsController,
} from '../controllers/childController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadChildDocuments as uploadMiddleware } from '../middleware/upload.js';
import { createChildValidator, updateChildValidator, childIdValidator } from '../validators/index.js';

const router = Router();

// POST /api/children - Parent or Admin: Add a new child with optional file uploads
router.post(
  '/',
  protect,
  authorize('parent', 'admin'),
  uploadMiddleware,
  createChildValidator,
  createChild
);

// GET /api/children - Parent or Admin: Get all children
router.get(
  '/',
  protect,
  authorize('parent', 'admin'),
  getMyChildren
);

// GET /api/children/:id - Parent or Admin: Get single child
router.get(
  '/:id',
  protect,
  authorize('parent', 'admin'),
  childIdValidator,
  getChildById
);

// PUT /api/children/:id - Parent or Admin: Update child info (with optional file uploads)
router.put(
  '/:id',
  protect,
  authorize('parent', 'admin'),
  uploadMiddleware,
  updateChildValidator,
  updateChild
);

// PATCH /api/children/:id/documents - Parent or Admin: Upload documents for existing child
router.patch(
  '/:id/documents',
  protect,
  authorize('parent', 'admin'),
  uploadMiddleware,
  uploadChildDocsController
);

export default router;