const activityService = require('../services/activity.service');
const logger = require('../utils/logger');

/**
 * Records a user activity once the response has been sent successfully.
 * Writing happens after the response, so logging never slows down or breaks a request.
 *
 * Controllers can enrich the entry through `res.locals`:
 *   res.locals.activityUserId – for routes without req.user (login, register, logout)
 *   res.locals.activityMeta   – extra details (e.g. post id/title)
 */
const logActivity = (action) => (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) return;

    const userId = req.user?.id || res.locals.activityUserId || null;
    activityService
      .record({
        user: userId,
        action,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        metadata: res.locals.activityMeta || {},
      })
      .catch((err) => logger.error(`Failed to record activity ${action}:`, err.message));
  });
  next();
};

module.exports = logActivity;
