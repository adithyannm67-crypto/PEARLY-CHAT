import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Database = any;

// Create Supabase server client
function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client if not configured
    return createClient(supabaseUrl!, supabaseAnonKey!);
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export async function middleware(request: NextRequest) {
  const supabase = createSupabaseServerClient();

  // Refresh session
  const { data: { session } } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;

  // Public paths that don't require authentication
  const isPublicPath = path === '/login' || path === '/register' || path === '/';

  // If user is authenticated and trying to access login/register, redirect to /
  if (session && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!session && !isPublicPath) {
    // Don't redirect on API routes or static assets
    if (path.startsWith('/api/') || path.startsWith('/_next/') || path === '/favicon.ico') {
      return NextResponse.next();
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes in the app directory, excluding static files
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js|mjs|json|svg|png|jpg|gif|webp)$).*)'],
};