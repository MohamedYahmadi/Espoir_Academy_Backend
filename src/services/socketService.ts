import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { Server as HttpServer } from 'http';

interface SocketUser {
  id: string;
  role: 'admin' | 'parent';
}

let io: SocketServer | null = null;

/**
 * Initialize the Socket.IO server attached to the HTTP server.
 * Authenticates each connection via the JWT passed in the auth token.
 */
export const initSocket = (httpServer: HttpServer): SocketServer => {
  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  io = new SocketServer(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === 'production'
          ? allowedOrigins
          : '*',
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        next(new Error('No token provided'));
        return;
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as SocketUser;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;
    if (!user) return;

    // Join a personal room so we can target notifications to this user
    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);

    socket.on('disconnect', () => {
      socket.leave(`user:${user.id}`);
      socket.leave(`role:${user.role}`);
    });
  });

  return io;
};

export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized.');
  }
  return io;
};

export const isSocketInitialized = (): boolean => io !== null;
