export const SERVER_URL =
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  'http://localhost:5000';

export function hasAuthHeaders(request: Request): boolean {
  return Boolean(
    request.headers.get('authorization') || request.headers.get('cookie')
  );
}

export function proxyHeaders(request: Request, contentType?: string): Headers {
  const headers = new Headers();
  const authorization = request.headers.get('authorization');
  const cookie = request.headers.get('cookie');

  if (authorization) headers.set('Authorization', authorization);
  if (cookie) headers.set('Cookie', cookie);
  if (contentType) headers.set('Content-Type', contentType);

  return headers;
}
