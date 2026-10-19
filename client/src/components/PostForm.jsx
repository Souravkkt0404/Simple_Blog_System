import { useState } from 'react';
import { getErrorMessage } from '../api/client';

const toTagList = (value) =>
  [...new Set(value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 10);

export default function PostForm({ initialValues, submitLabel, onSubmit }) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [content, setContent] = useState(initialValues?.content || '');
  const [tags, setTags] = useState((initialValues?.tags || []).join(', '));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), content: content.trim(), tags: toTagList(tags) });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form className="card form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} maxLength={150} required />
      </label>
      <label>
        Content
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={14} minLength={10} required />
      </label>
      <label>
        Tags <span className="muted">(comma separated, optional)</span>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="react, node, mongodb" />
      </label>
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
