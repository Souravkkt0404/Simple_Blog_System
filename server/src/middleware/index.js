const { authenticate } = require('./authenticate');
const { authorize, requirePermission } = require('./authorize');
const validate = require('./validate');
const logActivity = require('./activityLogger');
const { authLimiter, apiLimiter, createRateLimiter } = require('./rateLimiter');
const { errorHandler } = require('./errorHandler');
const notFound = require('./notFound');

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  validate,
  logActivity,
  authLimiter,
  apiLimiter,
  createRateLimiter,
  errorHandler,
  notFound,
};
