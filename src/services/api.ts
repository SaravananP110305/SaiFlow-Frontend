import axios, { type InternalAxiosRequestConfig } from 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
}

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
}

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:5000/api/v1`;
};

// Resolve relative media paths (e.g. /uploads/avatars/abc.jpg) to absolute URLs
// pointing at the API server, while leaving absolute URLs untouched.
export const resolveMediaUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  const base = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true // Crucial to send secure cookies (refresh token)
  // Note: no global Content-Type header. Axios sets 'application/json'
  // automatically for object payloads, and for FormData uploads the browser
  // must set 'multipart/form-data; boundary=...' itself (a forced JSON header
  // would make axios serialize FormData to JSON and break file uploads).
});

// Request Interceptor: Inject Access Token
api.interceptors.request.use(
  (config) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const isSessionEndpoint = (url?: string) => {
  if (!url) {
    return false;
  }

  return /\/auth\/login\/?$/.test(url) || /\/auth\/refresh\/?$/.test(url);
};

const shouldSkipRefresh = (config?: RetryableRequestConfig) => {
  if (!config) {
    return true;
  }

  if (config.skipAuthRefresh) {
    return true;
  }

  const method = config.method?.toLowerCase();
  return isSessionEndpoint(config.url) && (method === 'post' || method === 'put');
};

const notifyUnauthorized = () => {
  setAccessToken(null);
  unauthorizedHandler?.();
};

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .put(
        `${getApiBaseUrl()}/auth/refresh`,
        {},
        {
          withCredentials: true,
          skipAuthRefresh: true
        }
      )
      .then((response) => {
        const newAccessToken = response.data?.data?.accessToken ?? null;

        if (newAccessToken) {
          setAccessToken(newAccessToken);
        }

        return newAccessToken;
      })
      .catch((error) => {
        notifyUnauthorized();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

// Response Interceptor: Handle Token Refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !shouldSkipRefresh(originalRequest)) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
