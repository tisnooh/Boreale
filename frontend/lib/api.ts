import { API_URL } from './constants';
import { isLaunch } from './config';

/** Erreur API normalisée (enveloppe { error: { code, message, details } }). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static fromResponse(status: number, body: unknown): ApiError {
    const err = (body as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    return new ApiError(status, err?.code ?? 'unknown', err?.message ?? `Erreur réseau (${status})`, err?.details);
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Throw on non-2xx (default true). */
  throwOnError?: boolean;
}

// One refresh rotation per browser module for concurrent expired customer requests.
let refreshInFlight: Promise<boolean> | null = null;
let refreshGeneration = 0;
let lastRefreshSucceeded = false;

function isCustomerResource(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0];
  return pathname !== '/api/orders/lookup' && /^\/api\/(?:me(?:\/.*)?|orders\/[^/]+)$/.test(pathname);
}

function refreshCustomerSession(generation: number): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  // A late 401 from before the completed rotation must not rotate a second time.
  if (refreshGeneration > generation) return Promise.resolve(lastRefreshSucceeded);
  refreshInFlight = Promise.resolve().then(async () => {
    let succeeded = false;
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      succeeded = response.ok;
      return succeeded;
    } catch {
      return false;
    } finally {
      lastRefreshSucceeded = succeeded;
      refreshGeneration++;
      refreshInFlight = null;
    }
  });
  return refreshInFlight;
}

/** Client API navigateur — envoie les cookies (auth httpOnly) sur le domaine API. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (isLaunch()) throw new ApiError(503, 'launch_mode', 'La boutique est en préparation. Les commandes ne sont pas encore ouvertes.');
  const { body, throwOnError = true, headers, ...rest } = options;
  const initialGeneration = refreshGeneration;
  let res: Response;
  try {
    const request = () => fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    res = await request();
    if (res.status === 401 && isCustomerResource(path) && await refreshCustomerSession(initialGeneration)) {
      res = await request(); // Once only; a second 401 is returned without another refresh.
    }
  } catch {
    throw new ApiError(0, 'network_error', 'API injoignable. Vérifiez que le backend est démarré (NEXT_PUBLIC_API_URL).');
  }
  const text = await res.text();
  const json = text ? safeJsonParse(text) : null;
  if (!res.ok) {
    if (throwOnError) throw ApiError.fromResponse(res.status, json);
    return json as T;
  }
  return json as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  del: <T>(path: string, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
