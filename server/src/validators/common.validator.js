const Joi = require('joi');

const objectId = () =>
  Joi.string()
    .trim()
    .pattern(/^[a-f\d]{24}$/i)
    .message('{{#label}} must be a valid id');

const idParam = Joi.object({ id: objectId().required() });

const paginationQuery = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
};

module.exports = { objectId, idParam, paginationQuery };
