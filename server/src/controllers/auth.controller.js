const config = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, noContent } = require('../utils/apiResponse');
const authService = require('../services/auth.service');

const REFRESH_COOKIE_PATH = '/api/v1/auth';

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

// Refresh token lives in an httpOnly cookie scoped to the auth routes: unreadable by JS (XSS-safe).
function setRefreshCookie(res, token, expiresAt) {
  res.cookie(config.refreshCookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(config.refreshCookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  });
}

function sendSession(res, session, { statusCode = 200, message } = {}) {
  setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
  res.locals.activityUserId = session.user._id;
  const data = { user: session.user, accessToken: session.accessToken };
  return statusCode === 201 ? created(res, data, message) : ok(res, data, undefined, message);
}

const register = asyncHandler(async (req, res) => {
  const session = await authService.register(req.body, requestMeta(req));
  sendSession(res, session, { statusCode: 201, message: 'Account created' });
});

const login = asyncHandler(async (req, res) => {
  const session = await authService.login(req.body, requestMeta(req));
  sendSession(res, session, { message: 'Logged in' });
});

const refresh = asyncHandler(async (req, res) => {
  try {
    const session = await authService.refresh(req.cookies?.[config.refreshCookieName], requestMeta(req));
    sendSession(res, session);
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
});

const logout = asyncHandler(async (req, res) => {
  const userId = await authService.logout(req.cookies?.[config.refreshCookieName]);
  res.locals.activityUserId = userId;
  clearRefreshCookie(res);
  noContent(res);
});

/**
 * OAuth success: passport has put the user on req.user. We start a session
 * (refresh cookie only — no tokens in URLs) and send the browser back to the
 * SPA, which then calls POST /auth/refresh to obtain an access token.
 */
const oauthCallback = asyncHandler(async (req, res) => {
  const session = await authService.createSession(req.user, requestMeta(req));
  setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
  res.locals.activityMeta = { provider: req.user.provider };
  res.redirect(`${config.clientUrl}/oauth/callback`);
});

const providers = (_req, res) =>
  ok(res, {
    google: config.oauth.google.enabled,
    facebook: config.oauth.facebook.enabled,
  });

module.exports = { register, login, refresh, logout, oauthCallback, providers, REFRESH_COOKIE_PATH };
