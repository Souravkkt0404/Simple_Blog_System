const asyncHandler = require('../utils/asyncHandler');
const { ok, created, noContent } = require('../utils/apiResponse');
const commentService = require('../services/comment.service');

const listForPost = asyncHandler(async (req, res) => {
  const { items, meta } = await commentService.listByPost(req.params.postId, req.query);
  ok(res, items, meta);
});

const create = asyncHandler(async (req, res) => {
  const comment = await commentService.createComment(req.params.postId, req.body, req.user);
  res.locals.activityMeta = { commentId: comment.id, postId: req.params.postId };
  created(res, comment, 'Comment added');
});

const update = asyncHandler(async (req, res) => {
  const comment = await commentService.updateComment(req.params.id, req.body, req.user);
  res.locals.activityMeta = { commentId: comment.id };
  ok(res, comment, undefined, 'Comment updated');
});

const remove = asyncHandler(async (req, res) => {
  await commentService.deleteComment(req.params.id, req.user);
  res.locals.activityMeta = { commentId: req.params.id };
  noContent(res);
});

module.exports = { listForPost, create, update, remove };
