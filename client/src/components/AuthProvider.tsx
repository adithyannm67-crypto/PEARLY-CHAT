'use client';

import { useEffect, useState, createContext, type ReactNode, useContext } from 'react';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { supabase as browserSupabase } from '@/lib/supabase/client';

// Type for the session - simplified to avoid Supabase type conflicts
type Session = {
  user: User | null;
  hasSession: boolean;
  session?: import('@supabase/supabase-js').Session;
};

// Context value type
type AuthContextValue = {
  supabase: SupabaseClient;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: { name?: string; username?: string }) => Promise<{ error: any }>;
};

// Create the context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// AuthProvider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [supabase, setSupabase] = useState<SupabaseClient>(() => {
    // Use the shared browser client from client.ts to avoid multiple GoTrueClient instances
    return browserSupabase;
  });

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    async function initSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }
      // Handle both null and session objects
      const sessionData = data?.session;
      setSession(sessionData ? { user: sessionData.user, hasSession: true, session: sessionData } : null);
      setLoading(false);
    }

    initSession();
  }, [supabase]);

  // Listen for session changes
  useEffect(() => {
    const { data: authChanges } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setSession({ user: session.user, hasSession: true, session });
        } else {
          setSession(null);
        }
      }
    );

    return () => {
      authChanges.subscription?.unsubscribe();
    };
  }, [supabase]);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error, data };
  };

  // Sign up function
  const signUp = async (email: string, password: string, name: string, username: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          username,
        },
      },
    });
    return { error, data };
  };

  // Sign out function
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  // Update profile function (updates user metadata)
  const updateProfile = async (updates: { name?: string; username?: string }) => {
    const { error, data } = await supabase.auth.updateUser({
      data: updates,
    });
    return { error, data };
  };

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <AuthContext.Provider value={{ supabase, session, loading, signIn, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// Helper hook to use the context
export function useSupabase(): {
  supabase: SupabaseClient;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: { name?: string; username?: string }) => Promise<{ error: any }>;
} {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSupabase must be used within an AuthProvider');
  }
  return context;
}

// Export the context for direct use if needed
export { AuthContext };