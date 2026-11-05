'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import type { ConnectionRequest } from '@/types/chat';

interface ConnectionRequestsProps {
  requests: ConnectionRequest[];
  error?: string;
  loading?: boolean;
  onAccept: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
}

export default function ConnectionRequests({
  requests,
  error,
  loading,
  onAccept,
  onReject,
}: ConnectionRequestsProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  // Always show the section so incoming requests are discoverable.

  const handleAction = async (
    requestId: string,
    action: 'accept' | 'reject'
  ) => {
    setBusyId(requestId);
    setActionError('');

    try {
      if (action === 'accept') {
        await onAccept(requestId);
      } else {
        await onReject(requestId);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to update request'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="px-3 pb-3 border-b border-border-custom/40 shrink-0">
      <div className="flex items-center justify-between px-1 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          Connection requests
        </span>
        {requests.length > 0 && (
          <span className="min-w-[20px] h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-medium px-1.5">
            {requests.length}
          </span>
        )}
      </div>

      {loading && (
        <p className="px-1 pb-2 text-xs text-text-secondary">
          Loading requests...
        </p>
      )}
      {error && <p className="px-1 pb-2 text-xs text-error">{error}</p>}
      {actionError && (
        <p className="px-1 pb-2 text-xs text-error">{actionError}</p>
      )}

      <div className="space-y-2 max-h-52 overflow-y-auto">
        {!loading && !error && requests.length === 0 && (
          <p className="px-1 pb-1 text-xs text-text-secondary">
            No pending requests
          </p>
        )}
        {requests.map((request) => (
          <div
            key={request.id}
            className="rounded-lg bg-surface/70 p-2.5 border border-border-custom/30"
          >
            <div className="flex items-center gap-2">
              <Avatar initials={request.user.avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {request.user.name}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {request.user.username
                    ? `@${request.user.username}`
                    : 'Wants to connect'}
                </p>
              </div>
            </div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => handleAction(request.id, 'accept')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Check size={14} />
                {busyId === request.id ? 'Working...' : 'Accept'}
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => handleAction(request.id, 'reject')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border-custom px-2 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <X size={14} />
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
