'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { authFetch } from '@/lib/authFetch';

type UserStatus = {
  id: string;
  is_online: boolean;
  last_seen: string | null;
};

interface UsePresenceReturn {
  onlineUsers: Map<string, boolean>;
  setOwnStatus: (isOnline: boolean) => Promise<void>;
  isOwnOnline: boolean;
}

export function usePresence(userId: string | null): UsePresenceReturn {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, boolean>>(
    new Map()
  );

  const setOwnStatus = useCallback(
    async (isOnline: boolean) => {
      if (!userId) return;
      try {
        await authFetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_online: isOnline,
            last_seen: new Date().toISOString(),
          }),
        });
      } catch {
        // Presence updates are best-effort.
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) return;

    // Mark self online on mount.
    void setOwnStatus(true);

    // Heartbeat every 30 seconds to keep presence fresh.
    const heartbeat = setInterval(() => {
      void setOwnStatus(true);
    }, 30000);

    // Subscribe to user presence changes.
    const channel = supabase
      .channel('presence:users')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          const row = payload.new as UserStatus;
          if (!row.id) return;

          setOnlineUsers((prev) => {
            const next = new Map(prev);
            next.set(row.id, Boolean(row.is_online));
            return next;
          });
        }
      )
      .subscribe();

    // Mark self offline when tab closes or becomes hidden.
    const handleBeforeUnload = () => {
      void setOwnStatus(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void setOwnStatus(false);
      } else if (document.visibilityState === 'visible') {
        void setOwnStatus(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeat);
      void setOwnStatus(false);
      supabase.removeChannel(channel);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, setOwnStatus]);

  const isOwnOnline = onlineUsers.get(userId ?? '') ?? false;

  return {
    onlineUsers,
    setOwnStatus,
    isOwnOnline,
  };
}
