/**
 * Central RBAC definition. Routes and services ask "does this role hold
 * permission X?" instead of hard-coding role names everywhere.
 */
const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

const PERMISSIONS = Object.freeze({
  POST_CREATE: 'post:create',
  POST_MANAGE_OWN: 'post:manage:own',
  POST_MANAGE_ANY: 'post:manage:any',
  COMMENT_CREATE: 'comment:create',
  COMMENT_MANAGE_OWN: 'comment:manage:own',
  COMMENT_MANAGE_ANY: 'comment:manage:any',
  USER_MANAGE: 'user:manage',
  DASHBOARD_VIEW: 'dashboard:view',
});

const userPermissions = [
  PERMISSIONS.POST_CREATE,
  PERMISSIONS.POST_MANAGE_OWN,
  PERMISSIONS.COMMENT_CREATE,
  PERMISSIONS.COMMENT_MANAGE_OWN,
];

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.USER]: Object.freeze(userPermissions),
  [ROLES.ADMIN]: Object.freeze(Object.values(PERMISSIONS)),
});

const hasPermission = (role, permission) => Boolean(ROLE_PERMISSIONS[role]?.includes(permission));

module.exports = { ROLES, PERMISSIONS, ROLE_PERMISSIONS, hasPermission };
