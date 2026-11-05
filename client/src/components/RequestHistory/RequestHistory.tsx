'use client';

import { useState } from 'react';
import RequestHistoryTabs from './RequestHistoryTabs';
import RequestHistoryItem from './RequestHistoryItem';
import type { ConnectionRequest } from '@/types/chat';
import { useDashboard } from '@/context/DashboardContext';

export default function RequestHistory({
  userId,
  onViewChat,
}: {
  userId: string | null;
  onViewChat?: (request: ConnectionRequest) => void;
}) {
  const {
    connectionRequests,
    sentConnectionRequests,
    requestHistory,
    historyTab,
    setHistoryTab,
    loading,
    error,
    handleAcceptRequest,
    handleRejectRequest,
    cancelRequest,
  } = useDashboard();

  const [busyId, setBusyId] = useState<string | null>(null);

  const requests = requestHistory.length > 0
    ? requestHistory
    : [...connectionRequests, ...sentConnectionRequests];

  const filtered = requests.filter((request: ConnectionRequest) => {
    const incoming = request.receiverId === userId;
    return historyTab === 'received' ? incoming : !incoming;
  });

  const handleAccept = async (requestId: string) => {
    setBusyId(requestId);
    try {
      await handleAcceptRequest(requestId);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setBusyId(requestId);
    try {
      await handleRejectRequest(requestId);
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    setBusyId(requestId);
    try {
      await cancelRequest(requestId);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="border border-border-custom rounded-lg">
      <RequestHistoryTabs activeTab={historyTab} onChange={setHistoryTab} />
      {loading && <p className="p-4 text-sm text-text-secondary">Loading...</p>}
      {error && (
        <div className="p-4">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="p-4 text-sm text-text-secondary">No requests</p>
      )}
      {filtered.map((request: ConnectionRequest) => (
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
