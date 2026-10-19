/**
 * Every successful response has the shape:
 *   { success: true, message?, data, meta? }
 * Errors (see middleware/errorHandler.js) have the shape:
 *   { success: false, error: { code, message, details? } }
 */
function sendSuccess(res, { statusCode = 200, message, data = null, meta } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  body.data = data;
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

const ok = (res, data, meta, message) => sendSuccess(res, { data, meta, message });
const created = (res, data, message) => sendSuccess(res, { statusCode: 201, data, message });
const noContent = (res) => res.status(204).end();

module.exports = { sendSuccess, ok, created, noContent };
