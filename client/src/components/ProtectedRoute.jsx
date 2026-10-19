import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

/**
 * Guards nested routes. `roles` optionally restricts access by role.
 * (UX only — the API enforces the same rules server-side.)
 */
export default function ProtectedRoute({ roles }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Only for guests (login/register); signed-in users are sent home. */
export function GuestRoute() {
  const { user, initializing } = useAuth();
  if (initializing) return <Spinner />;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}
