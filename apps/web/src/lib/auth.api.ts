const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not set — using localhost fallback. Set this in production.');
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }
  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export async function apiRegister(email: string, password: string): Promise<{ message: string }> {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ message: string }>(res);
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<{ accessToken: string; user: { id: string; email: string; role: string; digestOptIn: boolean } }> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ accessToken: string; user: { id: string; email: string; role: string; digestOptIn: boolean } }>(res);
}

export async function apiLogout(): Promise<void> {
  const res = await fetch(`${API}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  await handleResponse<void>(res);
}

export async function apiVerifyEmail(token: string): Promise<{ message: string }> {
  const res = await fetch(`${API}/auth/verify-email`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return handleResponse<{ message: string }>(res);
}

export async function apiForgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API}/auth/forgot-password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse<{ message: string }>(res);
}

export async function apiResetPassword(token: string, password: string): Promise<{ message: string }> {
  const res = await fetch(`${API}/auth/reset-password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  return handleResponse<{ message: string }>(res);
}

export async function apiRefreshToken(): Promise<{ accessToken: string }> {
  const res = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<{ accessToken: string }>(res);
}

export async function apiGetMe(
  accessToken: string,
): Promise<{ id: string; email: string; role: string; displayName?: string; digestOptIn: boolean }> {
  const res = await fetch(`${API}/users/me`, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return handleResponse<{ id: string; email: string; role: string; displayName?: string; digestOptIn: boolean }>(res);
}

export async function apiChangePassword(
  accessToken: string,
  oldPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  const res = await fetch(`${API}/users/me/change-password`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  return handleResponse<{ message: string }>(res);
}

export async function apiExchangeOAuthCode(code: string): Promise<{ accessToken: string }> {
  const res = await fetch(`${API}/auth/oauth/exchange`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  return handleResponse<{ accessToken: string }>(res);
}

export async function apiDeleteAccount(accessToken: string): Promise<void> {
  const res = await fetch(`${API}/users/me`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await handleResponse<void>(res);
}
