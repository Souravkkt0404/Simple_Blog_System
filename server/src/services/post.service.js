const mongoose = require('mongoose');
const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { assertCanManage } = require('../utils/policies');
const { PERMISSIONS } = require('../config/roles');
const notificationService = require('./notification.service');

const AUTHOR_FIELDS = 'name avatar';
const POST_PERMISSIONS = { own: PERMISSIONS.POST_MANAGE_OWN, any: PERMISSIONS.POST_MANAGE_ANY };

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  popular: { commentCount: -1, createdAt: -1 },
};

function buildFilter({ search, author, tag }) {
  const filter = {};
  if (author) filter.author = author;
  if (tag) filter.tags = tag.toLowerCase();
  if (search) filter.$text = { $search: search };
  return filter;
}

/**
 * Public feed. Excludes `content` (list views only need the excerpt) and
 * populates only the author fields the UI renders.
 */
function listPosts({ page, limit, search, author, tag, sort = 'newest' } = {}) {
  return paginate(Post, buildFilter({ search, author, tag }), {
    page,
    limit,
    sort: SORTS[sort] || SORTS.newest,
    select: '-content',
    populate: { path: 'author', select: AUTHOR_FIELDS },
  });
}

async function getPost(idOrSlug) {
  const filter = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: String(idOrSlug).toLowerCase() };
  const post = await Post.findOne(filter).populate('author', AUTHOR_FIELDS).lean();
  if (!post) throw ApiError.notFound('Post not found');
  return post;
}

async function findActivePostOrThrow(id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Post not found');
  const post = await Post.findById(id);
  if (!post) throw ApiError.notFound('Post not found');
  return post;
}

async function createPost(data, actor) {
  const post = await Post.create({ ...data, author: actor.id });
  await post.populate('author', AUTHOR_FIELDS);
  notificationService.broadcast('post:created', {
    id: post.id,
    title: post.title,
    slug: post.slug,
    author: post.author.name,
  });
  return post;
}

async function updatePost(id, data, actor) {
  const post = await findActivePostOrThrow(id);
  assertCanManage(actor, post.author, POST_PERMISSIONS, 'You can only edit your own posts');

  ['title', 'content', 'tags'].forEach((field) => {
    if (data[field] !== undefined) post[field] = data[field];
  });
  await post.save();
  await post.populate('author', AUTHOR_FIELDS);

  if (String(post.author._id) !== actor.id) {
    notificationService.notifyUser(post.author._id, {
      type: 'post:moderated',
      message: `An admin edited your post "${post.title}"`,
      link: `/posts/${post.slug}`,
    });
  }
  return post;
}

async function softDeletePost(id, actor) {
  const post = await findActivePostOrThrow(id);
  assertCanManage(actor, post.author, POST_PERMISSIONS, 'You can only delete your own posts');

  post.isDeleted = true;
  post.deletedAt = new Date();
  post.deletedBy = actor.id;
  await post.save();

  if (String(post.author) !== actor.id) {
    notificationService.notifyUser(post.author, {
      type: 'post:moderated',
      message: `An admin removed your post "${post.title}"`,
    });
  }
  return post;
}

// ---- Admin-only operations ----

const STATUS_FILTER = {
  active: { isDeleted: false },
  deleted: { isDeleted: true },
  all: { isDeleted: { $in: [true, false] } },
};

function listPostsForAdmin({ page, limit, search, status = 'all' } = {}) {
  const filter = { ...buildFilter({ search }), ...(STATUS_FILTER[status] || STATUS_FILTER.all) };
  return paginate(Post, filter, {
    page,
    limit,
    select: '-content',
    populate: [
      { path: 'author', select: 'name email' },
      { path: 'deletedBy', select: 'name' },
    ],
  });
}

async function restorePost(id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Post not found');
  const post = await Post.findOneAndUpdate(
    { _id: id, isDeleted: true },
    { isDeleted: false, deletedAt: null, deletedBy: null },
    { new: true },
  ).populate('author', AUTHOR_FIELDS);
  if (!post) throw ApiError.notFound('Deleted post not found');
  return post;
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  updatePost,
  softDeletePost,
  listPostsForAdmin,
  restorePost,
  findActivePostOrThrow,
};
