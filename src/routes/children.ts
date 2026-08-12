import { Router } from 'express';
import {
  createChild,
  getMyChildren,
  getChildById,
  updateChild,
  uploadChildDocuments as uploadChildDocsController,
  deleteChild,
} from '../controllers/childController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadChildDocuments as uploadMiddleware } from '../middleware/upload.js';
import { createChildValidator, updateChildValidator, childIdValidator } from '../validators/index.js';

const router = Router();

// POST /api/children - Parent only: Add a new child with optional file uploads
router.post(
  '/',
  protect,
  authorize('parent'),
  uploadMiddleware,
  createChildValidator,
  createChild
);

// GET /api/children - Parent only: Get all children belonging to the authenticated parent
router.get(
  '/',
  protect,
  authorize('parent'),
  getMyChildren
);

// GET /api/children/:id - Parent only: Get single child details (with parent ownership guard)
router.get(
  '/:id',
  protect,
  authorize('parent'),
  childIdValidator,
  getChildById
);

// PUT /api/children/:id - Parent only: Update child info (with optional file uploads)
router.put(
  '/:id',
  protect,
  authorize('parent'),
  uploadMiddleware,
  updateChildValidator,
  updateChild
);

// PATCH /api/children/:id/documents - Parent only: Upload documents for existing child
router.patch(
  '/:id/documents',
  protect,
  authorize('parent'),
  uploadMiddleware,
  uploadChildDocsController
);

// DELETE /api/children/:id - Parent only: Delete child profile
router.delete(
  '/:id',
  protect,
  authorize('parent'),
  childIdValidator,
  deleteChild
);

export default router;