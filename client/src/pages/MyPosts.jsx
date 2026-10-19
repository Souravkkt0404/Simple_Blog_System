import { useState } from 'react';
import { Link } from 'react-router-dom';
import { postsApi } from '../api/services';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import useAsync from '../hooks/useAsync';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';

export default function MyPosts() {
  const { user } = useAuth();
  const { toast } = useNotifications();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => postsApi.list({ author: user.id, page, limit: 10 }), [user.id, page]);

  const remove = async (post) => {
    if (!window.confirm(`Delete "${post.title}"?`)) return;
    try {
      await postsApi.remove(post._id);
      toast('Post deleted', 'success');
      reload();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>My posts</h1>
        <Link to="/posts/new" className="btn btn-primary">
          + New post
        </Link>
      </div>
      {loading && <Spinner />}
      {error && <div className="alert alert-error">{error}</div>}
      {data && (
        <>
          {data.items.length === 0 && (
            <p className="empty">
              You haven&apos;t written anything yet. <Link to="/posts/new">Write your first post</Link>.
            </p>
          )}
          <div className="post-list">
            {data.items.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                actions={
                  <>
                    <Link className="btn btn-ghost btn-sm" to={`/posts/${post._id}/edit`}>
                      Edit
                    </Link>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(post)}>
                      Delete
                    </button>
                  </>
                }
              />
            ))}
          </div>
          <Pagination meta={data.meta} onChange={setPage} />
        </>
      )}
    </div>
  );
}
