import { Link } from 'react-router-dom';
import { adminApi } from '../../api/services';
import useAsync from '../../hooks/useAsync';
import Spinner from '../../components/Spinner';
import { formatDateTime } from '../../utils/format';

function StatCard({ label, value, hint, to }) {
  return (
    <Link to={to} className="card stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value.toLocaleString()}</span>
      {hint && <span className="muted stat-hint">{hint}</span>}
    </Link>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(() => adminApi.stats(), []);

  if (loading) return <Spinner />;
  if (error) return <div className="alert alert-error">{error}</div>;

  const { totals, users, posts, recentActivity } = data;

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn btn-ghost btn-sm" onClick={reload}>
          ↻ Refresh
        </button>
      </div>
      <div className="stat-grid">
        <StatCard label="Total users" value={totals.users} hint={`${users.admins} admin · ${users.inactive} inactive`} to="/admin/users" />
        <StatCard label="Total posts" value={totals.posts} hint={`${posts.deleted} soft-deleted`} to="/admin/posts" />
        <StatCard label="Total comments" value={totals.comments} to="/admin/comments" />
      </div>

      <div className="card">
        <div className="page-header">
          <h2>Recent activity</h2>
          <Link to="/admin/activity">View all →</Link>
        </div>
        {recentActivity.length === 0 ? (
          <p className="muted">No activity yet.</p>
        ) : (
          <ul className="activity-list">
            {recentActivity.map((a) => (
              <li key={a._id}>
                <span className="pill">{a.action}</span>
                <span>{a.user?.name || 'Anonymous'}</span>
                <span className="muted">{formatDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
