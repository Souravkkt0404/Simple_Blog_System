const mongoose = require('mongoose');
const { generateUniqueSlug } = require('../utils/slug');

const EXCERPT_LENGTH = 200;

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    content: { type: String, required: true, minlength: 10 },
    // Denormalised so list views never need the full content.
    excerpt: { type: String },
    tags: { type: [String], default: [] },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Denormalised counter, kept in sync by the comment service, so lists don't need N count queries.
    commentCount: { type: Number, default: 0, min: 0 },
    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Supports: public feed (newest first), author's posts, tag filter, and full-text search.
postSchema.index({ isDeleted: 1, createdAt: -1 });
postSchema.index({ author: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ title: 'text', content: 'text' }, { weights: { title: 5, content: 1 } });

// Post -> comments relationship (Comment.post references Post).
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
});

postSchema.pre('validate', async function setSlug(next) {
  try {
    if (this.isNew || this.isModified('title') || !this.slug) {
      this.slug = await generateUniqueSlug(this.constructor, this.title, this._id);
    }
    if (this.isModified('content')) {
      const plain = this.content.replace(/\s+/g, ' ').trim();
      this.excerpt = plain.length > EXCERPT_LENGTH ? `${plain.slice(0, EXCERPT_LENGTH).trimEnd()}…` : plain;
    }
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Soft-delete guard: unless a query explicitly mentions `isDeleted`,
 * deleted posts are invisible to every read/update query.
 */
function excludeDeleted() {
  const filter = this.getFilter();
  if (!Object.prototype.hasOwnProperty.call(filter, 'isDeleted')) {
    this.where({ isDeleted: false });
  }
}

postSchema.pre(['find', 'findOne', 'countDocuments', 'findOneAndUpdate', 'updateOne', 'updateMany'], excludeDeleted);

module.exports = mongoose.model('Post', postSchema);
