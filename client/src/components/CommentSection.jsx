import { useState } from 'react';
import { Link } from 'react-router-dom';
import { commentsApi } from '../api/services';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import useAsync from '../hooks/useAsync';
import Avatar from './Avatar';
import Pagination from './Pagination';
import Spinner from './Spinner';
import { formatDateTime } from '../utils/format';

function CommentItem({ comment, canManage, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [busy, setBusy] = useState(false);
  const { toast } = useNotifications();

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      onUpdated(await commentsApi.update(comment._id, draft));
      setEditing(false);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentsApi.remove(comment._id);
      onDeleted(comment._id);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  return (
    <li className="comment">
      <Avatar user={comment.author} size={32} />
      <div className="comment-body">
        <div className="comment-meta">
          <strong>{comment.author?.name || 'Deleted user'}</strong>
          <span className="muted">
            {formatDateTime(comment.createdAt)}
            {comment.isEdited && ' · edited'}
          </span>
        </div>
        {editing ? (
          <form onSubmit={save} className="comment-edit">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={2000} required />
            <div className="form-actions">
              <button className="btn btn-primary btn-sm" disabled={busy}>
                Save
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="comment-text">{comment.content}</p>
        )}
        {canManage && !editing && (
          <div className="comment-actions">
            <button className="link-btn" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button className="link-btn danger" onClick={remove}>
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function CommentSection({ postId, onCountChange }) {
  const { user, isAdmin } = useAuth();
  const { toast } = useNotifications();
  const [page, setPage] = useState(1);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const { data, loading, error, setData, reload } = useAsync(() => commentsApi.list(postId, { page, limit: 10 }), [postId, page]);

  const submit = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      await commentsApi.create(postId, content);
      setContent('');
      onCountChange(1);
      if (page === 1) reload();
      else setPage(1);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setPosting(false);
    }
  };

  const replaceComment = (updated) =>
    setData((d) => ({ ...d, items: d.items.map((c) => (c._id === updated._id ? updated : c)) }));

  const removeComment = (id) => {
    setData((d) => ({ ...d, items: d.items.filter((c) => c._id !== id) }));
    onCountChange(-1);
  };

  return (
    <section className="comments">
      <h2>Comments {data?.meta ? `(${data.meta.total})` : ''}</h2>

      {user ? (
        <form className="comment-form" onSubmit={submit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts…"
            rows={3}
            maxLength={2000}
            required
          />
          <button className="btn btn-primary" disabled={posting || !content.trim()}>
            {posting ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      ) : (
        <p className="muted">
          <Link to="/login">Log in</Link> to join the conversation.
        </p>
      )}

      {loading && <Spinner label="Loading comments…" />}
      {error && <div className="alert alert-error">{error}</div>}
      {data && (
        <>
          {data.items.length === 0 && <p className="muted">No comments yet. Be the first!</p>}
          <ul className="comment-list">
            {data.items.map((c) => (
              <CommentItem
                key={c._id}
                comment={c}
                canManage={isAdmin || c.author?._id === user?.id}
                onUpdated={replaceComment}
                onDeleted={removeComment}
              />
            ))}
          </ul>
          <Pagination meta={data.meta} onChange={setPage} />
        </>
      )}
    </section>
  );
}
