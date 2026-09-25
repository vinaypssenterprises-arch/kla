const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const currentHost = window.location.hostname;
      // If accessed over LAN/network IP but env URL uses localhost, replace with current host
      if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
        try {
          const parsed = new URL(envUrl);
          if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
            parsed.hostname = currentHost;
            return parsed.toString().replace(/\/$/, '');
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    }
    return envUrl.replace(/\/$/, '');
  }
  return 'https://lokayukta.duckdns.org/api';
};

export const BASE_URL = getBaseUrl();

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, config);

  // Auto-handle expired/invalid tokens globally
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
    throw new Error('Session expired. Please sign in again.');
  }

  return res;
}
