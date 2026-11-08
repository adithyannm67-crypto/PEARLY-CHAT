import { supabase } from '@/lib/supabase/client';
import { SERVER_URL } from './serverProxy';

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
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

  // Resolve relative API paths directly against the backend server so the
  // browser contacts http://localhost:5000 exactly, with no Next.js proxy
  // layer in between.
  let resolvedInput = input;
  if (typeof input === 'string' && input.startsWith('/')) {
    resolvedInput = `${SERVER_URL}${input}`;
  }

  return fetch(resolvedInput, {
    ...init,
    credentials: 'include',
    headers,
  });
}
