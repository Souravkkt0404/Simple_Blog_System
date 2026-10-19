const asyncHandler = require('../utils/asyncHandler');
const { ok, created, noContent } = require('../utils/apiResponse');
const postService = require('../services/post.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await postService.listPosts(req.query);
  ok(res, items, meta);
});

const getOne = asyncHandler(async (req, res) => {
  ok(res, await postService.getPost(req.params.idOrSlug));
});

const create = asyncHandler(async (req, res) => {
  const post = await postService.createPost(req.body, req.user);
  res.locals.activityMeta = { postId: post.id, title: post.title };
  created(res, post, 'Post created');
});

const update = asyncHandler(async (req, res) => {
  const post = await postService.updatePost(req.params.id, req.body, req.user);
  res.locals.activityMeta = { postId: post.id, title: post.title };
  ok(res, post, undefined, 'Post updated');
});

const remove = asyncHandler(async (req, res) => {
  const post = await postService.softDeletePost(req.params.id, req.user);
  res.locals.activityMeta = { postId: post.id, title: post.title };
  noContent(res);
});

module.exports = { list, getOne, create, update, remove };
