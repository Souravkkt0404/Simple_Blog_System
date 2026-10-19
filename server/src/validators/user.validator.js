const Joi = require('joi');
const { password } = require('./auth.validator');

const updateProfile = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(50),
    avatar: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(500).allow(''),
  }).min(1),
};

const changePassword = {
  body: Joi.object({
    currentPassword: Joi.string().max(128).allow(''),
    newPassword: password().required(),
  }),
};

module.exports = { updateProfile, changePassword };
