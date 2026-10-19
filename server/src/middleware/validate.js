const ApiError = require('../utils/ApiError');

const SOURCES = ['params', 'query', 'body'];

/**
 * Validates request parts against Joi schemas and replaces them with the
 * sanitised values (unknown keys stripped, defaults applied, types coerced).
 *
 *   validate({ body: createPostSchema, params: idParamSchema })
 */
const validate = (schemas) => (req, _res, next) => {
  const details = [];

  SOURCES.forEach((source) => {
    if (!schemas[source]) return;
    const { value, error } = schemas[source].validate(req[source] ?? {}, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      error.details.forEach((d) =>
        details.push({ location: source, field: d.path.join('.'), message: d.message.replace(/"/g, '') }),
      );
    } else {
      // req.query is a getter in some setups; defineProperty works everywhere.
      Object.defineProperty(req, source, { value, writable: true, enumerable: true, configurable: true });
    }
  });

  if (details.length) {
    return next(new ApiError(422, 'Validation failed', { code: 'VALIDATION_ERROR', details }));
  }
  return next();
};

module.exports = validate;
