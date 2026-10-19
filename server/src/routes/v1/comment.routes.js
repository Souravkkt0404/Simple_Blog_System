const express = require('express');
const controller = require('../../controllers/comment.controller');
const { authenticate, requirePermission, validate, logActivity } = require('../../middleware');
const schemas = require('../../validators/comment.validator');
const { PERMISSIONS } = require('../../config/roles');
const { ACTIONS } = require('../../services/activity.service');

const router = express.Router();

// Individual comment resource: /comments/:id (creation/listing is nested under /posts/:postId/comments)
router.use(authenticate, requirePermission(PERMISSIONS.COMMENT_MANAGE_OWN));

router.patch('/:id', validate(schemas.updateComment), logActivity(ACTIONS.COMMENT_UPDATE), controller.update);
router.delete('/:id', validate(schemas.commentId), logActivity(ACTIONS.COMMENT_DELETE), controller.remove);

module.exports = router;
