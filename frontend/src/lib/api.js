const BASE_URL = import.meta.env.VITE_API_URL || 'http://lokayukta.duckdns.org:5000/api';

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
