import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import type { ConnectionRequest } from '@/types/chat';

export function useConnectionRequests(userId: string | null) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadConnectionRequests = async () => {
    if (!userId) return;

    setError('');
    setLoading(true);

    try {
      const response = await authFetch(
        '/api/connection-requests?direction=incoming',
        { cache: 'no-store' }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load connection requests');
      }

      setRequests(data.data?.requests ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load connection requests'
      );
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    const response = await authFetch('/api/connection-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action: 'accept' }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to accept connection request');
    }

    setRequests((prev) =>
      prev.filter((request) => request.id !== requestId)
    );

    return data.data?.conversation ?? null;
  };

  const rejectRequest = async (requestId: string) => {
    const response = await authFetch('/api/connection-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action: 'reject' }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to decline connection request');
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
      void loadConnectionRequests();
    });
  }, [userId]);

  return {
    requests,
    setRequests,
    error,
    loading,
    loadConnectionRequests,
    acceptRequest,
    rejectRequest,
  };
}
