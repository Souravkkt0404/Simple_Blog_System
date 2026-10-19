const createApp = require('../../src/app');
const db = require('../helpers/db');
const { API, request, createUser, createAdmin, createPost, auth } = require('../helpers/factory');
const { User, Post, Comment, RefreshToken } = require('../../src/models');
const tokenService = require('../../src/services/token.service');

const app = createApp();

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe('admin access control', () => {
  const adminRoutes = [
    ['get', '/admin/stats'],
    ['get', '/admin/users'],
    ['get', '/admin/posts'],
    ['get', '/admin/comments'],
    ['get', '/admin/activity'],
  ];

  it.each(adminRoutes)('%s %s returns 401 without a token', async (method, path) => {
    await request(app)[method](`${API}${path}`).expect(401);
  });

  it.each(adminRoutes)('%s %s returns 403 for regular users', async (method, path) => {
    const { token } = await createUser();
    const res = await request(app)[method](`${API}${path}`).set(auth(token)).expect(403);
    expect(res.body.success).toBe(false);
  });

  it('applies role changes immediately, even with an old token', async () => {
    const { user, token } = await createAdmin();
    await request(app).get(`${API}/admin/stats`).set(auth(token)).expect(200);
    await User.updateOne({ _id: user._id }, { role: 'user' });
    await request(app).get(`${API}/admin/stats`).set(auth(token)).expect(403);
  });
});

describe('GET /admin/stats', () => {
  it('returns totals for users, posts and comments', async () => {
    const { user: admin, token } = await createAdmin();
    const { user } = await createUser();
    const post = await createPost(user);
    await createPost(user, { title: 'Removed post', isDeleted: true });
    await Comment.create({ content: 'hi', post: post._id, author: admin._id });

    const res = await request(app).get(`${API}/admin/stats`).set(auth(token)).expect(200);
    expect(res.body.data.totals).toEqual({ users: 2, posts: 1, comments: 1 });
    expect(res.body.data.posts).toEqual({ active: 1, deleted: 1 });
    expect(res.body.data.users).toEqual({ admins: 1, active: 2, inactive: 0 });
  });
});

describe('user management', () => {
  it('lists and searches users', async () => {
    const { token } = await createAdmin({ name: 'Boss' });
    await createUser({ name: 'Alice Smith', email: 'alice@test.com' });
    await createUser({ name: 'Bob', email: 'bob@test.com' });

    const all = await request(app).get(`${API}/admin/users`).set(auth(token)).expect(200);
    expect(all.body.meta.total).toBe(3);

    const search = await request(app).get(`${API}/admin/users?search=alice`).set(auth(token)).expect(200);
    expect(search.body.data.map((u) => u.email)).toEqual(['alice@test.com']);
    expect(search.body.data[0].password).toBeUndefined();
  });

  it('promotes users and deactivates them (revoking sessions)', async () => {
    const { token } = await createAdmin();
    const { user } = await createUser();
    await tokenService.issueRefreshToken(user._id);

    const promoted = await request(app)
      .patch(`${API}/admin/users/${user.id}`)
      .set(auth(token))
      .send({ role: 'admin' })
      .expect(200);
    expect(promoted.body.data.role).toBe('admin');

    await request(app).patch(`${API}/admin/users/${user.id}`).set(auth(token)).send({ isActive: false }).expect(200);
    expect(await RefreshToken.countDocuments({ user: user._id, revokedAt: null })).toBe(0);
  });

  it('prevents admins from demoting, deactivating or deleting themselves', async () => {
    const { user, token } = await createAdmin();
    await request(app).patch(`${API}/admin/users/${user.id}`).set(auth(token)).send({ role: 'user' }).expect(400);
    await request(app).patch(`${API}/admin/users/${user.id}`).set(auth(token)).send({ isActive: false }).expect(400);
    await request(app).delete(`${API}/admin/users/${user.id}`).set(auth(token)).expect(400);
  });

  it('validates role values', async () => {
    const { token } = await createAdmin();
    const { user } = await createUser();
    await request(app).patch(`${API}/admin/users/${user.id}`).set(auth(token)).send({ role: 'superuser' }).expect(422);
  });

  it('deletes a user, soft-deletes their posts and removes their comments', async () => {
    const { user: admin, token } = await createAdmin();
    const { user } = await createUser();
    const adminPost = await createPost(admin);
    const userPost = await createPost(user);
    await Comment.create({ content: 'by user', post: adminPost._id, author: user._id });
    await Post.updateOne({ _id: adminPost._id }, { commentCount: 1 });

    await request(app).delete(`${API}/admin/users/${user.id}`).set(auth(token)).expect(204);

    expect(await User.findById(user._id)).toBeNull();
    expect(await Post.findOne({ _id: userPost._id, isDeleted: true })).not.toBeNull();
    expect(await Comment.countDocuments({ author: user._id })).toBe(0);
    expect((await Post.findById(adminPost._id)).commentCount).toBe(0);
  });

  it('returns 404 for unknown users', async () => {
    const { token } = await createAdmin();
    await request(app)
      .patch(`${API}/admin/users/0123456789abcdef01234567`)
      .set(auth(token))
      .send({ name: 'Nobody' })
      .expect(404);
  });
});

describe('post management', () => {
  it('filters posts by status and restores soft-deleted posts', async () => {
    const { token } = await createAdmin();
    const { user } = await createUser();
    await createPost(user, { title: 'Live post' });
    const deleted = await createPost(user, { title: 'Removed post', isDeleted: true, deletedAt: new Date() });

    const all = await request(app).get(`${API}/admin/posts`).set(auth(token)).expect(200);
    expect(all.body.meta.total).toBe(2);

    const onlyDeleted = await request(app).get(`${API}/admin/posts?status=deleted`).set(auth(token)).expect(200);
    expect(onlyDeleted.body.data.map((p) => p.title)).toEqual(['Removed post']);

    const restored = await request(app).patch(`${API}/admin/posts/${deleted.id}/restore`).set(auth(token)).expect(200);
    expect(restored.body.data.isDeleted).toBe(false);
    await request(app).get(`${API}/posts/${deleted.slug}`).expect(200);

    // Restoring an active post is a 404.
    await request(app).patch(`${API}/admin/posts/${deleted.id}/restore`).set(auth(token)).expect(404);
  });
});

describe('comment management and activity', () => {
  it('lists every comment with post and author populated', async () => {
    const { token } = await createAdmin();
    const { user } = await createUser();
    const post = await createPost(user, { title: 'Commented post' });
    await Comment.create({ content: 'Hello there', post: post._id, author: user._id });

    const res = await request(app).get(`${API}/admin/comments?search=hello`).set(auth(token)).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].post.title).toBe('Commented post');
    expect(res.body.data[0].author.email).toBe(user.email);
  });

  it('exposes the activity log', async () => {
    const { token } = await createAdmin();
    await request(app).post(`${API}/posts`).set(auth(token)).send({ title: 'Logged post', content: 'Content long enough.' });
    await new Promise((r) => setTimeout(r, 50));

    const res = await request(app).get(`${API}/admin/activity?action=POST_CREATE`).set(auth(token)).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ action: 'POST_CREATE', metadata: { title: 'Logged post' } });
  });
});
