const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { assertCanManage } = require('../utils/policies');
const escapeRegex = require('../utils/escapeRegex');
const { PERMISSIONS } = require('../config/roles');
const notificationService = require('./notification.service');

const AUTHOR_FIELDS = 'name avatar';
const COMMENT_PERMISSIONS = { own: PERMISSIONS.COMMENT_MANAGE_OWN, any: PERMISSIONS.COMMENT_MANAGE_ANY };

async function getActivePost(postId) {
  if (!mongoose.isValidObjectId(postId)) throw ApiError.notFound('Post not found');
  // Only the fields needed for notifications; soft-deleted posts are excluded by the model hook.
  const post = await Post.findById(postId).select('author title slug').lean();
  if (!post) throw ApiError.notFound('Post not found');
  return post;
}

async function findCommentOrThrow(id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Comment not found');
  const comment = await Comment.findById(id);
  if (!comment) throw ApiError.notFound('Comment not found');
  return comment;
}

async function listByPost(postId, { page, limit } = {}) {
  await getActivePost(postId);
  return paginate(Comment, { post: postId }, {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: { path: 'author', select: AUTHOR_FIELDS },
  });
}

async function createComment(postId, { content }, actor) {
  const post = await getActivePost(postId);
  const comment = await Comment.create({ content, post: postId, author: actor.id });
  await Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });
  await comment.populate('author', AUTHOR_FIELDS);

  if (String(post.author) !== actor.id) {
    notificationService.notifyUser(post.author, {
      type: 'comment:created',
      message: `${comment.author.name} commented on "${post.title}"`,
      link: `/posts/${post.slug}`,
    });
  }
  return comment;
}

async function updateComment(id, { content }, actor) {
  const comment = await findCommentOrThrow(id);
  assertCanManage(actor, comment.author, COMMENT_PERMISSIONS, 'You can only edit your own comments');

  comment.content = content;
  comment.isEdited = true;
  await comment.save();
  return comment.populate('author', AUTHOR_FIELDS);
}

async function deleteComment(id, actor) {
  const comment = await findCommentOrThrow(id);
  assertCanManage(actor, comment.author, COMMENT_PERMISSIONS, 'You can only delete your own comments');

  await comment.deleteOne();
  // Explicit isDeleted filter so the counter stays right even if the post was soft-deleted.
  await Post.updateOne(
    { _id: comment.post, isDeleted: { $in: [true, false] }, commentCount: { $gt: 0 } },
    { $inc: { commentCount: -1 } },
  );
}

function listAllComments({ page, limit, search } = {}) {
  const filter = search ? { content: { $regex: escapeRegex(search), $options: 'i' } } : {};
  return paginate(Comment, filter, {
    page,
    limit,
    populate: [
      { path: 'author', select: 'name email' },
      // Explicit isDeleted match so comments on soft-deleted posts still show their post.
      { path: 'post', select: 'title slug isDeleted', match: { isDeleted: { $in: [true, false] } } },
    ],
  });
}

module.exports = { listByPost, createComment, updateComment, deleteComment, listAllComments };
