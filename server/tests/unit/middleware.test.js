const express = require('express');
const request = require('supertest');
const Joi = require('joi');
const mongoose = require('mongoose');

const { authorize, requirePermission } = require('../../src/middleware/authorize');
const validate = require('../../src/middleware/validate');
const { createRateLimiter } = require('../../src/middleware/rateLimiter');
const { errorHandler, normalizeError } = require('../../src/middleware/errorHandler');
const notFound = require('../../src/middleware/notFound');
const ApiError = require('../../src/utils/ApiError');
const { PERMISSIONS } = require('../../src/config/roles');

jest.mock('../../src/services/activity.service', () => ({
  ACTIONS: { LOGIN: 'LOGIN' },
  record: jest.fn().mockResolvedValue({}),
}));
const activityService = require('../../src/services/activity.service');
const logActivity = require('../../src/middleware/activityLogger');

const run = (mw, req = {}) =>
  new Promise((resolve) => {
    mw(req, {}, (err) => resolve(err));
  });

describe('authorize middleware', () => {
  it('rejects unauthenticated requests with 401', async () => {
    expect((await run(authorize('admin'), {})).statusCode).toBe(401);
  });

  it('rejects users without the role with 403', async () => {
    expect((await run(authorize('admin'), { user: { role: 'user' } })).statusCode).toBe(403);
  });

  it('allows users with the role', async () => {
    expect(await run(authorize('admin', 'user'), { user: { role: 'user' } })).toBeUndefined();
  });
});

describe('requirePermission middleware', () => {
  it('allows a role holding the permission', async () => {
    expect(await run(requirePermission(PERMISSIONS.POST_CREATE), { user: { role: 'user' } })).toBeUndefined();
  });

  it('rejects and lists missing permissions', async () => {
    const err = await run(requirePermission(PERMISSIONS.USER_MANAGE), { user: { role: 'user' } });
    expect(err.statusCode).toBe(403);
    expect(err.details.missing).toEqual([PERMISSIONS.USER_MANAGE]);
  });

  it('rejects unauthenticated requests', async () => {
    expect((await run(requirePermission(PERMISSIONS.POST_CREATE), {})).statusCode).toBe(401);
  });
});

describe('validate middleware', () => {
  const schemas = {
    body: Joi.object({ title: Joi.string().trim().min(3).required() }),
    query: Joi.object({ page: Joi.number().default(1) }),
  };

  it('replaces request parts with sanitised values', async () => {
    const req = { body: { title: '  Hello  ', extra: 'drop me' }, query: {} };
    expect(await run(validate(schemas), req)).toBeUndefined();
    expect(req.body).toEqual({ title: 'Hello' });
    expect(req.query).toEqual({ page: 1 });
  });

  it('returns a 422 with field-level details', async () => {
    const err = await run(validate(schemas), { body: {}, query: { page: 'x' } });
    expect(err.statusCode).toBe(422);
    expect(err.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ location: 'body', field: 'title' }),
        expect.objectContaining({ location: 'query', field: 'page' }),
      ]),
    );
  });
});

describe('errorHandler', () => {
  it('normalises Mongoose validation, cast and duplicate key errors', () => {
    const validationErr = new mongoose.Error.ValidationError();
    validationErr.addError('title', new mongoose.Error.ValidatorError({ path: 'title', message: 'required' }));
    expect(normalizeError(validationErr)).toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });

    const castErr = new mongoose.Error.CastError('ObjectId', 'bad', '_id');
    expect(normalizeError(castErr)).toMatchObject({ statusCode: 400, code: 'INVALID_ID' });

    expect(normalizeError({ code: 11000, keyValue: { email: 'a' } })).toMatchObject({
      statusCode: 409,
      details: { field: 'email' },
    });
    expect(normalizeError({ name: 'TokenExpiredError' }).statusCode).toBe(401);
    expect(normalizeError({ type: 'entity.parse.failed', status: 400 }).code).toBe('INVALID_JSON');
  });

  it('hides internals of unexpected errors', () => {
    const err = normalizeError(new Error('db password is hunter2'));
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe('Internal server error');
    expect(err.isOperational).toBe(false);
  });

  it('sends the consistent error envelope', async () => {
    const app = express();
    app.get('/boom', (_req, _res, next) => next(ApiError.badRequest('Nope', { details: { a: 1 } })));
    app.use(notFound);
    app.use(errorHandler);

    const res = await request(app).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: { code: 'BAD_REQUEST', message: 'Nope', details: { a: 1 } } });

    const missing = await request(app).get('/nowhere');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });
});

describe('rate limiter', () => {
  it('returns 429 in the standard error format once the limit is exceeded', async () => {
    const app = express();
    app.post('/login', createRateLimiter({ windowMs: 60000, max: 2 }), (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);

    await request(app).post('/login').expect(200);
    await request(app).post('/login').expect(200);
    const res = await request(app).post('/login');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(res.headers).toHaveProperty('ratelimit');
  });
});

describe('activity logger', () => {
  beforeEach(() => activityService.record.mockClear());

  const buildApp = (status) => {
    const app = express();
    app.post(
      '/action',
      (req, _res, next) => {
        req.user = { id: 'user-1' };
        next();
      },
      logActivity('LOGIN'),
      (_req, res) => {
        res.locals.activityMeta = { foo: 'bar' };
        res.status(status).json({});
      },
    );
    return app;
  };

  it('records successful requests after the response is sent', async () => {
    await request(buildApp(200)).post('/action').expect(200);
    await new Promise((r) => setImmediate(r));
    expect(activityService.record).toHaveBeenCalledWith(
      expect.objectContaining({ user: 'user-1', action: 'LOGIN', method: 'POST', metadata: { foo: 'bar' } }),
    );
  });

  it('does not record failed requests', async () => {
    await request(buildApp(400)).post('/action').expect(400);
    await new Promise((r) => setImmediate(r));
    expect(activityService.record).not.toHaveBeenCalled();
  });
});
