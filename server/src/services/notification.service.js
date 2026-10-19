/**
 * Thin wrapper around Socket.io so business logic can emit real-time events
 * without knowing about sockets. When no server is attached (tests, scripts)
 * every call is a no-op.
 */
let io = null;

const userRoom = (userId) => `user:${userId}`;
const ADMIN_ROOM = 'admins';

function attach(socketServer) {
  io = socketServer;
}

function detach() {
  io = null;
}

const withTimestamp = (payload) => ({ ...payload, createdAt: new Date().toISOString() });

function notifyUser(userId, payload) {
  if (!io || !userId) return;
  io.to(userRoom(String(userId))).emit('notification', withTimestamp(payload));
}

function notifyAdmins(payload) {
  if (!io) return;
  io.to(ADMIN_ROOM).emit('notification', withTimestamp(payload));
}

function broadcast(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = { attach, detach, notifyUser, notifyAdmins, broadcast, userRoom, ADMIN_ROOM };
