const createApp = require('../../src/app');
const db = require('../helpers/db');
const { API, request, createUser, auth, refreshCookie } = require('../helpers/factory');
const { User, RefreshToken, ActivityLog } = require('../../src/models');
const authService = require('../../src/services/auth.service');

const app = createApp();
const waitForLogs = () => new Promise((r) => setTimeout(r, 50));

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const validUser = { name: 'Jane Doe', email: 'Jane@Example.com', password: 'Password1' };

describe('POST /auth/register', () => {
  it('creates a user, hashes the password and starts a session', async () => {
    const res = await request(app).post(`${API}/auth/register`).send(validUser).expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ name: 'Jane Doe', email: 'jane@example.com', role: 'user' });
    expect(res.body.data.user.password).toBeUndefined();

    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/refreshToken=/);
    expect(cookie).toMatch(/HttpOnly/i);

    const stored = await User.findOne({ email: 'jane@example.com' }).select('+password');
    expect(stored.password).not.toBe('Password1');
    expect(stored.password).toMatch(/^\$2[aby]\$/);
  });

  it('ignores a client-supplied role (no privilege escalation)', async () => {
    await request(app).post(`${API}/auth/register`).send({ ...validUser, role: 'admin' }).expect(201);
    expect((await User.findOne({ email: 'jane@example.com' })).role).toBe('user');
  });

  it('rejects weak passwords and invalid emails with 422', async () => {
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({ name: 'J', email: 'nope', password: 'short' })
      .expect(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['email', 'name', 'password']);
  });

  it('rejects duplicate emails with 409', async () => {
    await request(app).post(`${API}/auth/register`).send(validUser).expect(201);
    const res = await request(app).post(`${API}/auth/register`).send(validUser).expect(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });
});

describe('POST /auth/login', () => {
  it('logs in with valid credentials and records the activity', async () => {
    const { user } = await createUser({ email: 'login@test.com' });
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'login@test.com', password: 'Password1' })
      .expect(200);

    expect(res.body.data.user.id).toBe(user.id);
    await waitForLogs();
    expect(await ActivityLog.countDocuments({ action: 'LOGIN', user: user._id })).toBe(1);
  });

  it('returns the same 401 for wrong password and unknown email', async () => {
    await createUser({ email: 'login@test.com' });
    const wrong = await request(app).post(`${API}/auth/login`).send({ email: 'login@test.com', password: 'Wrong1234' });
    const unknown = await request(app).post(`${API}/auth/login`).send({ email: 'ghost@test.com', password: 'Wrong1234' });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toEqual(unknown.body.error);
  });

  it('blocks deactivated accounts', async () => {
    await createUser({ email: 'off@test.com', isActive: false });
    const res = await request(app).post(`${API}/auth/login`).send({ email: 'off@test.com', password: 'Password1' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
  });
});

describe('refresh token rotation', () => {
  async function loginCookie() {
    await createUser({ email: 'rt@test.com' });
    const res = await request(app).post(`${API}/auth/login`).send({ email: 'rt@test.com', password: 'Password1' });
    return refreshCookie(res);
  }

  it('issues a new access token and rotates the refresh token', async () => {
    const cookie = await loginCookie();
    const res = await request(app).post(`${API}/auth/refresh`).set('Cookie', cookie).expect(200);

    expect(res.body.data.accessToken).toEqual(expect.any(String));
    const newCookie = refreshCookie(res);
    expect(newCookie).toBeDefined();
    expect(newCookie).not.toBe(cookie);

    await request(app).post(`${API}/auth/refresh`).set('Cookie', newCookie).expect(200);
  });

  it('detects reuse of a rotated token and revokes every session', async () => {
    const cookie = await loginCookie();
    const first = await request(app).post(`${API}/auth/refresh`).set('Cookie', cookie).expect(200);
    const rotated = refreshCookie(first);

    const reuse = await request(app).post(`${API}/auth/refresh`).set('Cookie', cookie).expect(401);
    expect(reuse.body.error.code).toBe('REFRESH_TOKEN_REUSED');

    // The legitimately rotated token is now revoked too.
    await request(app).post(`${API}/auth/refresh`).set('Cookie', rotated).expect(401);
    expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(0);
  });

  it('rejects missing or forged refresh tokens', async () => {
    await request(app).post(`${API}/auth/refresh`).expect(401);
    await request(app).post(`${API}/auth/refresh`).set('Cookie', 'refreshToken=forged.token.value').expect(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the refresh token and clears the cookie', async () => {
    await createUser({ email: 'out@test.com' });
    const login = await request(app).post(`${API}/auth/login`).send({ email: 'out@test.com', password: 'Password1' });
    const cookie = refreshCookie(login);

    const res = await request(app).post(`${API}/auth/logout`).set('Cookie', cookie).expect(204);
    expect(res.headers['set-cookie'].join(';')).toMatch(/refreshToken=;/);

    await request(app).post(`${API}/auth/refresh`).set('Cookie', cookie).expect(401);
  });

  it('succeeds even without a cookie', async () => {
    await request(app).post(`${API}/auth/logout`).expect(204);
  });
});

describe('access token validation', () => {
  it('rejects missing, malformed and invalid tokens', async () => {
    const missing = await request(app).get(`${API}/users/me`).expect(401);
    expect(missing.body).toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    await request(app).get(`${API}/users/me`).set('Authorization', 'Token abc').expect(401);
    const invalid = await request(app).get(`${API}/users/me`).set(auth('not.a.jwt')).expect(401);
    expect(invalid.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects tokens of users that were deleted or deactivated', async () => {
    const { user, token } = await createUser();
    await request(app).get(`${API}/users/me`).set(auth(token)).expect(200);
    await User.updateOne({ _id: user._id }, { isActive: false });
    await request(app).get(`${API}/users/me`).set(auth(token)).expect(401);
  });
});

describe('OAuth', () => {
  it('reports which providers are enabled', async () => {
    const res = await request(app).get(`${API}/auth/providers`).expect(200);
    expect(res.body.data).toEqual({ google: false, facebook: false });
  });

  it('redirects to the client when a provider is not configured', async () => {
    const res = await request(app).get(`${API}/auth/google`).expect(302);
    expect(res.headers.location).toBe('http://localhost:5173/login?error=provider_not_configured');
  });

  describe('findOrCreateOAuthUser', () => {
    const profile = {
      id: 'g-123',
      displayName: 'Google User',
      emails: [{ value: 'G@Mail.com' }],
      photos: [{ value: 'http://img/a.png' }],
    };

    it('creates a new user on first login and reuses it afterwards', async () => {
      const first = await authService.findOrCreateOAuthUser('google', profile);
      const second = await authService.findOrCreateOAuthUser('google', profile);
      expect(first.id).toBe(second.id);
      expect(first).toMatchObject({ email: 'g@mail.com', provider: 'google', googleId: 'g-123' });
      expect(await User.countDocuments()).toBe(1);
    });

    it('links the provider to an existing account with the same email', async () => {
      const { user } = await createUser({ email: 'g@mail.com' });
      const linked = await authService.findOrCreateOAuthUser('facebook', { ...profile, id: 'fb-9' });
      expect(linked.id).toBe(user.id);
      expect(linked.facebookId).toBe('fb-9');
    });

    it('requires an email address', async () => {
      await expect(authService.findOrCreateOAuthUser('facebook', { id: 'x', displayName: 'No Email' })).rejects.toMatchObject({
        code: 'OAUTH_EMAIL_REQUIRED',
      });
    });
  });
});
