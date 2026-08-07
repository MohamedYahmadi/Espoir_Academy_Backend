import { Request, Response, NextFunction } from 'express';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (isPlainObject(value)) {
    const cleaned: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      cleaned[key] = sanitizeValue(value[key]);
    }
    return cleaned;
  }
  return value;
};

/**
 * Remove NoSQL operator keys ($, .) from request data (body, query, params).
 * Express 5 exposes req.query/req.params as read-only getters, so instead of
 * reassigning them we sanitize the values and copy them back in place.
 */
const sanitizeRequest = (req: Request, _res: Response, next: NextFunction): void => {
  if (isPlainObject(req.body)) {
    req.body = sanitizeValue(req.body) as Record<string, unknown>;
  }

  for (const part of [req.query, req.params]) {
    if (!isPlainObject(part)) continue;
    const cleaned = sanitizeValue(part) as Record<string, unknown>;
    for (const key of Object.keys(part)) delete part[key];
    Object.assign(part, cleaned);
  }

  next();
};

export default sanitizeRequest;
