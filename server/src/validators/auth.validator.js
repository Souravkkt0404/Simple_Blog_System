const Joi = require('joi');

// At least 8 chars with an uppercase letter, a lowercase letter and a digit.
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

const password = () =>
  Joi.string()
    .pattern(PASSWORD_PATTERN)
    .message('password must be 8-128 characters and include upper-case, lower-case and a number');

const email = () => Joi.string().trim().lowercase().email().max(254);

const register = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: email().required(),
    password: password().required(),
  }),
};

const login = {
  body: Joi.object({
    email: email().required(),
    password: Joi.string().max(128).required(),
  }),
};

module.exports = { register, login, password, PASSWORD_PATTERN };
