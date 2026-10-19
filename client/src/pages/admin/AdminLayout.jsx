import { NavLink, Outlet } from 'react-router-dom';

const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/posts', label: 'Posts' },
  { to: '/admin/comments', label: 'Comments' },
  { to: '/admin/activity', label: 'Activity log' },
];

export default function AdminLayout() {
  return (
    <div className="container admin-layout">
      <aside className="admin-sidebar">
        <h3>Admin panel</h3>
        <nav>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="admin-content">
        <Outlet />
      </section>
    </div>
  );
}
