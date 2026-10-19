import { Link } from 'react-router-dom';
import { adminApi, postsApi } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import { useNotifications } from '../../context/NotificationContext';
import Pagination from '../../components/Pagination';
import Spinner from '../../components/Spinner';
import { formatDate } from '../../utils/format';
import useAdminList from './useAdminList';
import SearchBox from './SearchBox';

export default function Posts() {
  const { toast } = useNotifications();
  const { data, loading, error, reload, filters, setFilters, setPage } = useAdminList(adminApi.posts, { status: 'all' });

  const run = async (action, message) => {
    try {
      await action();
      toast(message, 'success');
      reload();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  const remove = (post) => {
    if (window.confirm(`Soft-delete "${post.title}"?`)) run(() => postsApi.remove(post._id), 'Post deleted');
  };

  return (
    <>
      <h1>Posts</h1>
      <SearchBox placeholder="Search posts…" onSearch={(search) => setFilters({ search })}>
        <select value={filters.status} onChange={(e) => setFilters({ status: e.target.value })} aria-label="Status filter">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="deleted">Deleted</option>
        </select>
      </SearchBox>

      {loading && <Spinner />}
      {error && <div className="alert alert-error">{error}</div>}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Comments</th>
                <th>Created</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p._id} className={p.isDeleted ? 'row-deleted' : ''}>
                  <td>{p.isDeleted ? p.title : <Link to={`/posts/${p.slug}`}>{p.title}</Link>}</td>
                  <td>{p.author?.name || '—'}</td>
                  <td>{p.commentCount}</td>
                  <td>{formatDate(p.createdAt)}</td>
                  <td>
                    {p.isDeleted ? (
                      <span className="pill pill-danger" title={`Deleted ${formatDate(p.deletedAt)} by ${p.deletedBy?.name || 'unknown'}`}>
                        deleted
                      </span>
                    ) : (
                      <span className="pill pill-ok">active</span>
                    )}
                  </td>
                  <td className="row-actions">
                    {p.isDeleted ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => run(() => adminApi.restorePost(p._id), 'Post restored')}>
                        Restore
                      </button>
                    ) : (
                      <>
                        <Link className="btn btn-ghost btn-sm" to={`/posts/${p._id}/edit`}>
                          Edit
                        </Link>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={data.meta} onChange={setPage} />
        </div>
      )}
    </>
  );
}
