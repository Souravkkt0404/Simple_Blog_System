import { Link, useNavigate, useParams } from 'react-router-dom';
import { postsApi } from '../api/services';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import useAsync from '../hooks/useAsync';
import Avatar from '../components/Avatar';
import CommentSection from '../components/CommentSection';
import Spinner from '../components/Spinner';
import { formatDate, readingTime } from '../utils/format';

export default function PostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useNotifications();
  const { data: post, loading, error, setData } = useAsync(() => postsApi.get(slug), [slug]);

  if (loading) return <Spinner />;
  if (error) {
    return (
      <div className="container narrow">
        <div className="alert alert-error">{error}</div>
        <Link to="/">← Back to all posts</Link>
      </div>
    );
  }

  const canManage = isAdmin || post.author?._id === user?.id;

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? It can be restored by an admin.')) return;
    try {
      await postsApi.remove(post._id);
      toast('Post deleted', 'success');
      navigate('/my-posts');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  return (
    <div className="container narrow">
      <article className="post-detail">
        <h1>{post.title}</h1>
        <div className="post-meta">
          <span className="author">
            <Avatar user={post.author} size={36} />
            <span>
              <strong>{post.author?.name || 'Deleted user'}</strong>
              <br />
              <span className="muted">
                {formatDate(post.createdAt)} · {readingTime(post.content)}
                {post.updatedAt !== post.createdAt && ` · updated ${formatDate(post.updatedAt)}`}
              </span>
            </span>
          </span>
          {canManage && (
            <span className="post-actions">
              <Link className="btn btn-ghost btn-sm" to={`/posts/${post._id}/edit`}>
                Edit
              </Link>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                Delete
              </button>
            </span>
          )}
        </div>
        {post.tags?.length > 0 && (
          <div className="tags">
            {post.tags.map((t) => (
              <Link key={t} to={`/?tag=${t}`} className="tag">
                #{t}
              </Link>
            ))}
          </div>
        )}
        <div className="post-content">
          {post.content.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </article>

      <CommentSection
        postId={post._id}
        onCountChange={(delta) => setData((p) => ({ ...p, commentCount: p.commentCount + delta }))}
      />
    </div>
  );
}
