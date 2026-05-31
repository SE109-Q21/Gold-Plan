import axios from 'axios';
import { apiRefreshToken } from './auth.api';

// Token lives in memory only (auth-context keeps it in tokenRef).
// auth-context calls setApiAccessToken on every login / refresh / logout.
let _accessToken: string | null = null;
export function setApiAccessToken(token: string | null): void {
  _accessToken = token;
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (message) return message;
  }
  return err instanceof Error ? err.message : fallback;
}

apiClient.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retried) {
      original._retried = true;
      try {
        const { accessToken } = await apiRefreshToken();
        setApiAccessToken(accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        // Refresh failed — propagate original 401
      }
    }
    return Promise.reject(err);
  },
);
