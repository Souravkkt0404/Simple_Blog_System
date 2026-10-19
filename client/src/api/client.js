import axios from 'axios';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';
export const API_BASE = `${API_ORIGIN}/api/v1`;

// The access token lives only in memory; the refresh token is an httpOnly cookie.
let accessToken = null;
let onSessionExpired = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

const api = axios.create({ baseURL: API_BASE, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// One shared refresh request: concurrent 401s (or React StrictMode double effects)
// must not present the same single-use refresh token twice.
let refreshPromise = null;

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE}/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        return res.data.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const code = error.response?.data?.error?.code;

    if (error.response?.status === 401 && code === 'TOKEN_EXPIRED' && !original._retried) {
      original._retried = true;
      try {
        await refreshSession();
        return api(original);
      } catch (refreshError) {
        setAccessToken(null);
        onSessionExpired();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

/** Human-readable message from the API's error envelope. */
export function getErrorMessage(error, fallback = 'Something went wrong') {
  const apiError = error?.response?.data?.error;
  if (apiError?.details && Array.isArray(apiError.details) && apiError.details.length) {
    return apiError.details.map((d) => d.message).join('. ');
  }
  return apiError?.message || error?.message || fallback;
}

export default api;
