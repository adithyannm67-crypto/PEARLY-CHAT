'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { authFetch } from '@/lib/authFetch';

interface UsePresenceReturn {
  onlineUsers: Map<string, boolean>;
  setOwnStatus: (isOnline: boolean) => Promise<void>;
  isOwnOnline: boolean;
}

/**
 * Derive the online-users map from the complete Supabase Realtime Presence
 * state. A user is considered online only when at least one presence entry
 * exists for their user_id. This correctly handles multiple tabs and devices
 * belonging to the same user.
 *
 * @param presenceState - Raw presence state from channel.presenceState().
 *                        Keys are user IDs, values are arrays of presence entries.
 * @param ownUserId     - The local user's ID, excluded from the result map.
 * @returns Map of other user IDs to true (online).
 */
function deriveOnlineUsersFromPresence(
  presenceState: Record<string, unknown[]>,
  ownUserId: string | null
): Map<string, boolean> {
  const online = new Map<string, boolean>();
  for (const [userId, entries] of Object.entries(presenceState)) {
    if (ownUserId && userId === ownUserId) continue;
    if (entries && Array.isArray(entries) && entries.length > 0) {
      online.set(userId, true);
    }
  }
  return online;
}

export function usePresence(userId: string | null): UsePresenceReturn {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, boolean>>(
    new Map()
  );
  const [isOwnOnline, setIsOwnOnline] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setOwnStatus = useCallback(
    async (isOnline: boolean) => {
      if (!userId) return;
      try {
        const response = await authFetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_online: isOnline,
            last_seen: new Date().toISOString(),
          }),
        });
        if (response.ok) {
          setIsOwnOnline(isOnline);
        } else {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('[usePresence] Failed to update user online status via API:', response.status, errorText);
        }
      } catch (err) {
        console.error('[usePresence] Error updating user online status:', err);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) return;

    // Mark self online in DB for persistence on mount (best-effort, one-time).
    void (async () => {
      await setOwnStatus(true);
    })();

    const channel = supabase.channel('presence:global');
    channelRef.current = channel;

    // Synchronise onlineUsers from the current presence state.
    const syncPresence = () => {
      try {
        const state = channel.presenceState();
        setOnlineUsers(deriveOnlineUsersFromPresence(state, userId));
      } catch {
        // Ignore presence-state read errors; join/leave events will populate.
      }
    };

    // Others came online.
    channel.on(
      'presence',
      { event: 'join' },
      () => {
        syncPresence();
      }
    );

    // Others went offline. Reconcile against the full presence state so a user
    // with remaining tabs/devices stays online even after one connection leaves.
    channel.on(
      'presence',
      { event: 'leave' },
      () => {
        syncPresence();
      }
    );

    // Supabase sends a 'sync' event on initial subscription and reconnection.
    channel.on(
      'presence',
      { event: 'sync' },
      () => {
        syncPresence();
      }
    );

    // Subscribe and track self in the presence channel.
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track({
            user_id: userId,
            online: true,
            last_seen: new Date().toISOString(),
          });
          setIsOwnOnline(true);
          syncPresence();
        } catch (err) {
          console.error('[usePresence] Error tracking presence channel:', err);
        }
      }
    });

    // Heartbeat: re-track periodically to keep this tab's presence alive.
    // Supabase Realtime handles its own connection timeout and presence cleanup.
    // track() returns a Promise; await it so rejections are surfaced.
    const startHeartbeat = () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      heartbeatRef.current = setInterval(async () => {
        try {
          await channel.track({
            user_id: userId,
            online: true,
            last_seen: new Date().toISOString(),
          });
        } catch {
          // Ignore track errors during heartbeat; channel may be closing.
        }
      }, 30000);
    };

    startHeartbeat();

    return () => {
      // Stop heartbeat.
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      // Untrack only this tab's presence. Do NOT mark the entire user offline:
      // another tab or device may still be active.
      try {
        void channel.untrack();
      } catch {
        // Ignore untrack errors during cleanup.
      }

      try {
        supabase.removeChannel(channel);
      } catch {
        // Ignore removeChannel errors during cleanup.
      }

      channelRef.current = null;
    };
  }, [userId, setOwnStatus]);

  return {
    onlineUsers,
    setOwnStatus,
    isOwnOnline,
  };
}
