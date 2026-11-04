"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Create a single supa client for browser use. It is bound to the browser
// session automatically via the `auth.getSession()` call.
// It should be used inside React components or custom hooks.
// For server-side use, use `createServerClient` from `@supabase/ssr`.

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Type-safe helper for supabase APIs
export type SupabaseClient = typeof supabase;