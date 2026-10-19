const ApiError = require('../../src/utils/ApiError');
const escapeRegex = require('../../src/utils/escapeRegex');
const { getPagination, buildPaginationMeta } = require('../../src/utils/pagination');
const { toSlug, generateUniqueSlug } = require('../../src/utils/slug');
const { canManage, assertCanManage, isOwner } = require('../../src/utils/policies');
const { hasPermission, PERMISSIONS } = require('../../src/config/roles');

describe('pagination utils', () => {
  it('applies defaults for missing or invalid values', () => {
    expect(getPagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
    expect(getPagination({ page: 'abc', limit: '-5' })).toEqual({ page: 1, limit: 1, skip: 0 });
  });

  it('caps the limit and computes skip', () => {
    expect(getPagination({ page: 3, limit: 500 })).toEqual({ page: 3, limit: 50, skip: 100 });
  });

  it('builds meta with navigation flags', () => {
    expect(buildPaginationMeta({ page: 2, limit: 10, total: 25 })).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });
    expect(buildPaginationMeta({ page: 1, limit: 10, total: 0 }).totalPages).toBe(1);
  });
});

describe('slug utils', () => {
  it('creates lowercase URL-friendly slugs', () => {
    expect(toSlug('Hello, World! MERN & Node.js')).toBe('hello-world-mern-and-nodejs');
  });

  it('falls back when the title has no slug-able characters', () => {
    expect(toSlug('!!!')).toBe('post');
  });

  it('truncates long titles', () => {
    expect(toSlug('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });

  it('returns the base slug when it is free', async () => {
    const Model = { exists: jest.fn().mockResolvedValue(null) };
    await expect(generateUniqueSlug(Model, 'My Post')).resolves.toBe('my-post');
    expect(Model.exists).toHaveBeenCalledWith({ slug: 'my-post', isDeleted: { $in: [true, false] } });
  });

  it('appends a suffix when the base slug is taken', async () => {
    const Model = { exists: jest.fn().mockResolvedValueOnce({ _id: 1 }).mockResolvedValue(null) };
    const slug = await generateUniqueSlug(Model, 'My Post', 'abc');
    expect(slug).toMatch(/^my-post-[a-f0-9]{6}$/);
    expect(Model.exists.mock.calls[0][0]._id).toEqual({ $ne: 'abc' });
  });
});

describe('ApiError', () => {
  it('carries status, default code and details', () => {
    const err = ApiError.notFound('Missing', { details: { id: 1 } });
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.details).toEqual({ id: 1 });
    expect(ApiError.forbidden().code).toBe('FORBIDDEN');
    expect(ApiError.conflict('x', { code: 'EMAIL_TAKEN' }).code).toBe('EMAIL_TAKEN');
  });
});

describe('escapeRegex', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegex('a.b*c(d)')).toBe('a\\.b\\*c\\(d\\)');
  });
});

describe('RBAC permissions & policies', () => {
  const user = { id: 'u1', role: 'user' };
  const admin = { id: 'a1', role: 'admin' };
  const postPerms = { own: PERMISSIONS.POST_MANAGE_OWN, any: PERMISSIONS.POST_MANAGE_ANY };

  it('grants admins every permission and users a subset', () => {
    Object.values(PERMISSIONS).forEach((p) => expect(hasPermission('admin', p)).toBe(true));
    expect(hasPermission('user', PERMISSIONS.POST_CREATE)).toBe(true);
    expect(hasPermission('user', PERMISSIONS.USER_MANAGE)).toBe(false);
    expect(hasPermission('ghost', PERMISSIONS.POST_CREATE)).toBe(false);
  });

  it('lets owners manage their own resources only', () => {
    expect(isOwner(user, 'u1')).toBe(true);
    expect(canManage(user, 'u1', postPerms)).toBe(true);
    expect(canManage(user, 'someone-else', postPerms)).toBe(false);
    expect(canManage(null, 'u1', postPerms)).toBe(false);
  });

  it('lets admins manage any resource', () => {
    expect(canManage(admin, 'someone-else', postPerms)).toBe(true);
  });

  it('assertCanManage throws a 403 ApiError', () => {
    expect(() => assertCanManage(user, 'other', postPerms, 'nope')).toThrow(
      expect.objectContaining({ statusCode: 403, message: 'nope' }),
    );
  });
});
