const createApp = require('../../src/app');
const db = require('../helpers/db');
const { API, request, createUser, auth } = require('../helpers/factory');

const app = createApp();

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe('/users/me', () => {
  it('returns the current user profile', async () => {
    const { user, token } = await createUser();
    const res = await request(app).get(`${API}/users/me`).set(auth(token)).expect(200);
    expect(res.body.data).toMatchObject({ id: user.id, email: user.email, role: 'user' });
  });

  it('updates name and avatar but not role', async () => {
    const { token } = await createUser();
    const res = await request(app)
      .patch(`${API}/users/me`)
      .set(auth(token))
      .send({ name: 'Renamed', avatar: 'https://example.com/a.png', role: 'admin' })
      .expect(200);
    expect(res.body.data).toMatchObject({ name: 'Renamed', avatar: 'https://example.com/a.png', role: 'user' });
  });

  it('changes the password after verifying the current one', async () => {
    const { user, token } = await createUser({ email: 'pw@test.com' });

    await request(app)
      .patch(`${API}/users/me/password`)
      .set(auth(token))
      .send({ currentPassword: 'wrong', newPassword: 'NewPassword1' })
      .expect(400);

    await request(app)
      .patch(`${API}/users/me/password`)
      .set(auth(token))
      .send({ currentPassword: 'Password1', newPassword: 'NewPassword1' })
      .expect(204);

    await request(app).post(`${API}/auth/login`).send({ email: user.email, password: 'NewPassword1' }).expect(200);
  });
});

describe('general API behaviour', () => {
  it('serves a health check', async () => {
    const res = await request(app).get(`${API}/health`).expect(200);
    expect(res.body.data).toMatchObject({ status: 'ok', version: 'v1', database: 'connected' });
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get(`${API}/does-not-exist`).expect(404);
    expect(res.body.success).toBe(false);
  });

  it('handles malformed JSON bodies', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .set('Content-Type', 'application/json')
      .send('{"email": ')
      .expect(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});
