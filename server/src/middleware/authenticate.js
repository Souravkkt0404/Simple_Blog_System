const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const tokenService = require('../services/token.service');

function extractBearerToken(req) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/**
 * Validates the JWT access token and attaches `req.user = { id, role, name, email }`.
 * The user is re-loaded so role changes and deactivation take effect immediately.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required');

  let payload;
  try {
    payload = tokenService.verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired', { code: 'TOKEN_EXPIRED' });
    }
    throw ApiError.unauthorized('Invalid access token', { code: 'INVALID_TOKEN' });
  }

  const user = await User.findById(payload.sub).select('name email role isActive').lean();
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User no longer has access', { code: 'INVALID_TOKEN' });
  }

  req.user = { id: String(user._id), role: user.role, name: user.name, email: user.email };
  next();
});

module.exports = { authenticate, extractBearerToken };
