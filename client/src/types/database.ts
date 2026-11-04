/**
 * Supabase Database Types
 * Auto-generated for the profiles table and auth.users reference.
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
      profiles: {
        Row: {
          id: string;
          name: string;
          username: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          username: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          username?: string;
          created_at?: string;
        };
      };
      // auth.users is managed by Supabase, referenced for foreign keys
      users: {
        Row: {
          id: string;
          email: string | null;
          encrypted_password: string;
          raw_user_meta_data: Record<string, unknown> | null;
          created_at: string;
          last_sign_in_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          password: string;
          raw_user_meta_data?: Record<string, unknown>;
          email_confirmed_at?: string;
          last_sign_in_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          raw_user_meta_data?: Record<string, unknown>;
        };
      };
    };
    Enums: {};
    Composites: {};
  };
};

// Convenience type for profiles table row
export type Profile = {
  id: string;
  name: string;
  username: string;
  created_at: string;
};

// Convenience type for user profile with auth info
export type UserProfile = {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};