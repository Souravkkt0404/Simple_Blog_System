import { useState } from 'react';
import { usersApi } from '../api/services';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Avatar from '../components/Avatar';
import { formatDate } from '../utils/format';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { toast } = useNotifications();
  const [profile, setProfile] = useState({ name: user.name, avatar: user.avatar || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      setUser(await usersApi.updateMe(profile));
      toast('Profile updated', 'success');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    try {
      await usersApi.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      toast('Password changed. Other sessions were signed out.', 'success');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  return (
    <div className="container narrow">
      <div className="profile-header">
        <Avatar user={user} size={64} />
        <div>
          <h1>{user.name}</h1>
          <p className="muted">
            {user.email} · <span className={`pill pill-${user.role}`}>{user.role}</span> · joined {formatDate(user.createdAt)}
            {user.provider !== 'local' && ` · via ${user.provider}`}
          </p>
        </div>
      </div>

      <form className="card form" onSubmit={saveProfile}>
        <h2>Profile</h2>
        <label>
          Name
          <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} minLength={2} required />
        </label>
        <label>
          Avatar URL
          <input type="url" value={profile.avatar} onChange={(e) => setProfile({ ...profile, avatar: e.target.value })} placeholder="https://…" />
        </label>
        <div className="form-actions">
          <button className="btn btn-primary">Save profile</button>
        </div>
      </form>

      <form className="card form" onSubmit={savePassword}>
        <h2>{user.provider === 'local' ? 'Change password' : 'Set a password'}</h2>
        {user.provider === 'local' && (
          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              required
            />
          </label>
        )}
        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            required
          />
        </label>
        <div className="form-actions">
          <button className="btn btn-primary">Update password</button>
        </div>
      </form>
    </div>
  );
}
