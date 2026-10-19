const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * Factory so limits are configurable (and testable) without touching routes.
 * Limit breaches go through the central error handler for a consistent response.
 */
function createRateLimiter({ windowMs, max, message = 'Too many requests, please try again later' }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new ApiError(429, message, { code: 'TOO_MANY_REQUESTS' })),
  });
}

const authLimiter = createRateLimiter({
  ...config.rateLimit.auth,
  message: 'Too many authentication attempts, please try again later',
});

const apiLimiter = createRateLimiter(config.rateLimit.api);

module.exports = { createRateLimiter, authLimiter, apiLimiter };
