import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Avatar from './Avatar';
import { formatDateTime } from '../utils/format';

function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) markAllRead();
  };

  return (
    <div className="dropdown">
      <button className="icon-btn" onClick={toggle} aria-label={`Notifications (${unreadCount} unread)`}>
        🔔{unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>
      {open && (
        <div className="dropdown-menu notifications">
          <strong>Notifications</strong>
          {notifications.length === 0 && <p className="muted">You're all caught up.</p>}
          {notifications.map((n) => (
            <div key={n.id} className="notification-item">
              {n.link ? (
                <Link to={n.link} onClick={() => setOpen(false)}>
                  {n.message}
                </Link>
              ) : (
                <span>{n.message}</span>
              )}
              <small className="muted">{formatDateTime(n.createdAt)}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          ✒️ Inkwell
        </Link>
        <nav className="nav-links">
          <NavLink to="/" end>
            Home
          </NavLink>
          {user && <NavLink to="/my-posts">My posts</NavLink>}
          {user && <NavLink to="/posts/new">Write</NavLink>}
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="nav-user">
          {user ? (
            <>
              <NotificationBell />
              <Link to="/profile" className="author" title="Profile">
                <Avatar user={user} size={30} />
                <span className="hide-sm">{user.name}</span>
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
