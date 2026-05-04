/**
 * api.ts — Axios instance factory with auth interceptors.
 * Business logic (endpoints) will be added in separate service files.
 */
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { getAuthToken, clearAuthToken, maskTokenForLog } from './authToken';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor — attach JWT ─────────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = getAuthToken();
      if (token) {
        // do not log full token
        // eslint-disable-next-line no-console
        console.debug('[api] Attaching Authorization header — token:', maskTokenForLog(token));
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ─── Response interceptor — handle 401 / token refresh ───────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401) {
      if (typeof window !== 'undefined') {
        // clear any invalid token and force login
        clearAuthToken();
        // eslint-disable-next-line no-console
        console.warn('[api] 401 received — cleared token and redirecting to /login');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
