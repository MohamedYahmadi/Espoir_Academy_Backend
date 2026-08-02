import { Response, Request } from 'express';
import { validationResult } from 'express-validator';

/**
 * Check for validation errors and send response if any exist
 * Returns true if there are validation errors (response already sent)
 */
export const handleValidationErrors = (
  req: Request,
  res: Response
): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      status: 400,
      message: errors.array().map((e) => e.msg).join(', '),
    });
    return true;
  }
  return false;
};