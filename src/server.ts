import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { seedAll } from './seeders/seedData.js';
import { initSocket } from './services/socketService.js';

const PORT = process.env.PORT || 5000;

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Seed default admin account
    await seedAll();

    // Create HTTP server and attach Socket.IO for real-time notifications
    const httpServer = createServer(app);
    initSocket(httpServer);

    // Start server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`📍 http://localhost:${PORT}/api/health`);
      console.log(`🔌 WebSocket ready on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
