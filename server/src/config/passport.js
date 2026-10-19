const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: FacebookStrategy } = require('passport-facebook');
const config = require('./env');
const authService = require('../services/auth.service');
const logger = require('../utils/logger');

const verifyWith = (provider) => async (_accessToken, _refreshToken, profile, done) => {
  try {
    const user = await authService.findOrCreateOAuthUser(provider, profile);
    done(null, user);
  } catch (err) {
    done(err);
  }
};

/**
 * Registers OAuth 2.0 strategies. A provider is only enabled when its
 * credentials are present in the environment, so the app runs without them.
 */
function configurePassport(passport) {
  const { google, facebook } = config.oauth;

  if (google.enabled) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: google.clientID,
          clientSecret: google.clientSecret,
          callbackURL: `${config.serverUrl}/api/v1/auth/google/callback`,
        },
        verifyWith('google'),
      ),
    );
  }

  if (facebook.enabled) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: facebook.clientID,
          clientSecret: facebook.clientSecret,
          callbackURL: `${config.serverUrl}/api/v1/auth/facebook/callback`,
          profileFields: ['id', 'displayName', 'emails', 'photos'],
        },
        verifyWith('facebook'),
      ),
    );
  }

  if (!config.isTest) {
    logger.info(`OAuth providers: google=${google.enabled} facebook=${facebook.enabled}`);
  }
}

module.exports = { configurePassport };
