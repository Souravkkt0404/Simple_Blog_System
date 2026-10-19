const asyncHandler = require('../utils/asyncHandler');
const { ok, noContent } = require('../utils/apiResponse');
const userService = require('../services/user.service');

const me = asyncHandler(async (req, res) => {
  ok(res, await userService.getProfile(req.user.id));
});

const updateMe = asyncHandler(async (req, res) => {
  ok(res, await userService.updateProfile(req.user.id, req.body), undefined, 'Profile updated');
});

const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user.id, req.body);
  noContent(res);
});

module.exports = { me, updateMe, changePassword };
