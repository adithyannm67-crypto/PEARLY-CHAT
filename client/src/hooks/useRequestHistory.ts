import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import type { ConnectionRequest } from '@/types/chat';

export type RequestHistoryTab = 'received' | 'sent';

export function useRequestHistory(userId: string | null) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [activeTab, setActiveTab] = useState<RequestHistoryTab>('received');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    if (!userId) return;

    setLoading(true);
    setError('');

    try {
      const response = await authFetch('/api/connection-requests/history', {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load request history');
      }

      setRequests(data.data?.requests ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load request history'
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
      void loadHistory();
    });
  }, [userId]);

  return {
    requests,
    setRequests,
    activeTab,
    setActiveTab,
    loading,
    error,
    loadHistory,
  };
}
