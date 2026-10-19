const { hasPermission } = require('../config/roles');
const ApiError = require('./ApiError');

const isOwner = (actor, ownerId) => Boolean(actor && ownerId && String(ownerId) === String(actor.id));

/**
 * Resource-level authorization: the actor may act if they own the resource
 * (and hold the "own" permission) or hold the "any" permission (admins).
 */
function canManage(actor, ownerId, { own, any }) {
  if (!actor) return false;
  if (any && hasPermission(actor.role, any)) return true;
  return isOwner(actor, ownerId) && (!own || hasPermission(actor.role, own));
}

function assertCanManage(actor, ownerId, permissions, message) {
  if (!canManage(actor, ownerId, permissions)) {
    throw ApiError.forbidden(message);
  }
}

module.exports = { isOwner, canManage, assertCanManage };
