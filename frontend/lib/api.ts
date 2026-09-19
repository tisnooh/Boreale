import { API_URL } from './constants';

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

/** Client API navigateur — envoie les cookies (auth httpOnly) sur le domaine API. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, throwOnError = true, headers, ...rest } = options;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
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
