import { NextResponse } from 'next/server';
import { SERVER_URL, hasAuthHeaders, proxyHeaders } from '@/lib/serverProxy';

export async function GET(request: Request) {
  if (!hasAuthHeaders(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(`${SERVER_URL}/api/connection-requests/history`, {
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
