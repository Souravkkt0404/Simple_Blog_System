const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const passport = require('passport');

const config = require('./config/env');
const { configurePassport } = require('./config/passport');
const routesV1 = require('./routes/v1');
const { apiLimiter, notFound, errorHandler } = require('./middleware');

function createApp() {
  const app = express();

  app.set('trust proxy', 1); // correct client IPs (rate limiting, activity logs) behind a proxy
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (config.env === 'development') app.use(morgan('dev'));

  configurePassport(passport);
  app.use(passport.initialize());

  app.use('/api/v1', apiLimiter, routesV1);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
