const asyncHandler = require('../utils/asyncHandler');
const { ok, noContent } = require('../utils/apiResponse');
const adminService = require('../services/admin.service');
const userService = require('../services/user.service');
const postService = require('../services/post.service');
const commentService = require('../services/comment.service');
const activityService = require('../services/activity.service');

const sendPage = (res, { items, meta }) => ok(res, items, meta);

const stats = asyncHandler(async (_req, res) => {
  ok(res, await adminService.getDashboardStats());
});

const listUsers = asyncHandler(async (req, res) => sendPage(res, await userService.listUsers(req.query)));

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUserByAdmin(req.params.id, req.body, req.user);
  res.locals.activityMeta = { targetUserId: user.id, changes: req.body };
  ok(res, user, undefined, 'User updated');
});

const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUserByAdmin(req.params.id, req.user);
  res.locals.activityMeta = { targetUserId: req.params.id };
  noContent(res);
});

const listPosts = asyncHandler(async (req, res) => sendPage(res, await postService.listPostsForAdmin(req.query)));

const restorePost = asyncHandler(async (req, res) => {
  const post = await postService.restorePost(req.params.id);
  res.locals.activityMeta = { postId: post.id, title: post.title };
  ok(res, post, undefined, 'Post restored');
});

const listComments = asyncHandler(async (req, res) => sendPage(res, await commentService.listAllComments(req.query)));

const listActivity = asyncHandler(async (req, res) => sendPage(res, await activityService.listActivity(req.query)));

module.exports = { stats, listUsers, updateUser, deleteUser, listPosts, restorePost, listComments, listActivity };
