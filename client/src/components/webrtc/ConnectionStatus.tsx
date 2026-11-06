'use client';

import type { ConnectionStatus } from '@/lib/webrtc/useWebRTC';

type ConnectionStatusProps = {
  status: ConnectionStatus;
  isDataChannelOpen: boolean;
};

const statusLabels: Record<ConnectionStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  'waiting-for-peer': 'Waiting for peer',
  negotiating: 'Negotiating',
  connected: 'Connected',
  failed: 'Failed',
  reconnecting: 'Reconnecting…',
};

const statusColors: Record<ConnectionStatus, string> = {
  disconnected: 'text-text-secondary',
  connecting: 'text-text-secondary',
  'waiting-for-peer': 'text-text-secondary',
  negotiating: 'text-primary',
  connected: 'text-online',
  failed: 'text-error',
  reconnecting: 'text-text-secondary',
};

export default function ConnectionStatus({
  status,
  isDataChannelOpen,
}: ConnectionStatusProps) {
  const label =
    status === 'connected' && !isDataChannelOpen
      ? 'Connected (no data channel)'
      : statusLabels[status];
  const color = statusColors[status];

  return (
    <span
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${
        status === 'connected' && isDataChannelOpen
          ? 'border-online/30 bg-online/10'
          : 'border-border-custom/40 bg-surface/50'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'connected' && isDataChannelOpen
            ? 'bg-online animate-pulse'
            : 'bg-text-secondary/40'
        }`}
      />
      <span className={color}>{label}</span>
    </span>
  );
}
