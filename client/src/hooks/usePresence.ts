'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { authFetch } from '@/lib/authFetch';

type UserPresence = {
  user_id: string;
  online: boolean;
  last_seen: string;
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

    // Mark self online in DB for persistence on mount.
    void setOwnStatus(true);

    const channel = supabase.channel('presence:global');

    // Others came online.
    channel.on(
      'presence',
      { event: 'join' },
      ({ newPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Map(prev);
          if (!newPresences) return next;
          for (const presences of Object.values(newPresences)) {
            const presenceList = Array.isArray(presences)
              ? presences
              : [presences];
            for (const presence of presenceList) {
              const p = presence as unknown as UserPresence;
              if (p.user_id && p.user_id !== userId) {
                next.set(p.user_id, true);
              }
            }
          }
          return next;
        });
      }
    );

    // Others went offline.
    channel.on(
      'presence',
      { event: 'leave' },
      ({ leftPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Map(prev);
          if (!leftPresences) return next;
          for (const presences of Object.values(leftPresences)) {
            const presenceList = Array.isArray(presences)
              ? presences
              : [presences];
            for (const presence of presenceList) {
              const p = presence as unknown as UserPresence;
              if (p.user_id) {
                next.delete(p.user_id);
              }
            }
          }
          return next;
        });
      }
    );

    // Subscribe and track self in the presence channel.
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          online: true,
          last_seen: new Date().toISOString(),
        });
      }
    });

    // Lightweight presence heartbeat via Realtime channel (no REST/DB write).
    const heartbeat = setInterval(() => {
      void channel.track({
        user_id: userId,
        online: true,
        last_seen: new Date().toISOString(),
      });
    }, 30000);

    // Mark offline on page close.
    const handleBeforeUnload = () => {
      void channel.untrack();
      void setOwnStatus(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      void channel.untrack();
      void setOwnStatus(false);
      supabase.removeChannel(channel);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userId, setOwnStatus]);

  const isOwnOnline = onlineUsers.get(userId ?? '') ?? false;

  return {
    onlineUsers,
    setOwnStatus,
    isOwnOnline,
  };
}
