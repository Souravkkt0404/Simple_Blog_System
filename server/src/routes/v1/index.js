const express = require('express');
const mongoose = require('mongoose');
const { ok } = require('../../utils/apiResponse');

const router = express.Router();

router.get('/health', (_req, res) =>
  ok(res, {
    status: 'ok',
    version: 'v1',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
  }),
);

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/posts', require('./post.routes'));
router.use('/comments', require('./comment.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
