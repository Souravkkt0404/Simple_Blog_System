import { adminApi } from '../../api/services';
import Pagination from '../../components/Pagination';
import Spinner from '../../components/Spinner';
import { formatDateTime } from '../../utils/format';
import useAdminList from './useAdminList';

const ACTIONS = [
  'REGISTER', 'LOGIN', 'LOGIN_OAUTH', 'LOGOUT', 'POST_CREATE', 'POST_UPDATE', 'POST_DELETE', 'POST_RESTORE',
  'COMMENT_CREATE', 'COMMENT_UPDATE', 'COMMENT_DELETE', 'USER_UPDATE', 'USER_DELETE', 'PASSWORD_CHANGE',
];

export default function Activity() {
  const { data, loading, error, filters, setFilters, setPage } = useAdminList(adminApi.activity, { action: '' });

  return (
    <>
      <div className="page-header">
        <h1>Activity log</h1>
        <select value={filters.action} onChange={(e) => setFilters({ action: e.target.value })} aria-label="Action filter">
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {loading && <Spinner />}
      {error && <div className="alert alert-error">{error}</div>}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>User</th>
                <th>Request</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a._id}>
                  <td>{formatDateTime(a.createdAt)}</td>
                  <td>
                    <span className="pill">{a.action}</span>
                  </td>
                  <td>{a.user ? `${a.user.name} (${a.user.email})` : <span className="muted">—</span>}</td>
                  <td>
                    <code>
                      {a.method} {a.path}
                    </code>
                    <br />
                    <small className="muted">{a.ip}</small>
                  </td>
                  <td className="cell-wrap">
                    <small>{Object.keys(a.metadata || {}).length ? JSON.stringify(a.metadata) : '—'}</small>
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
