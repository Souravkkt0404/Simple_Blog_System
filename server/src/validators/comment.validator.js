const Joi = require('joi');
const { objectId, idParam, paginationQuery } = require('./common.validator');

const content = () => Joi.string().trim().min(1).max(2000);
const postIdParam = Joi.object({ postId: objectId().required() });

const listComments = {
  params: postIdParam,
  query: Joi.object({ ...paginationQuery }),
};

const createComment = {
  params: postIdParam,
  body: Joi.object({ content: content().required() }),
};

const updateComment = {
  params: idParam,
  body: Joi.object({ content: content().required() }),
};

const commentId = { params: idParam };

module.exports = { listComments, createComment, updateComment, commentId };
