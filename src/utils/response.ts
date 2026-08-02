import { Response } from 'express';

/**
 * Send a success response
 */
export const sendSuccess = (
  res: Response,
  data: unknown,
  message?: string,
  statusCode = 200
): void => {
  const response: Record<string, unknown> = {
    success: true,
    status: statusCode,
    data,
  };

  if (message) {
    response.message = message;
  }

  res.status(statusCode).json(response);
};

/**
 * Send a success response with count (for lists)
 */
export const sendSuccessWithCount = (
  res: Response,
  data: unknown[],
  message?: string,
  statusCode = 200
): void => {
  const response: Record<string, unknown> = {
    success: true,
    status: statusCode,
    count: data.length,
    data,
  };

  if (message) {
    response.message = message;
  }

  res.status(statusCode).json(response);
};

/**
 * Send an error response
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode = 500
): void => {
  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
  });
};