import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import type { ConnectionRequest } from '@/types/chat';

export function useSentConnectionRequests(userId: string | null) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadSentConnectionRequests = useCallback(async () => {
    if (!userId) return;

    setError('');
    setLoading(true);

    try {
      const response = await authFetch('/api/connection-requests/history', {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load sent connection requests');
      }

      const allRequests = (data.data?.requests ?? []) as ConnectionRequest[];
      setRequests(allRequests.filter((r) => r.senderId === userId));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load sent connection requests'
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const cancelRequest = async (requestId: string) => {
    const response = await authFetch('/api/connection-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action: 'cancel' }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to cancel connection request');
    }

    setRequests((prev) =>
      prev.filter((request) => request.id !== requestId)
    );
  };

  useEffect(() => {
    if (!userId) {
      void Promise.resolve().then(() => {
        setRequests([]);
      });
      return;
    }

    void Promise.resolve().then(() => {
      void loadSentConnectionRequests();
    });
  }, [userId]);

  return {
    requests,
    setRequests,
    error,
    loading,
    loadSentConnectionRequests,
    cancelRequest,
  };
}
