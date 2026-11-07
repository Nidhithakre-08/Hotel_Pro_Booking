const API = '/api';
export const TOKEN_KEYS = { guest: 'hotelpro_token', admin: 'hotelpro_admin_token' };

// kind: 'guest' (customer site) or 'admin' (admin panel). Each uses its own token so the two logins never mix.
export async function request(path, options = {}, kind = 'guest') {
  const token = localStorage.getItem(TOKEN_KEYS[kind]);
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
  } catch {
    throw new Error(import.meta.env.DEV
      ? 'Cannot reach the HotelPro API. Make sure it is running (npm run dev).'
      : 'Cannot reach the HotelPro service. Check your connection and try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const e = new Error(data.message || 'Something went wrong'); e.status = response.status; throw e; }
  return data;
}
