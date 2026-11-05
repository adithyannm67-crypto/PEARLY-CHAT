/**
 * Supabase Database Types
 * Auto-generated for the public users table and chat tables.
 * Keep in sync with actual Supabase SQL migrations.
 * 
 * These types are inferred from the Supabase schema via the supabase types generator.
 * The Database type is a proxy type that maps to the Supabase SQL schema.
 */

// Main Database type proxy - maps to the Supabase SQL schema
// This is used for type-safe queries against the Supabase API
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          username: string | null;
          avatar_url: string | null;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          full_name?: string | null;
          created_at?: string;
        };
      };
    };
    Enums: Record<string, never>;
    Composites: Record<string, never>;
  };
};

// Convenience type for a public users table row
export type UserProfile = {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
  created_at: string;
};