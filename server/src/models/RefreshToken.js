const mongoose = require('mongoose');

/**
 * Server-side record of every issued refresh token (identified by its JWT `jti`).
 * Enables revocation on logout and rotation with reuse detection.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jti: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: String, default: null },
    createdByIp: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

// MongoDB removes expired tokens automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
