'use client';

import { useEffect, useState, createContext, type ReactNode, useContext } from 'react';
import { type SupabaseClient, type User } from '@supabase/supabase-js';
import { supabase as browserSupabase } from '@/lib/supabase/client';
import { requireSupabaseEnv } from '@/lib/supabase/client';
import { authFetch } from '@/lib/authFetch';

type Session = {
  user: User | null;
  hasSession: boolean;
  session?: import('@supabase/supabase-js').Session;
};

type AuthActionResult = {
  error: unknown;
  data?: unknown;
};

type AuthContextValue = {
  supabase: SupabaseClient;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (
    email: string,
    password: string,
    name: string,
    username: string
  ) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  updateProfile: (updates: { name?: string; username?: string }) => Promise<AuthActionResult>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = browserSupabase;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    try {
      requireSupabaseEnv();
    } catch (err) {
      setTimeout(() => {
        setConfigError(
          err instanceof Error
            ? err.message
            : 'Missing Supabase configuration. Please check environment variables.',
        );
      }, 0);
    }
  }, []);

  useEffect(() => {
    async function initSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setLoading(false);
        return;
      }

      const sessionData = data?.session;
      setSession(
        sessionData
          ? { user: sessionData.user, hasSession: true, session: sessionData }
          : null
      );
      setLoading(false);
    }

    initSession();
  }, [supabase]);

  useEffect(() => {
    const { data: authChanges } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) {
        setSession({ user: nextSession.user, hasSession: true, session: nextSession });
      } else {
        setSession(null);
      }
    });

    return () => {
      authChanges.subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    return { error, data };
  };

  const signUp = async (email: string, password: string, name: string, username: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, username } },
    });
    return { error, data };
  };

  const signOut = async () => {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL

    if(!serverUrl) {
      throw new Error("NEXT_PUBLIC_SERVER_URL is not defined");
    }

    try {
      await authFetch(`${serverUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Local session is still cleared if the server is unreachable.
    }

    const { error } = await supabase.auth.signOut({ scope: 'local' });
    return { error };
  };

  const updateProfile = async (updates: { name?: string; username?: string }) => {
    const { error, data } = await supabase.auth.updateUser({ data: updates });
    return { error, data };
  };

  if (configError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <h2>Configuration Error</h2>
        <p>{configError}</p>
        <p>Please set the required environment variables and restart the application.</p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <AuthContext.Provider
      value={{ supabase, session, loading, signIn, signUp, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useSupabase(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSupabase must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
