const crypto = require('crypto');
const slugify = require('slugify');

const MAX_BASE_LENGTH = 80;

function toSlug(text) {
  const base = slugify(String(text || ''), { lower: true, strict: true, trim: true }).slice(0, MAX_BASE_LENGTH);
  return base.replace(/-+$/g, '') || 'post';
}

const randomSuffix = () => crypto.randomBytes(3).toString('hex');

/**
 * Returns a URL-friendly slug that is unique within `Model`.
 * Uses the clean slug when free, otherwise appends a short random suffix.
 * Soft-deleted documents are included in the check because the unique
 * index covers them too.
 */
async function generateUniqueSlug(Model, text, excludeId) {
  const base = toSlug(text);
  const taken = (slug) => {
    const query = { slug, isDeleted: { $in: [true, false] } };
    if (excludeId) query._id = { $ne: excludeId };
    return Model.exists(query);
  };

  if (!(await taken(base))) return base;

  for (let i = 0; i < 5; i += 1) {
    const candidate = `${base}-${randomSuffix()}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await taken(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

module.exports = { toSlug, generateUniqueSlug };
