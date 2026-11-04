/**
 * Supabase Context Export
 * Re-exports the useSupabase hook from AuthProvider for use in page components.
 * 
 * This file exists to maintain the suggested import path from the project structure:
 * `src/lib/supabase/context`
 */

// Export the useSupabase hook directly
// The hook is defined in AuthProvider.tsx and provides Supabase client, session, 
// and authentication functions (signIn, signUp, signOut, updateProfile).
export { useSupabase } from '@/components/AuthProvider';