/**
 * Helper — login, lấy token, tạo user test.
 */

import { config } from './config.js';

export async function login(baseUrl = config.baseUrl, email = config.email, password = config.password) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Login thất bại (${res.status}): ${data.message || 'Unknown error'}`);
  }

  return {
    token: data.data.token,
    user: data.data.user,
  };
}

export async function registerUser(baseUrl, email, password = config.password, name = 'Load Test User') {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Register thất bại (${res.status}): ${data.message || 'Unknown error'}`);
  }

  return {
    token: data.data.token,
    user: data.data.user,
  };
}

export async function ensureAuth(options = {}) {
  const baseUrl = options.baseUrl || config.baseUrl;
  const email = options.email || config.email;
  const password = options.password || config.password;

  if (options.token) {
    return { token: options.token, user: null };
  }

  try {
    return await login(baseUrl, email, password);
  } catch {
    const uniqueEmail = `loadtest-${Date.now()}@example.com`;
    return registerUser(baseUrl, uniqueEmail, password);
  }
}

export async function resolveUserId(options = {}) {
  if (options.userId) return options.userId;

  const { token, user } = await ensureAuth(options);
  if (user?.id) return user.id;

  const res = await fetch(`${options.baseUrl || config.baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.data.id;
}

export function uniqueEmail(prefix = 'loadtest') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export function jsonHeaders(token) {
  return {
    'Content-Type': 'application/json',
    ...authHeaders(token),
  };
}
