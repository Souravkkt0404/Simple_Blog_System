const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const tokenService = require('./token.service');
const notificationService = require('./notification.service');

const OAUTH_ID_FIELD = { google: 'googleId', facebook: 'facebookId' };

async function createSession(user, meta) {
  const accessToken = tokenService.generateAccessToken(user);
  const refresh = await tokenService.issueRefreshToken(user._id, meta);
  return { user, accessToken, refreshToken: refresh.token, refreshTokenExpiresAt: refresh.expiresAt };
}

async function register({ name, email, password }, meta) {
  if (await User.exists({ email: email.toLowerCase() })) {
    throw ApiError.conflict('An account with this email already exists', { code: 'EMAIL_TAKEN' });
  }
  const user = await User.create({ name, email, password, provider: 'local', lastLoginAt: new Date() });
  notificationService.notifyAdmins({ type: 'user:registered', message: `New user registered: ${user.name}` });
  return createSession(user, meta);
}

async function login({ email, password }, meta) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  // Same message for unknown email and wrong password to avoid account enumeration.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password', { code: 'INVALID_CREDENTIALS' });
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated', { code: 'ACCOUNT_DISABLED' });
  }

  user.lastLoginAt = new Date();
  await user.save();
  return createSession(user, meta);
}

async function refresh(refreshToken, meta) {
  if (!refreshToken) throw ApiError.unauthorized('Refresh token missing', { code: 'INVALID_REFRESH_TOKEN' });

  const rotated = await tokenService.rotateRefreshToken(refreshToken, meta);
  const user = await User.findById(rotated.userId);
  if (!user || !user.isActive) {
    await tokenService.revokeAllForUser(rotated.userId);
    throw ApiError.unauthorized('Account is not available', { code: 'ACCOUNT_DISABLED' });
  }

  return {
    user,
    accessToken: tokenService.generateAccessToken(user),
    refreshToken: rotated.token,
    refreshTokenExpiresAt: rotated.expiresAt,
  };
}

function logout(refreshToken) {
  return tokenService.revokeRefreshToken(refreshToken);
}

/**
 * Finds the user for an OAuth profile, links the provider to an existing
 * account with the same verified email, or creates a new account.
 */
async function findOrCreateOAuthUser(provider, profile) {
  const idField = OAUTH_ID_FIELD[provider];
  if (!idField) throw ApiError.badRequest(`Unsupported provider: ${provider}`);

  const email = profile.emails?.[0]?.value?.toLowerCase();
  const avatar = profile.photos?.[0]?.value;

  let user = await User.findOne({ [idField]: profile.id });

  if (!user && email) {
    user = await User.findOne({ email });
    if (user) {
      user[idField] = profile.id;
      if (!user.avatar && avatar) user.avatar = avatar;
    }
  }

  if (!user) {
    if (!email) {
      throw ApiError.badRequest(`Your ${provider} account did not share an email address`, { code: 'OAUTH_EMAIL_REQUIRED' });
    }
    user = new User({
      name: profile.displayName || email.split('@')[0],
      email,
      provider,
      [idField]: profile.id,
      avatar,
    });
    notificationService.notifyAdmins({ type: 'user:registered', message: `New user registered via ${provider}: ${user.name}` });
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated', { code: 'ACCOUNT_DISABLED' });
  }

  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

module.exports = { register, login, refresh, logout, createSession, findOrCreateOAuthUser };
