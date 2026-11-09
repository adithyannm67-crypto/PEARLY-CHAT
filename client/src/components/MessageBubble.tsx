'use client';

import { useCallback, useMemo } from 'react';
import { Check, CheckCheck, Clock, RefreshCw, WifiOff } from 'lucide-react';
import type { Message } from '@/types/chat';

interface MessageBubbleProps {
  message: Message;
  userId: string | null;
  isFirstInGroup: boolean;
  showDateSeparator: boolean;
  dateLabel: string;
  prevMessage: Message | null;
  onRetry?: (messageId: string) => void;
}

const STATUS_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  sending: { icon: Clock, color: '#94A3B8' },
  sent: { icon: Check, color: '#94A3B8' },
  delivered: { icon: CheckCheck, color: '#94A3B8' },
  read: { icon: CheckCheck, color: '#22C55E' },
  failed: { icon: WifiOff, color: '#EF4444' },
};

export default function MessageBubble({
  message,
  userId,
  isFirstInGroup,
  showDateSeparator,
  dateLabel,
  prevMessage,
  onRetry,
}: MessageBubbleProps) {
  const isSent = message.senderId === userId;
  const statusConfig = STATUS_ICONS[message.status] ?? STATUS_ICONS.sent;

  const Icon = statusConfig.icon;
  const statusColor = statusConfig.color;

  const showStatus = isSent && isFirstInGroup;
  const showTime = isFirstInGroup;

  const bubbleClass = useMemo(() => {
    if (isSent) return 'msg-bubble-sent';
    return 'msg-bubble-received';
  }, [isSent]);

  const alignClass = isSent ? 'flex-end' : 'flex-start';
  const bubbleMargin = isSent ? 'ml-auto' : 'mr-auto';

  const handleRetry = useCallback(() => {
    if (onRetry && message.status === 'failed') {
      onRetry(message.id);
    }
  }, [onRetry, message.id, message.status]);

  return (
    <div key={message.id} className="flex w-full animate-slide-in-right">
      {/* Date separator */}
      {showDateSeparator && dateLabel && (
        <div className="date-separator mb-4">
          <span>{dateLabel}</span>
        </div>
      )}

      {/* Message row */}
      <div className={`flex w-full ${alignClass} ${isFirstInGroup ? 'mt-3' : 'mt-1'}`}>
        {/* Avatar id  for received messages (first in group only) */}
        {!isSent && isFirstInGroup && (
          <div className="ml-2 mt-1 flex-shrink-0">
            <div className="w-6 h-6 rounded-full bg-surface/50 flex items-center justify-center text-[10px] font-medium text-text-secondary">
              {message.senderId?.slice(0, 2).toUpperCase() ?? '?'}
            </div>
          </div>
        )}

        <div
          className={`flex flex-col ${isSent ? 'items-end' : 'items-start'
          } max-w-[80%] ${bubbleMargin}`}
        >
          {/* Bubble */}
          <div
            className={`px-3 py-2 w-fit break-words text-sm leading-relaxed ${bubbleClass}
            ${isSent ? 'text-white' : 'text-text-primary'}`}
          >
            {message.content}
          </div>

          {/* Below bubble: Time & Status */}
          {showTime || showStatus ? (
            <div className="flex items-center gap-1 mt-0.5 px-1 select-none">
              {showTime && (
                <span className="text-[10px] text-text-secondary/60">
                  {new Date(message.timestamp).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true,
                  })}
                </span>
              )}
              {showStatus && (
                <>
                  <Icon size={11} className={statusColor} />
                  {message.status === 'failed' && (
                    <>
                      <span className="text-[10px] text-error ml-1">Failed</span>
                      <button
                        type="button"
                        onClick={handleRetry}
                        aria-label="Retry message"
                        className="ml-1 p-1 text-[10px] text-error hover:text-error/80 hover:bg-error/10 rounded"
                      >
                        <RefreshCw size={10} />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
