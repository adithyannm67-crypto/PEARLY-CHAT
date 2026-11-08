import { supabase } from '@/lib/supabase/client';
import { requireServerUrl } from './serverProxy';

const FETCH_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
}

export type AuthFetchOptions = {
  /** When true, the request will be retried on transient network failures.
   * Defaults to true only for idempotent methods (GET, HEAD, OPTIONS).
   * Non-idempotent methods (POST, PUT, PATCH, DELETE) are NOT retried by default
   * to avoid duplicate operations. */
  retryable?: boolean;
};

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: AuthFetchOptions = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  let resolvedInput = input;
  if (typeof input === 'string' && input.startsWith('/')) {
    resolvedInput = `${requireServerUrl()}${input}`;
  }

  const method = (init.method ?? 'GET').toUpperCase();
  const isIdempotent = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  const retryable = options.retryable ?? isIdempotent;

  const fetchInit: RequestInit = {
    ...init,
    credentials: 'include',
    headers,
  };

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (isOffline()) {
      throw new Error('You are offline. Please check your internet connection.');
    }

    try {
      return await fetchWithTimeout(resolvedInput, fetchInit, FETCH_TIMEOUT_MS);
    } catch (err) {
      lastError = err;

      // If it's an abort (timeout), treat as retryable network error.
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (retryable && attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
          continue;
        }
        throw new Error('Request timed out. Please try again.');
      }

      // Network errors (e.g. ERR_INTERNET_DISCONNECTED, DNS failure) are retryable
      // only for idempotent methods or when explicitly opted in.
      if (err instanceof TypeError) {
        if (retryable && attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
          continue;
        }
        throw new Error(
          'Unable to reach the server. Please check your internet connection.'
        );
      }

      // Non-network errors (e.g. JSON parse) — don't retry.
      throw err;
    }
  }

  throw lastError ?? new Error('Request failed.');
}
