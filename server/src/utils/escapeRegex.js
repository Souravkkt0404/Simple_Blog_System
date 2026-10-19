/**
 * Escapes user input so it can be safely embedded in a RegExp / $regex query.
 */
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = escapeRegex;
