const express = require('express');
const controller = require('../../controllers/admin.controller');
const { authenticate, authorize, requirePermission, validate, logActivity } = require('../../middleware');
const schemas = require('../../validators/admin.validator');
const { ROLES, PERMISSIONS } = require('../../config/roles');
const { ACTIONS } = require('../../services/activity.service');

const router = express.Router();

// Every admin route: valid JWT + admin role, enforced server-side.
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/stats', requirePermission(PERMISSIONS.DASHBOARD_VIEW), controller.stats);

router
  .route('/users')
  .get(requirePermission(PERMISSIONS.USER_MANAGE), validate(schemas.listUsers), controller.listUsers);
router
  .route('/users/:id')
  .patch(requirePermission(PERMISSIONS.USER_MANAGE), validate(schemas.updateUser), logActivity(ACTIONS.USER_UPDATE), controller.updateUser)
  .delete(requirePermission(PERMISSIONS.USER_MANAGE), validate(schemas.byId), logActivity(ACTIONS.USER_DELETE), controller.deleteUser);

router.get('/posts', requirePermission(PERMISSIONS.POST_MANAGE_ANY), validate(schemas.listPosts), controller.listPosts);
router.patch(
  '/posts/:id/restore',
  requirePermission(PERMISSIONS.POST_MANAGE_ANY),
  validate(schemas.byId),
  logActivity(ACTIONS.POST_RESTORE),
  controller.restorePost,
);

router.get('/comments', requirePermission(PERMISSIONS.COMMENT_MANAGE_ANY), validate(schemas.listComments), controller.listComments);

router.get('/activity', validate(schemas.listActivity), controller.listActivity);

module.exports = router;
