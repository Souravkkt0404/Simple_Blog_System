const ApiError = require('../utils/ApiError');
const { hasPermission } = require('../config/roles');

/**
 * Role check: `authorize('admin')`. Must run after `authenticate`.
 */
const authorize =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient role for this resource'));
    }
    return next();
  };

/**
 * Permission check: `requirePermission(PERMISSIONS.POST_CREATE)`.
 * Passes when the user's role holds ALL listed permissions.
 */
const requirePermission =
  (...permissions) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    const missing = permissions.filter((p) => !hasPermission(req.user.role, p));
    if (missing.length) {
      return next(ApiError.forbidden('Missing required permission', { details: { missing } }));
    }
    return next();
  };

module.exports = { authorize, requirePermission };
