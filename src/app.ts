import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import hpp from 'hpp';
import sanitizeRequest from './middleware/sanitize.js';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import sportRoutes from './routes/sports.js';
import childRoutes from './routes/children.js';
import enrollmentRoutes from './routes/enrollments.js';
import userRoutes from './routes/users.js';
import paymentRoutes from './routes/payments.js';
import scheduleRoutes from './routes/schedules.js';
import notificationRoutes from './routes/notifications.js';
import contactRoutes from './routes/contact.js';
import errorHandler from './middleware/errorHandler.js';
import { getFileStream, isS3Storage } from './services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const n = parseInt(value || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// ===================== Base hardening =====================

// Trust the first reverse proxy hop (Nginx/CDN) so client IPs are
// accurate for rate limiting and secure cookies.
app.set('trust proxy', 1);

// Hide framework fingerprinting header
app.disable('x-powered-by');

// Security headers. crossOriginResourcePolicy is 'cross-origin' so the
// frontend origin can still load uploaded images served under /uploads.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ===================== CORS =====================
// In production only an explicit allow-list (CORS_ORIGINS) is accepted;
// requests from any other origin are blocked (fail-closed).
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (isProduction && allowedOrigins.length === 0) {
  console.warn(
    '⚠️ Production mode: CORS_ORIGINS is not set — all cross-origin requests will be blocked.'
  );
}

app.use(
  cors({
    origin: isProduction ? allowedOrigins : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ===================== Body parsing (with size limits) =====================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ===================== Input sanitization =====================
// Strip NoSQL operator keys ($, .) and prevent HTTP parameter pollution
app.use(sanitizeRequest);
app.use(hpp());

// ===================== HTTP request logging (development) =====================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ===================== Static files - serve uploaded documents =====================
if (isS3Storage()) {
  // Stream uploaded files from object storage
  app.use('/uploads', async (req, res) => {
    const relativePath = `uploads${req.path}`;
    const file = await getFileStream(relativePath);
    if (!file) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'File not found.',
      });
      return;
    }
    if (file.contentType) res.setHeader('Content-Type', file.contentType);
    file.stream.pipe(res);
  });
} else {
  app.use(
    '/uploads',
    express.static(path.resolve(__dirname, '..', 'uploads'))
  );
}

// ===================== Rate limiting =====================
const windowMs = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const globalMax = parsePositiveInt(process.env.RATE_LIMIT_MAX, 300);
const authMax = parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 15);

const rateLimitError = (message: string) => (_req: express.Request, res: express.Response): void => {
  res.status(429).json({
    success: false,
    status: 429,
    message,
  });
};

// Global limit for all API traffic
const globalLimiter = rateLimit({
  windowMs,
  limit: globalMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  handler: rateLimitError('Too many requests. Please try again later.'),
});

// Stricter limit for authentication endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs,
  limit: authMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitError('Too many attempts. Please try again later.'),
});

// ===================== Health Check (unlimited) =====================
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 200,
    message: 'Espoir Academy API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ===================== Routes =====================
app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/sports', sportRoutes);
app.use('/api/children', childRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/contact', contactRoutes);

// ===================== 404 Handler =====================
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: 'Route not found.',
  });
});

// ===================== Global Error Handler =====================
app.use(errorHandler);

export default app;
