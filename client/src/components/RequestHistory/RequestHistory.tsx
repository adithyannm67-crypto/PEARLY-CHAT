'use client';

import { useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import RequestHistoryTabs from './RequestHistoryTabs';
import RequestHistoryItem from './RequestHistoryItem';
import { useRequestHistory } from '@/hooks/useRequestHistory';
import { useConnectionRequests } from '@/hooks/useConnectionRequests';
import { useSentConnectionRequests } from '@/hooks/useSentConnectionRequests';
import type { ConnectionRequest } from '@/types/chat';

export default function RequestHistory({ userId, onViewChat }: { userId: string | null; onViewChat?: (request: ConnectionRequest) => void }) {
  const { requests, activeTab, setActiveTab, loading, error, loadHistory } = useRequestHistory(userId);
  const { acceptRequest, rejectRequest, loadConnectionRequests } = useConnectionRequests(userId);
  const { loadSentConnectionRequests } = useSentConnectionRequests(userId);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = requests.filter((request) => {
    const incoming = request.receiverId === userId;
    return activeTab === 'received' ? incoming : !incoming;
  });

  const handleAccept = async (requestId: string) => {
    setBusyId(requestId);
    try {
      await acceptRequest(requestId);
      await loadHistory();
      await loadConnectionRequests();
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setBusyId(requestId);
    try {
      await rejectRequest(requestId);
      await loadHistory();
      await loadConnectionRequests();
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    setBusyId(requestId);
    try {
      const response = await authFetch('/api/connection-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'cancel' }),
      });
      if (!response.ok) throw new Error('Failed to cancel request');
      await loadHistory();
      await loadSentConnectionRequests();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="border border-border-custom rounded-lg">
      <RequestHistoryTabs activeTab={activeTab} onChange={setActiveTab} />
      {loading && <p className="p-4 text-sm text-text-secondary">Loading...</p>}
      {error && (
        <div className="p-4">
          <p className="text-sm text-error">{error}</p>
          <button onClick={() => void loadHistory()} className="text-xs text-primary mt-2">Retry</button>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="p-4 text-sm text-text-secondary">No requests</p>
      )}
      {filtered.map((request) => (
        <RequestHistoryItem
          key={request.id}
          request={request}
          userId={userId}
          busy={busyId === request.id}
          onViewChat={onViewChat}
          onAccept={handleAccept}
          onReject={handleReject}
          onCancel={handleCancel}
        />
      ))}
    </div>
  );
}
