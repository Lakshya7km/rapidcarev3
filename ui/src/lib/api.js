import { getStored } from './storage.js';

export async function api(path, { method = 'GET', body, headers } = {}) {
  const h = { 'Content-Type': 'application/json', ...(headers || {}) };
  const token = getStored('jwt');
  if (token) h.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers: h,
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }
  return data;
}
