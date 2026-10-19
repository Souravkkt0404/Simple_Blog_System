const createApp = require('../../src/app');
const db = require('../helpers/db');
const { API, request, createUser, createAdmin, createPost, auth } = require('../helpers/factory');
const { Post, Comment } = require('../../src/models');

const app = createApp();

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

async function setup() {
  const owner = await createUser();
  const commenter = await createUser();
  const post = await createPost(owner.user);
  return { owner, commenter, post };
}

const addComment = (postId, token, content = 'Nice post!') =>
  request(app).post(`${API}/posts/${postId}/comments`).set(auth(token)).send({ content });

describe('comments', () => {
  it('creates a comment linked to the post and increments the counter', async () => {
    const { commenter, post } = await setup();
    const res = await addComment(post.id, commenter.token).expect(201);

    expect(res.body.data).toMatchObject({
      content: 'Nice post!',
      post: post.id,
      author: { _id: commenter.user.id, name: commenter.user.name },
    });
    expect((await Post.findById(post.id)).commentCount).toBe(1);
  });

  it('requires authentication to comment', async () => {
    const { post } = await setup();
    await request(app).post(`${API}/posts/${post.id}/comments`).send({ content: 'hi' }).expect(401);
  });

  it('cannot comment on missing or soft-deleted posts', async () => {
    const { owner, commenter } = await setup();
    const deleted = await createPost(owner.user, { isDeleted: true });
    await addComment(deleted.id, commenter.token).expect(404);
    await addComment('0123456789abcdef01234567', commenter.token).expect(404);
  });

  it('lists comments for a post with pagination and populated authors', async () => {
    const { commenter, post } = await setup();
    await addComment(post.id, commenter.token, 'first');
    await addComment(post.id, commenter.token, 'second');
    await addComment(post.id, commenter.token, 'third');

    const res = await request(app).get(`${API}/posts/${post.id}/comments?limit=2`).expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].content).toBe('third'); // newest first
    expect(res.body.data[0].author.name).toBe(commenter.user.name);
    expect(res.body.meta.total).toBe(3);
  });

  it('lets only the author edit a comment', async () => {
    const { owner, commenter, post } = await setup();
    const { body } = await addComment(post.id, commenter.token);
    const id = body.data._id;

    await request(app).patch(`${API}/comments/${id}`).set(auth(owner.token)).send({ content: 'hacked' }).expect(403);

    const res = await request(app)
      .patch(`${API}/comments/${id}`)
      .set(auth(commenter.token))
      .send({ content: 'edited' })
      .expect(200);
    expect(res.body.data).toMatchObject({ content: 'edited', isEdited: true });
  });

  it('lets the author or an admin delete a comment and decrements the counter', async () => {
    const { owner, commenter, post } = await setup();
    const admin = await createAdmin();
    const c1 = (await addComment(post.id, commenter.token)).body.data._id;
    const c2 = (await addComment(post.id, commenter.token)).body.data._id;

    await request(app).delete(`${API}/comments/${c1}`).set(auth(owner.token)).expect(403);
    await request(app).delete(`${API}/comments/${c1}`).set(auth(commenter.token)).expect(204);
    await request(app).delete(`${API}/comments/${c2}`).set(auth(admin.token)).expect(204);

    expect(await Comment.countDocuments()).toBe(0);
    expect((await Post.findById(post.id)).commentCount).toBe(0);
  });

  it('validates comment content', async () => {
    const { commenter, post } = await setup();
    await addComment(post.id, commenter.token, '').expect(422);
    await addComment(post.id, commenter.token, 'x'.repeat(2001)).expect(422);
  });
});
