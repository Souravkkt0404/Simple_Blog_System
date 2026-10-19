import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import SocialLogin from '../components/SocialLogin';
import Spinner from '../components/Spinner';

const OAUTH_ERRORS = {
  provider_not_configured: 'That login provider is not configured on the server.',
  oauth_failed: 'Social login failed or was cancelled.',
  account_disabled: 'This account has been deactivated.',
  oauth_email_required: 'Your social account did not share an email address.',
  session_failed: 'Could not complete social login. Please try again.',
};

function AuthCard({ title, children, footer }) {
  return (
    <div className="container auth-container">
      <div className="card auth-card">
        <h1>{title}</h1>
        {children}
        <SocialLogin />
        <p className="auth-footer muted">{footer}</p>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(OAUTH_ERRORS[params.get('error')] || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Welcome back" footer={<>New here? <Link to="/register">Create an account</Link></>}>
      <form className="form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Email
          <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </label>
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthCard>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  return (
    <AuthCard title="Create your account" footer={<>Already have an account? <Link to="/login">Log in</Link></>}>
      <form className="form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Name
          <input autoComplete="name" minLength={2} maxLength={50} required {...field('name')} />
        </label>
        <label>
          Email
          <input type="email" autoComplete="email" required {...field('email')} />
        </label>
        <label>
          Password
          <input type="password" autoComplete="new-password" minLength={8} required {...field('password')} />
          <small className="muted">At least 8 characters with upper-case, lower-case and a number.</small>
        </label>
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
    </AuthCard>
  );
}

/** Landing page after Google/Facebook login: the refresh cookie is set, exchange it for a session. */
export function OAuthCallback() {
  const { restoreSession } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    restoreSession().then((ok) => navigate(ok ? '/' : '/login?error=session_failed', { replace: true }));
  }, [restoreSession, navigate]);

  return <Spinner label="Completing sign in…" />;
}
