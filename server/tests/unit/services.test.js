/**
 * Service-layer unit tests with the Mongoose models mocked out:
 * business rules are verified without a database.
 */
jest.mock('../../src/models/Post', () => ({ findById: jest.fn() }));
jest.mock('../../src/services/notification.service', () => ({
  notifyUser: jest.fn(),
  notifyAdmins: jest.fn(),
  broadcast: jest.fn(),
}));

const mongoose = require('mongoose');
const Post = require('../../src/models/Post');
const notificationService = require('../../src/services/notification.service');
const postService = require('../../src/services/post.service');
const tokenService = require('../../src/services/token.service');

const ownerId = new mongoose.Types.ObjectId().toString();
const postId = new mongoose.Types.ObjectId().toString();

function fakePost(overrides = {}) {
  const post = {
    id: postId,
    title: 'Original',
    slug: 'original',
    author: ownerId,
    save: jest.fn().mockResolvedValue(),
    populate: jest.fn(),
    ...overrides,
  };
  post.populate.mockImplementation(async () => {
    post.author = { _id: ownerId, name: 'Owner' };
    return post;
  });
  return post;
}

beforeEach(() => jest.clearAllMocks());

describe('post.service', () => {
  describe('updatePost', () => {
    it('lets the owner update their post', async () => {
      const post = fakePost();
      Post.findById.mockResolvedValue(post);

      const result = await postService.updatePost(postId, { title: 'New title' }, { id: ownerId, role: 'user' });

      expect(result.title).toBe('New title');
      expect(post.save).toHaveBeenCalled();
      expect(notificationService.notifyUser).not.toHaveBeenCalled();
    });

    it('forbids other regular users', async () => {
      Post.findById.mockResolvedValue(fakePost());
      await expect(
        postService.updatePost(postId, { title: 'Hijack' }, { id: 'intruder', role: 'user' }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('allows admins and notifies the author', async () => {
      Post.findById.mockResolvedValue(fakePost());
      await postService.updatePost(postId, { content: 'Moderated content' }, { id: 'admin-id', role: 'admin' });
      expect(notificationService.notifyUser).toHaveBeenCalledWith(ownerId, expect.objectContaining({ type: 'post:moderated' }));
    });

    it('returns 404 for missing or invalid ids', async () => {
      Post.findById.mockResolvedValue(null);
      await expect(postService.updatePost(postId, {}, { id: ownerId, role: 'user' })).rejects.toMatchObject({ statusCode: 404 });
      await expect(postService.updatePost('not-an-id', {}, { id: ownerId, role: 'user' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('softDeletePost', () => {
    it('flags the post as deleted instead of removing it', async () => {
      const post = fakePost();
      Post.findById.mockResolvedValue(post);

      await postService.softDeletePost(postId, { id: ownerId, role: 'user' });

      expect(post.isDeleted).toBe(true);
      expect(post.deletedAt).toBeInstanceOf(Date);
      expect(post.deletedBy).toBe(ownerId);
      expect(post.save).toHaveBeenCalled();
    });

    it('forbids deleting someone else’s post', async () => {
      Post.findById.mockResolvedValue(fakePost());
      await expect(postService.softDeletePost(postId, { id: 'other', role: 'user' })).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });
});

describe('token.service (access tokens)', () => {
  it('signs and verifies access tokens carrying id and role', () => {
    const token = tokenService.generateAccessToken({ _id: ownerId, role: 'admin' });
    const payload = tokenService.verifyAccessToken(token);
    expect(payload.sub).toBe(ownerId);
    expect(payload.role).toBe('admin');
    expect(payload.exp - payload.iat).toBe(15 * 60);
  });

  it('rejects tampered tokens', () => {
    const token = tokenService.generateAccessToken({ _id: ownerId, role: 'user' });
    expect(() => tokenService.verifyAccessToken(`${token}x`)).toThrow();
  });
});

describe('notification.service', () => {
  const real = jest.requireActual('../../src/services/notification.service');

  afterEach(() => real.detach());

  it('is a no-op without a socket server', () => {
    expect(() => real.notifyUser('u1', { message: 'hi' })).not.toThrow();
  });

  it('emits to user rooms, the admin room and everyone', () => {
    const emit = jest.fn();
    const io = { to: jest.fn(() => ({ emit })), emit: jest.fn() };
    real.attach(io);

    real.notifyUser('u1', { message: 'hi' });
    expect(io.to).toHaveBeenCalledWith('user:u1');
    expect(emit).toHaveBeenCalledWith('notification', expect.objectContaining({ message: 'hi', createdAt: expect.any(String) }));

    real.notifyAdmins({ message: 'admin' });
    expect(io.to).toHaveBeenCalledWith('admins');

    real.broadcast('post:created', { id: 1 });
    expect(io.emit).toHaveBeenCalledWith('post:created', { id: 1 });
  });
});
