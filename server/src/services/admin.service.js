const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');

/**
 * Dashboard numbers. All counts run concurrently; each uses an index.
 */
async function getDashboardStats() {
  const [totalUsers, adminUsers, activeUsers, totalPosts, deletedPosts, totalComments, recentActivity] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ isActive: true }),
      Post.countDocuments(), // excludes soft-deleted via model hook
      Post.countDocuments({ isDeleted: true }),
      Comment.countDocuments(),
      ActivityLog.find().sort({ createdAt: -1 }).limit(8).populate('user', 'name').lean(),
    ]);

  return {
    totals: { users: totalUsers, posts: totalPosts, comments: totalComments },
    users: { admins: adminUsers, active: activeUsers, inactive: totalUsers - activeUsers },
    posts: { active: totalPosts, deleted: deletedPosts },
    recentActivity,
  };
}

module.exports = { getDashboardStats };
