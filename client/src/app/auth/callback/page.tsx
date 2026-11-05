'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/AuthProvider';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [message, setMessage] = useState('Finishing sign-in...');

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          if (!cancelled) router.replace('/dashboard');
          return;
        }
      }

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          if (!cancelled) router.replace('/dashboard');
          return;
        }
      }

      if (!cancelled) {
        setMessage('Could not complete sign-in. Redirecting to login...');
        router.replace('/auth/login');
      }
    }

    finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return (
    <div className="h-full flex items-center justify-center p-6 text-sm text-text-secondary">
      {message}
    </div>
  );
}
