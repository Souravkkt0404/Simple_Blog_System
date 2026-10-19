import { Link } from 'react-router-dom';
import { adminApi, commentsApi } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import { useNotifications } from '../../context/NotificationContext';
import Pagination from '../../components/Pagination';
import Spinner from '../../components/Spinner';
import { formatDateTime } from '../../utils/format';
import useAdminList from './useAdminList';
import SearchBox from './SearchBox';

export default function Comments() {
  const { toast } = useNotifications();
  const { data, loading, error, reload, setFilters, setPage } = useAdminList(adminApi.comments);

  const remove = async (c) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentsApi.remove(c._id);
      toast('Comment deleted', 'success');
      reload();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  return (
    <>
      <h1>Comments</h1>
      <SearchBox placeholder="Search comment text…" onSearch={(search) => setFilters({ search })} />

      {loading && <Spinner />}
      {error && <div className="alert alert-error">{error}</div>}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Comment</th>
                <th>Author</th>
                <th>Post</th>
                <th>Date</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c._id}>
                  <td className="cell-wrap">{c.content}</td>
                  <td>{c.author?.name || '—'}</td>
                  <td>
                    {c.post && !c.post.isDeleted ? (
                      <Link to={`/posts/${c.post.slug}`}>{c.post.title}</Link>
                    ) : (
                      <span className="muted">{c.post?.title || '—'} (deleted)</span>
                    )}
                  </td>
                  <td>{formatDateTime(c.createdAt)}</td>
                  <td className="row-actions">
                    <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>
                      Delete
                    </button>
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
