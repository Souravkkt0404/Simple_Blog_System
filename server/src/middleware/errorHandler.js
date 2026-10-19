const mongoose = require('mongoose');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Translates known library errors into ApiErrors so every failure
 * reaches the client in the same shape.
 */
function normalizeError(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return new ApiError(422, 'Validation failed', { code: 'VALIDATION_ERROR', details });
  }
  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${err.path}`, { code: 'INVALID_ID' });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiError.conflict(`Duplicate value for ${field}`, { code: 'DUPLICATE_KEY', details: { field } });
  }
  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Invalid or expired token', { code: 'INVALID_TOKEN' });
  }
  if (err?.type === 'entity.parse.failed') {
    return ApiError.badRequest('Malformed JSON body', { code: 'INVALID_JSON' });
  }

  const status = err?.statusCode || err?.status || 500;
  if (status < 500) {
    // Client errors raised by Express/body-parser (e.g. 413 payload too large).
    return new ApiError(status, err.expose ? err.message : 'Bad request');
  }

  const wrapped = new ApiError(status, 'Internal server error');
  wrapped.isOperational = false;
  wrapped.stack = err?.stack;
  return wrapped;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const apiError = normalizeError(err);

  if (!apiError.isOperational || apiError.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl}`, err);
  }

  const body = {
    success: false,
    error: { code: apiError.code, message: apiError.message },
  };
  if (apiError.details) body.error.details = apiError.details;
  if (!config.isProduction && !apiError.isOperational) body.error.stack = apiError.stack;

  res.status(apiError.statusCode).json(body);
}

module.exports = { errorHandler, normalizeError };
