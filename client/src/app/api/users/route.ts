import { NextResponse } from 'next/server';
import { SERVER_URL, hasAuthHeaders, proxyHeaders } from '@/lib/serverProxy';

export async function GET(request: Request) {
  if (!hasAuthHeaders(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const excludeUserId = searchParams.get('excludeUserId');
  const search = searchParams.get('search');
  const query = new URLSearchParams();

  if (excludeUserId) query.set('excludeUserId', excludeUserId);
  if (search) query.set('search', search);

  try {
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(`${SERVER_URL}/api/users${suffix}`, {
      cache: 'no-store',
      headers: proxyHeaders(request),
      method: 'GET',
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to reach chat server' },
      { status: 502 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!hasAuthHeaders(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.text();
    const response = await fetch(`${SERVER_URL}/api/users`, {
      method: 'PATCH',
      headers: proxyHeaders(request, 'application/json'),
      body,
      cache: 'no-store',
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to reach chat server' },
      { status: 502 }
    );
  }
}
