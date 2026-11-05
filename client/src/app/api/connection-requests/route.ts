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
  const direction = searchParams.get('direction') || 'incoming';
  const query = new URLSearchParams({ direction });

  try {
    const response = await fetch(
      `${SERVER_URL}/api/connection-requests?${query.toString()}`,
      {
        cache: 'no-store',
        headers: proxyHeaders(request),
        method: 'GET',
      }
    );
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to reach chat server' },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  if (!hasAuthHeaders(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.text();
    const response = await fetch(`${SERVER_URL}/api/connection-requests`, {
      method: 'POST',
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

export async function PATCH(request: Request) {
  if (!hasAuthHeaders(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.text();
    const response = await fetch(`${SERVER_URL}/api/connection-requests`, {
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
