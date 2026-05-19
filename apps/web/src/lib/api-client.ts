import axios from 'axios';

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

apiClient.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
  return config;
});
