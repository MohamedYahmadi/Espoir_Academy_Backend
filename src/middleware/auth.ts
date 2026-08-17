import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'admin' | 'parent';
  };
}

interface JwtPayload {
  id: string;
  role: 'admin' | 'parent';
}

/**
 * Verify JWT token from Authorization header
 */
export const protect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  let token: string | undefined;

  // Check Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({
      success: false,
      status: 401,
      message: 'Not authorized. No token provided.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      status: 401,
      message: 'Not authorized. Invalid token.',
    });
  }
};

/**
 * Optional authentication: populates req.user if a valid token is present,
 * but does not block the request when the token is missing or invalid.
 */
export const protectOptional = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  let token: string | undefined;

  // Check Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
  } catch (error) {
    // Ignore invalid tokens for optional auth
  }
  next();
};

/**
 * Authorize by role(s)
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        status: 403,
        message: `Forbidden. Role '${req.user?.role}' is not authorized to access this resource.`,
      });
      return;
    }
    next();
  };
};