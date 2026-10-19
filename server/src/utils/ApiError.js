const DEFAULT_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

/**
 * Operational error that is safe to expose to API clients.
 */
class ApiError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || DEFAULT_CODES[statusCode] || 'ERROR';
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(message = 'Bad request', opts) {
    return new ApiError(400, message, opts);
  }

  static unauthorized(message = 'Authentication required', opts) {
    return new ApiError(401, message, opts);
  }

  static forbidden(message = 'You do not have permission to perform this action', opts) {
    return new ApiError(403, message, opts);
  }

  static notFound(message = 'Resource not found', opts) {
    return new ApiError(404, message, opts);
  }

  static conflict(message = 'Resource already exists', opts) {
    return new ApiError(409, message, opts);
  }
}

module.exports = ApiError;
