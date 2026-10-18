import { Platform } from 'react-native';

/**
 * API client for Property Manager backend.
 * Uses EXPO_PUBLIC_API_URL with automatic fallback for web browsers.
 */

export function getBaseUrl(): string {
  // If an explicit API URL is configured (e.g. production cloud URL or mobile env), always prioritize it:
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Fallback for local web development: match browser host on port 3001
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    if (hostname) {
      return `http://${hostname}:3001`;
    }
  }

  return 'http://localhost:3001';
}

let getToken: (() => string | null) | null = null;

export function setTokenGetter(fn: () => string | null) {
  getToken = fn;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const token = getToken?.() ?? null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const parsed = JSON.parse(body);
      message = parsed.error || parsed.message || body;
    } catch {
      message = res.statusText || body;
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const apiGet = <T>(path: string) => api<T>(path, { method: 'GET' });
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
export const apiPatch = <T>(path: string, body?: unknown) =>
  api<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
export const apiDelete = (path: string) =>
  api<void>(path, { method: 'DELETE' });
