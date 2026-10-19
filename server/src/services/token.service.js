const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const RefreshToken = require('../models/RefreshToken');
const ApiError = require('../utils/ApiError');

const DAY_MS = 24 * 60 * 60 * 1000;

function generateAccessToken(user) {
  return jwt.sign({ sub: String(user._id || user.id), role: user.role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

function verifyRefreshJwt(token) {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token', { code: 'INVALID_REFRESH_TOKEN' });
  }
}

async function issueRefreshToken(userId, { ip, userAgent } = {}) {
  const jti = crypto.randomUUID();
  const days = config.jwt.refreshExpiresInDays;
  const expiresAt = new Date(Date.now() + days * DAY_MS);
  const token = jwt.sign({ sub: String(userId), jti }, config.jwt.refreshSecret, { expiresIn: `${days}d` });

  await RefreshToken.create({ user: userId, jti, expiresAt, createdByIp: ip, userAgent });
  return { token, jti, expiresAt };
}

async function revokeAllForUser(userId) {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
}

/**
 * Refresh token rotation: each refresh token can be used exactly once.
 * Presenting an already-used token signals theft, so every session of
 * that user is revoked.
 */
async function rotateRefreshToken(token, meta = {}) {
  const payload = verifyRefreshJwt(token);

  // Atomic claim: only one concurrent request can revoke (and therefore use) this token.
  const claimed = await RefreshToken.findOneAndUpdate(
    { jti: payload.jti, revokedAt: null, expiresAt: { $gt: new Date() } },
    { revokedAt: new Date() },
    { new: true },
  );

  if (!claimed) {
    const existing = await RefreshToken.findOne({ jti: payload.jti });
    if (existing?.revokedAt) {
      await revokeAllForUser(existing.user);
      throw ApiError.unauthorized('Refresh token reuse detected. Please log in again.', {
        code: 'REFRESH_TOKEN_REUSED',
      });
    }
    throw ApiError.unauthorized('Invalid or expired refresh token', { code: 'INVALID_REFRESH_TOKEN' });
  }

  const next = await issueRefreshToken(claimed.user, meta);
  claimed.replacedBy = next.jti;
  await claimed.save();

  return { userId: claimed.user, ...next };
}

/**
 * Revokes a single refresh token. Never throws for bad tokens: logout must always succeed.
 * Returns the owning user id when known.
 */
async function revokeRefreshToken(token) {
  if (!token) return null;
  const payload = jwt.decode(token);
  if (!payload?.jti) return null;
  const doc = await RefreshToken.findOneAndUpdate(
    { jti: payload.jti, revokedAt: null },
    { revokedAt: new Date() },
    { new: true },
  );
  return doc ? doc.user : null;
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
};
