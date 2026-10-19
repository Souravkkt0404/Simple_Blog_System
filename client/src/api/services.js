import api, { API_BASE } from './client';

const data = (res) => res.data.data;
const page = (res) => ({ items: res.data.data, meta: res.data.meta });

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then(data),
  login: (payload) => api.post('/auth/login', payload).then(data),
  logout: () => api.post('/auth/logout'),
  providers: () => api.get('/auth/providers').then(data),
  oauthUrl: (provider) => `${API_BASE}/auth/${provider}`,
};

export const usersApi = {
  me: () => api.get('/users/me').then(data),
  updateMe: (payload) => api.patch('/users/me', payload).then(data),
  changePassword: (payload) => api.patch('/users/me/password', payload),
};

export const postsApi = {
  list: (params) => api.get('/posts', { params }).then(page),
  get: (idOrSlug) => api.get(`/posts/${encodeURIComponent(idOrSlug)}`).then(data),
  create: (payload) => api.post('/posts', payload).then(data),
  update: (id, payload) => api.patch(`/posts/${id}`, payload).then(data),
  remove: (id) => api.delete(`/posts/${id}`),
};

export const commentsApi = {
  list: (postId, params) => api.get(`/posts/${postId}/comments`, { params }).then(page),
  create: (postId, content) => api.post(`/posts/${postId}/comments`, { content }).then(data),
  update: (id, content) => api.patch(`/comments/${id}`, { content }).then(data),
  remove: (id) => api.delete(`/comments/${id}`),
};

export const adminApi = {
  stats: () => api.get('/admin/stats').then(data),
  users: (params) => api.get('/admin/users', { params }).then(page),
  updateUser: (id, payload) => api.patch(`/admin/users/${id}`, payload).then(data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  posts: (params) => api.get('/admin/posts', { params }).then(page),
  restorePost: (id) => api.patch(`/admin/posts/${id}/restore`).then(data),
  comments: (params) => api.get('/admin/comments', { params }).then(page),
  activity: (params) => api.get('/admin/activity', { params }).then(page),
};
