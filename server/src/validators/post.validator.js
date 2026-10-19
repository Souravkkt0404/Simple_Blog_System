const Joi = require('joi');
const { idParam, paginationQuery } = require('./common.validator');

const title = () => Joi.string().trim().min(3).max(150);
const content = () => Joi.string().trim().min(10).max(50000);
const tags = () => Joi.array().items(Joi.string().trim().lowercase().min(1).max(30)).max(10).unique();

const listPosts = {
  query: Joi.object({
    ...paginationQuery,
    search: Joi.string().trim().max(100).allow(''),
    author: Joi.string().trim().hex().length(24),
    tag: Joi.string().trim().max(30),
    sort: Joi.string().valid('newest', 'oldest', 'popular').default('newest'),
  }),
};

const getPost = {
  params: Joi.object({ idOrSlug: Joi.string().trim().max(120).required() }),
};

const createPost = {
  body: Joi.object({ title: title().required(), content: content().required(), tags: tags() }),
};

const updatePost = {
  params: idParam,
  body: Joi.object({ title: title(), content: content(), tags: tags() }).min(1),
};

const postId = { params: idParam };

module.exports = { listPosts, getPost, createPost, updatePost, postId };
