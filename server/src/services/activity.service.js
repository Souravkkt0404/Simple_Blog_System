const ActivityLog = require('../models/ActivityLog');
const { paginate } = require('../utils/pagination');

const ACTIONS = Object.freeze({
  REGISTER: 'REGISTER',
  LOGIN: 'LOGIN',
  LOGIN_OAUTH: 'LOGIN_OAUTH',
  LOGOUT: 'LOGOUT',
  POST_CREATE: 'POST_CREATE',
  POST_UPDATE: 'POST_UPDATE',
  POST_DELETE: 'POST_DELETE',
  POST_RESTORE: 'POST_RESTORE',
  COMMENT_CREATE: 'COMMENT_CREATE',
  COMMENT_UPDATE: 'COMMENT_UPDATE',
  COMMENT_DELETE: 'COMMENT_DELETE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
});

const record = (entry) => ActivityLog.create(entry);

function listActivity({ page, limit, action, user } = {}) {
  const filter = {};
  if (action) filter.action = action;
  if (user) filter.user = user;
  return paginate(ActivityLog, filter, {
    page,
    limit,
    populate: { path: 'user', select: 'name email' },
  });
}

module.exports = { ACTIONS, record, listActivity };
