const request = require('supertest');
const { User, Post } = require('../../src/models');
const tokenService = require('../../src/services/token.service');

const API = '/api/v1';
let counter = 0;

async function createUser(overrides = {}) {
  counter += 1;
  const user = await User.create({
    name: `User ${counter}`,
    email: `user${counter}@test.com`,
    password: 'Password1',
    ...overrides,
  });
  return { user, token: tokenService.generateAccessToken(user) };
}

const createAdmin = (overrides = {}) => createUser({ role: 'admin', ...overrides });

function createPost(author, overrides = {}) {
  return Post.create({
    title: 'A Sample Post Title',
    content: 'This is the body of a sample post used in tests.',
    author: author._id,
    ...overrides,
  });
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

/** Extracts the refresh cookie ("refreshToken=...") from a supertest response. */
function refreshCookie(res) {
  const cookies = res.headers['set-cookie'] || [];
  return cookies.find((c) => c.startsWith('refreshToken='))?.split(';')[0];
}

module.exports = { API, createUser, createAdmin, createPost, auth, refreshCookie, request };
