const { Server } = require('socket.io');
const config = require('../config/env');
const tokenService = require('../services/token.service');
const notificationService = require('../services/notification.service');
const { ROLES } = require('../config/roles');

/**
 * Real-time notifications.
 *  - Anonymous sockets receive public broadcasts (e.g. "post:created").
 *  - Authenticated sockets (access token in `handshake.auth.token`) join
 *    their personal room; admins also join the admin room.
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientUrl, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      const payload = tokenService.verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.data.userId) {
      socket.join(notificationService.userRoom(socket.data.userId));
      if (socket.data.role === ROLES.ADMIN) socket.join(notificationService.ADMIN_ROOM);
    }
  });

  notificationService.attach(io);
  return io;
}

module.exports = { initSocket };
