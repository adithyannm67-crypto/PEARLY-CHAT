import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import type { ConnectionRequest } from '@/types/chat';

export function useSentConnectionRequests(userId: string | null) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadSentConnectionRequests = async () => {
    if (!userId) return;

    setError('');
    setLoading(true);

    try {
      const response = await authFetch(
        '/api/connection-requests?direction=outgoing',
        { cache: 'no-store' }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load sent connection requests');
      }

      setRequests(data.data?.requests ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load sent connection requests'
      );
    } finally {
      setLoading(false);
    }
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
  };
}
