'use server';

import { createServerClient } from '@supabase/ssr';
import { type NextRequest } from 'next/server';
import { type Database } from '@/types/database';

// Create Supabase server client for Next.js App Router
// This function should be called on the server before rendering a page
// to refresh the auth session from cookies
export async function createSupabaseServerClient(request: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name);
          return cookie?.value ?? undefined;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set(name, value);
        },
        remove(name: string, options: any) {
          request.cookies.set(name, '');
        },
      },
    },
  );

  // Refresh session from request cookies
  await supabase.auth.getSession();

  return supabase;
}