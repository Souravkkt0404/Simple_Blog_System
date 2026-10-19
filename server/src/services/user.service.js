const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const escapeRegex = require('../utils/escapeRegex');
const tokenService = require('./token.service');

async function getUserOrThrow(id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('User not found');
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

const getProfile = (id) => getUserOrThrow(id);

async function updateProfile(id, { name, avatar }) {
  const user = await getUserOrThrow(id);
  if (name !== undefined) user.name = name;
  if (avatar !== undefined) user.avatar = avatar || undefined;
  await user.save();
  return user;
}

async function changePassword(id, { currentPassword, newPassword }) {
  const user = await User.findById(id).select('+password');
  if (!user) throw ApiError.notFound('User not found');
  if (user.password && !(await user.comparePassword(currentPassword || ''))) {
    throw ApiError.badRequest('Current password is incorrect', { code: 'INVALID_PASSWORD' });
  }
  user.password = newPassword;
  await user.save();
  // Changing the password ends all other sessions.
  await tokenService.revokeAllForUser(user._id);
}

// ---- Admin-only operations ----

function listUsers({ page, limit, search, role } = {}) {
  const filter = {};
  if (role) filter.role = role;
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ name: rx }, { email: rx }];
  }
  return paginate(User, filter, { page, limit, select: '-googleId -facebookId -__v' });
}

async function updateUserByAdmin(id, { role, isActive, name }, actor) {
  const user = await getUserOrThrow(id);
  const isSelf = String(user._id) === actor.id;

  if (isSelf && (role === 'user' || isActive === false)) {
    throw ApiError.badRequest('You cannot demote or deactivate your own account', { code: 'SELF_MODIFICATION' });
  }

  if (role !== undefined) user.role = role;
  if (name !== undefined) user.name = name;
  if (isActive !== undefined) user.isActive = isActive;
  await user.save();

  if (isActive === false) await tokenService.revokeAllForUser(user._id);
  return user;
}

/**
 * Deletes a user account. Their posts are soft-deleted (recoverable),
 * their comments removed, and post comment counters adjusted.
 */
async function deleteUserByAdmin(id, actor) {
  const user = await getUserOrThrow(id);
  if (String(user._id) === actor.id) {
    throw ApiError.badRequest('You cannot delete your own account', { code: 'SELF_MODIFICATION' });
  }

  const commentCounts = await Comment.aggregate([
    { $match: { author: user._id } },
    { $group: { _id: '$post', count: { $sum: 1 } } },
  ]);

  await Promise.all([
    Comment.deleteMany({ author: user._id }),
    Post.updateMany(
      { author: user._id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date(), deletedBy: actor.id },
    ),
    commentCounts.length &&
      Post.bulkWrite(
        commentCounts.map(({ _id, count }) => ({
          updateOne: { filter: { _id, isDeleted: { $in: [true, false] } }, update: { $inc: { commentCount: -count } } },
        })),
      ),
    tokenService.revokeAllForUser(user._id),
  ]);

  await user.deleteOne();
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  listUsers,
  updateUserByAdmin,
  deleteUserByAdmin,
};
