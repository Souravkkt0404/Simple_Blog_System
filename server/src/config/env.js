const path = require('path');
const Joi = require('joi');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const optionalString = Joi.string().allow('').optional();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(5000),
  SERVER_URL: Joi.string().uri().default('http://localhost:5000'),
  CLIENT_URL: Joi.string().uri().default('http://localhost:5173'),

  MONGODB_URI: Joi.string().when('NODE_ENV', {
    is: 'test',
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required().invalid(Joi.ref('JWT_ACCESS_SECRET')),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN_DAYS: Joi.number().integer().min(1).default(7),

  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(4).max(15).default(12),
  AUTH_RATE_LIMIT_WINDOW_MS: Joi.number().integer().default(15 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: Joi.number().integer().default(10),
  API_RATE_LIMIT_WINDOW_MS: Joi.number().integer().default(15 * 60 * 1000),
  API_RATE_LIMIT_MAX: Joi.number().integer().default(500),

  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  FACEBOOK_APP_ID: optionalString,
  FACEBOOK_APP_SECRET: optionalString,
}).unknown();

const { value: env, error } = schema.validate(process.env, { abortEarly: false });

if (error) {
  // Fail fast: the app must never boot with missing or weak secrets.
  throw new Error(`Invalid environment configuration:\n - ${error.details.map((d) => d.message).join('\n - ')}`);
}

const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  serverUrl: env.SERVER_URL,
  clientUrl: env.CLIENT_URL,
  mongoUri: env.MONGODB_URI,
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresInDays: env.JWT_REFRESH_EXPIRES_IN_DAYS,
  },
  bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
  rateLimit: {
    auth: { windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX },
    api: { windowMs: env.API_RATE_LIMIT_WINDOW_MS, max: env.API_RATE_LIMIT_MAX },
  },
  oauth: {
    google: {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      enabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    },
    facebook: {
      clientID: env.FACEBOOK_APP_ID,
      clientSecret: env.FACEBOOK_APP_SECRET,
      enabled: Boolean(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET),
    },
  },
  refreshCookieName: 'refreshToken',
});

module.exports = config;
