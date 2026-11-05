'use client';

import Avatar from '@/components/Avatar';
import RequestStatusBadge from './RequestStatusBadge';
import type { ConnectionRequest } from '@/types/chat';
import {CONNECTION_REQUEST_STATUS} from '@/types/database';

export default function RequestHistoryItem({
  request,
  userId,
  onViewChat,
  onAccept,
  onReject,
  onCancel,
  busy,
}: {
  request: ConnectionRequest;
  userId?: string | null;
  onViewChat?: (request: ConnectionRequest) => void;
  onAccept?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
  busy?: boolean;
}) {
  const incoming = userId ? request.receiverId === userId : (request as any).direction === 'incoming';

  return (
    <div className="flex items-center gap-3 p-3 border-b border-border-custom/40">
      <Avatar initials={request.user.avatar} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{request.user.name}</p>
        <p className="text-xs text-text-secondary truncate">@{request.user.username}</p>
        <p className="text-xs text-text-secondary">{new Date(request.createdAt).toLocaleString()}</p>
      </div>
      <RequestStatusBadge status={request.status} />
      <div className="flex gap-2">
        {incoming && request.status === CONNECTION_REQUEST_STATUS.PENDING && (
          <>
            <button disabled={busy} onClick={() => onAccept?.(request.id)} className="text-xs px-2 py-1 rounded bg-primary text-white disabled:opacity-50">Accept</button>
            <button disabled={busy} onClick={() => onReject?.(request.id)} className="text-xs px-2 py-1 rounded border border-border-custom disabled:opacity-50">Reject</button>
          </>
        )}
        {!incoming && request.status === CONNECTION_REQUEST_STATUS.PENDING && (
          <button disabled={busy} onClick={() => onCancel?.(request.id)} className="text-xs px-2 py-1 rounded border border-border-custom disabled:opacity-50">Cancel</button>
        )}
        {request.status === CONNECTION_REQUEST_STATUS.ACCEPTED && (
          <button onClick={() => onViewChat?.(request)} className="text-xs px-2 py-1 rounded bg-primary text-white">View Chat</button>
        )}
      </div>
    </div>
  );
}
