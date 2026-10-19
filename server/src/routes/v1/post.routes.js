const express = require('express');
const controller = require('../../controllers/post.controller');
const commentController = require('../../controllers/comment.controller');
const { authenticate, requirePermission, validate, logActivity } = require('../../middleware');
const postSchemas = require('../../validators/post.validator');
const commentSchemas = require('../../validators/comment.validator');
const { PERMISSIONS } = require('../../config/roles');
const { ACTIONS } = require('../../services/activity.service');

const router = express.Router();

// Public reads
router.get('/', validate(postSchemas.listPosts), controller.list);
router.get('/:idOrSlug', validate(postSchemas.getPost), controller.getOne);

// Authenticated writes. Ownership ("only your own posts") is enforced in the service layer.
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.POST_CREATE),
  validate(postSchemas.createPost),
  logActivity(ACTIONS.POST_CREATE),
  controller.create,
);
router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.POST_MANAGE_OWN),
  validate(postSchemas.updatePost),
  logActivity(ACTIONS.POST_UPDATE),
  controller.update,
);
router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.POST_MANAGE_OWN),
  validate(postSchemas.postId),
  logActivity(ACTIONS.POST_DELETE),
  controller.remove,
);

// Nested comment collection: /posts/:postId/comments
router.get('/:postId/comments', validate(commentSchemas.listComments), commentController.listForPost);
router.post(
  '/:postId/comments',
  authenticate,
  requirePermission(PERMISSIONS.COMMENT_CREATE),
  validate(commentSchemas.createComment),
  logActivity(ACTIONS.COMMENT_CREATE),
  commentController.create,
);

module.exports = router;
