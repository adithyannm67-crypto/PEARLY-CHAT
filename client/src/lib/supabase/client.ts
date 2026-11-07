"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Create a single supa client for browser use. It is bound to the browser
// session automatically via the `auth.getSession()` call.
// It should be used inside React components or custom hooks.
// For server-side use, use `createServerClient` from `@supabase/ssr`.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in environment variables',
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// Type-safe helper for supabase APIs
export type SupabaseClient = typeof supabase;
