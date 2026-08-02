import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import sportRoutes from './routes/sports.js';
import childRoutes from './routes/children.js';
import enrollmentRoutes from './routes/enrollments.js';
import userRoutes from './routes/users.js';
import paymentRoutes from './routes/payments.js';
import scheduleRoutes from './routes/schedules.js';
import errorHandler from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ===================== Middleware =====================

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging (development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files - serve uploaded documents
app.use(
  '/uploads',
  express.static(path.resolve(__dirname, '..', 'uploads'))
);

// ===================== Health Check =====================
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
app.use('/api/auth', authRoutes);
app.use('/api/sports', sportRoutes);
app.use('/api/children', childRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/schedules', scheduleRoutes);

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