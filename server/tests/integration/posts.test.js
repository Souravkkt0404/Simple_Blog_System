const createApp = require('../../src/app');
const db = require('../helpers/db');
const { API, request, createUser, createAdmin, createPost, auth } = require('../helpers/factory');
const { Post, ActivityLog } = require('../../src/models');

const app = createApp();

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const newPost = { title: 'Hello MERN World!', content: 'A full stack JavaScript adventure begins here.', tags: ['MERN'] };

describe('POST /posts', () => {
  it('requires authentication', async () => {
    await request(app).post(`${API}/posts`).send(newPost).expect(401);
  });

  it('creates a post with slug, author and timestamps', async () => {
    const { user, token } = await createUser();
    const res = await request(app).post(`${API}/posts`).set(auth(token)).send(newPost).expect(201);

    expect(res.body.data).toMatchObject({
      title: 'Hello MERN World!',
      slug: 'hello-mern-world',
      tags: ['mern'],
      author: { _id: user.id, name: user.name },
      isDeleted: false,
    });
    expect(res.body.data.createdAt).toBeDefined();
    expect(res.body.data.updatedAt).toBeDefined();
    expect(res.body.data.excerpt).toBe(newPost.content);

    await new Promise((r) => setTimeout(r, 50));
    expect(await ActivityLog.countDocuments({ action: 'POST_CREATE', user: user._id })).toBe(1);
  });

  it('ignores a client-supplied author', async () => {
    const { user, token } = await createUser();
    const { user: other } = await createUser();
    const res = await request(app)
      .post(`${API}/posts`)
      .set(auth(token))
      .send({ ...newPost, author: other.id })
      .expect(201);
    expect(res.body.data.author._id).toBe(user.id);
  });

  it('generates unique slugs for duplicate titles', async () => {
    const { token } = await createUser();
    const a = await request(app).post(`${API}/posts`).set(auth(token)).send(newPost);
    const b = await request(app).post(`${API}/posts`).set(auth(token)).send(newPost);
    expect(a.body.data.slug).toBe('hello-mern-world');
    expect(b.body.data.slug).toMatch(/^hello-mern-world-[a-f0-9]{6}$/);
  });

  it('validates the payload', async () => {
    const { token } = await createUser();
    const res = await request(app).post(`${API}/posts`).set(auth(token)).send({ title: 'x' }).expect(422);
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['content', 'title']);
  });
});

describe('GET /posts', () => {
  it('paginates, excludes content and soft-deleted posts', async () => {
    const { user } = await createUser();
    for (let i = 0; i < 12; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await createPost(user, { title: `Post number ${i}` });
    }
    await createPost(user, { title: 'Deleted one', isDeleted: true });

    const res = await request(app).get(`${API}/posts?page=2&limit=5`).expect(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta).toEqual({ page: 2, limit: 5, total: 12, totalPages: 3, hasNextPage: true, hasPrevPage: true });
    expect(res.body.data[0].content).toBeUndefined();
    expect(res.body.data[0].author).toEqual({ _id: user.id, name: user.name });
  });

  it('supports full-text search and author filter', async () => {
    const { user } = await createUser();
    const { user: other } = await createUser();
    await createPost(user, { title: 'Learning React hooks' });
    await createPost(other, { title: 'MongoDB indexing tips' });

    const search = await request(app).get(`${API}/posts?search=mongodb`).expect(200);
    expect(search.body.data.map((p) => p.title)).toEqual(['MongoDB indexing tips']);

    const byAuthor = await request(app).get(`${API}/posts?author=${user.id}`).expect(200);
    expect(byAuthor.body.data.map((p) => p.title)).toEqual(['Learning React hooks']);
  });

  it('rejects invalid query params', async () => {
    await request(app).get(`${API}/posts?limit=1000`).expect(422);
  });
});

describe('GET /posts/:idOrSlug', () => {
  it('fetches by slug or id with full content', async () => {
    const { user } = await createUser();
    const post = await createPost(user);

    const bySlug = await request(app).get(`${API}/posts/${post.slug}`).expect(200);
    expect(bySlug.body.data.content).toBe(post.content);
    await request(app).get(`${API}/posts/${post.id}`).expect(200);
  });

  it('returns 404 for soft-deleted posts', async () => {
    const { user } = await createUser();
    const post = await createPost(user, { isDeleted: true });
    const res = await request(app).get(`${API}/posts/${post.slug}`).expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /posts/:id', () => {
  it('lets the owner update and regenerates the slug', async () => {
    const { user, token } = await createUser();
    const post = await createPost(user);
    const res = await request(app)
      .patch(`${API}/posts/${post.id}`)
      .set(auth(token))
      .send({ title: 'Brand New Title' })
      .expect(200);
    expect(res.body.data.slug).toBe('brand-new-title');
  });

  it('forbids non-owners (enforced at API level)', async () => {
    const { user } = await createUser();
    const { token: otherToken } = await createUser();
    const post = await createPost(user);
    const res = await request(app)
      .patch(`${API}/posts/${post.id}`)
      .set(auth(otherToken))
      .send({ title: 'Hijacked title' })
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('lets admins update any post', async () => {
    const { user } = await createUser();
    const { token: adminToken } = await createAdmin();
    const post = await createPost(user);
    await request(app).patch(`${API}/posts/${post.id}`).set(auth(adminToken)).send({ title: 'Moderated' }).expect(200);
  });

  it('rejects empty updates and invalid ids', async () => {
    const { user, token } = await createUser();
    const post = await createPost(user);
    await request(app).patch(`${API}/posts/${post.id}`).set(auth(token)).send({}).expect(422);
    await request(app).patch(`${API}/posts/123`).set(auth(token)).send({ title: 'Whatever' }).expect(422);
  });
});

describe('DELETE /posts/:id (soft delete)', () => {
  it('soft-deletes the post for its owner', async () => {
    const { user, token } = await createUser();
    const post = await createPost(user);

    await request(app).delete(`${API}/posts/${post.id}`).set(auth(token)).expect(204);

    const stored = await Post.findOne({ _id: post._id, isDeleted: true });
    expect(stored).not.toBeNull();
    expect(stored.deletedAt).toBeInstanceOf(Date);
    expect(String(stored.deletedBy)).toBe(user.id);

    await request(app).delete(`${API}/posts/${post.id}`).set(auth(token)).expect(404);
  });

  it('forbids non-owners and allows admins', async () => {
    const { user } = await createUser();
    const { token: otherToken } = await createUser();
    const { token: adminToken } = await createAdmin();
    const post = await createPost(user);

    await request(app).delete(`${API}/posts/${post.id}`).set(auth(otherToken)).expect(403);
    await request(app).delete(`${API}/posts/${post.id}`).set(auth(adminToken)).expect(204);
  });
});
