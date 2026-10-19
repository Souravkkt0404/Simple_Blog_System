const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function getPagination({ page, limit } = {}) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || DEFAULT_LIMIT));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

function buildPaginationMeta({ page, limit, total }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Runs the page query and the count in parallel (one round-trip each, concurrently).
 */
async function paginate(model, filter, { page, limit, sort = { createdAt: -1 }, select, populate } = {}) {
  const p = getPagination({ page, limit });
  let query = model.find(filter).sort(sort).skip(p.skip).limit(p.limit);
  if (select) query = query.select(select);
  if (populate) query = query.populate(populate);

  const [items, total] = await Promise.all([query.lean(), model.countDocuments(filter)]);
  return { items, meta: buildPaginationMeta({ page: p.page, limit: p.limit, total }) };
}

module.exports = { getPagination, buildPaginationMeta, paginate, DEFAULT_LIMIT, MAX_LIMIT };
