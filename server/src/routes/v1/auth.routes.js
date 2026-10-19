const express = require('express');
const passport = require('passport');
const config = require('../../config/env');
const controller = require('../../controllers/auth.controller');
const { validate, authLimiter, logActivity } = require('../../middleware');
const schemas = require('../../validators/auth.validator');
const { ACTIONS } = require('../../services/activity.service');

const router = express.Router();

router.get('/providers', controller.providers);

router.post('/register', authLimiter, validate(schemas.register), logActivity(ACTIONS.REGISTER), controller.register);
router.post('/login', authLimiter, validate(schemas.login), logActivity(ACTIONS.LOGIN), controller.login);
router.post('/refresh', authLimiter, controller.refresh);
router.post('/logout', logActivity(ACTIONS.LOGOUT), controller.logout);

// ---- OAuth 2.0 (Google / Facebook via Passport) ----
const OAUTH_SCOPES = { google: ['profile', 'email'], facebook: ['email'] };
const loginErrorUrl = (reason) => `${config.clientUrl}/login?error=${reason}`;

const ensureProviderEnabled = (provider) => (_req, res, next) =>
  config.oauth[provider].enabled ? next() : res.redirect(loginErrorUrl('provider_not_configured'));

// Passport errors (e.g. deactivated account, no email shared) go back to the SPA instead of a JSON page.
const oauthCallbackGuard = (provider) => (req, res, next) =>
  passport.authenticate(provider, { session: false }, (err, user) => {
    if (err || !user) return res.redirect(loginErrorUrl(err?.code?.toLowerCase() || 'oauth_failed'));
    req.user = user;
    return next();
  })(req, res, next);

Object.keys(OAUTH_SCOPES).forEach((provider) => {
  router.get(
    `/${provider}`,
    authLimiter,
    ensureProviderEnabled(provider),
    passport.authenticate(provider, { scope: OAUTH_SCOPES[provider], session: false }),
  );
  router.get(
    `/${provider}/callback`,
    ensureProviderEnabled(provider),
    oauthCallbackGuard(provider),
    logActivity(ACTIONS.LOGIN_OAUTH),
    controller.oauthCallback,
  );
});

module.exports = router;
