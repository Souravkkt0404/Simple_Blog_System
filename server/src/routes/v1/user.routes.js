const express = require('express');
const controller = require('../../controllers/user.controller');
const { authenticate, validate, logActivity } = require('../../middleware');
const schemas = require('../../validators/user.validator');
const { ACTIONS } = require('../../services/activity.service');

const router = express.Router();

router.use(authenticate);

router.get('/me', controller.me);
router.patch('/me', validate(schemas.updateProfile), controller.updateMe);
router.patch('/me/password', validate(schemas.changePassword), logActivity(ACTIONS.PASSWORD_CHANGE), controller.changePassword);

module.exports = router;
