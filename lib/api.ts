/**
 * API client for Property Manager backend.
 * Uses EXPO_PUBLIC_API_URL (default: http://localhost:3001) for the base URL.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

let getToken: (() => string | null) | null = null;

export function setTokenGetter(fn: () => string | null) {
  getToken = fn;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
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
