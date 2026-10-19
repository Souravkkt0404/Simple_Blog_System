const Joi = require('joi');
const { idParam, paginationQuery, objectId } = require('./common.validator');
const { ROLES } = require('../config/roles');
const { ACTIONS } = require('../services/activity.service');

const listUsers = {
  query: Joi.object({
    ...paginationQuery,
    search: Joi.string().trim().max(100).allow(''),
    role: Joi.string().valid(...Object.values(ROLES)),
  }),
};

const updateUser = {
  params: idParam,
  body: Joi.object({
    name: Joi.string().trim().min(2).max(50),
    role: Joi.string().valid(...Object.values(ROLES)),
    isActive: Joi.boolean(),
  }).min(1),
};

const listPosts = {
  query: Joi.object({
    ...paginationQuery,
    search: Joi.string().trim().max(100).allow(''),
    status: Joi.string().valid('active', 'deleted', 'all').default('all'),
  }),
};

const listComments = {
  query: Joi.object({ ...paginationQuery, search: Joi.string().trim().max(100).allow('') }),
};

const listActivity = {
  query: Joi.object({
    ...paginationQuery,
    action: Joi.string().valid(...Object.values(ACTIONS)),
    user: objectId(),
  }),
};

const byId = { params: idParam };

module.exports = { listUsers, updateUser, listPosts, listComments, listActivity, byId };
