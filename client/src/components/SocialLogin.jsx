import { authApi } from '../api/services';
import useAsync from '../hooks/useAsync';

const PROVIDERS = [
  { key: 'google', label: 'Continue with Google', className: 'btn-google' },
  { key: 'facebook', label: 'Continue with Facebook', className: 'btn-facebook' },
];

/**
 * OAuth buttons are plain links: the browser leaves the SPA, authenticates with
 * the provider and comes back to /oauth/callback with a refresh cookie set.
 */
export default function SocialLogin() {
  const { data: enabled } = useAsync(() => authApi.providers(), []);

  return (
    <div className="social-login">
      <div className="divider">
        <span>or</span>
      </div>
      {PROVIDERS.map((p) => {
        const available = enabled?.[p.key];
        return (
          <a
            key={p.key}
            href={available ? authApi.oauthUrl(p.key) : undefined}
            className={`btn btn-block ${p.className} ${available ? '' : 'disabled'}`}
            aria-disabled={!available}
            title={available ? undefined : 'Not configured on the server'}
          >
            {p.label}
          </a>
        );
      })}
    </div>
  );
}
