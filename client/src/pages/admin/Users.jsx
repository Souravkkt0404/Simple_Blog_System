import { adminApi } from '../../api/services';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Avatar from '../../components/Avatar';
import Pagination from '../../components/Pagination';
import Spinner from '../../components/Spinner';
import { formatDate } from '../../utils/format';
import useAdminList from './useAdminList';
import SearchBox from './SearchBox';

export default function Users() {
  const { user: me } = useAuth();
  const { toast } = useNotifications();
  const { data, loading, error, setData, reload, filters, setFilters, setPage } = useAdminList(adminApi.users, { role: '' });

  const run = async (action, successMessage) => {
    try {
      await action();
      toast(successMessage, 'success');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  const update = (u, changes, message) =>
    run(async () => {
      const updated = await adminApi.updateUser(u._id, changes);
      setData((d) => ({ ...d, items: d.items.map((x) => (x._id === u._id ? { ...x, ...updated } : x)) }));
    }, message);

  const remove = (u) => {
    if (!window.confirm(`Delete ${u.name}? Their posts will be soft-deleted and comments removed.`)) return;
    run(async () => {
      await adminApi.deleteUser(u._id);
      reload();
    }, 'User deleted');
  };

  return (
    <>
      <h1>Users</h1>
      <SearchBox placeholder="Search name or email…" onSearch={(search) => setFilters({ search })}>
        <select value={filters.role} onChange={(e) => setFilters({ role: e.target.value })} aria-label="Role filter">
          <option value="">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>
      </SearchBox>

      {loading && <Spinner />}
      {error && <div className="alert alert-error">{error}</div>}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Provider</th>
                <th>Joined</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => {
                const isMe = u._id === me.id;
                return (
                  <tr key={u._id}>
                    <td>
                      <span className="author">
                        <Avatar user={u} size={28} />
                        <span>
                          {u.name} {isMe && <span className="muted">(you)</span>}
                          <br />
                          <small className="muted">{u.email}</small>
                        </span>
                      </span>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        disabled={isMe}
                        onChange={(e) => update(u, { role: e.target.value }, `Role changed to ${e.target.value}`)}
                        aria-label={`Role for ${u.name}`}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`pill ${u.isActive ? 'pill-ok' : 'pill-danger'}`}>{u.isActive ? 'active' : 'inactive'}</span>
                    </td>
                    <td>{u.provider}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td className="row-actions">
                      {!isMe && (
                        <>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => update(u, { isActive: !u.isActive }, u.isActive ? 'User deactivated' : 'User activated')}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(u)}>
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination meta={data.meta} onChange={setPage} />
        </div>
      )}
    </>
  );
}
