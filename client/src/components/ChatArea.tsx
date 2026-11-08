'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import MessageBubble from '@/components/MessageBubble';
import MessageComposer from '@/components/MessageComposer';
import TypingIndicator from '@/components/TypingIndicator';
import { useDashboard } from '@/context/DashboardContext';
import { authFetch } from '@/lib/authFetch';
import ConnectionStatus from '@/components/webrtc/ConnectionStatus';
import type { Conversation, Message } from '@/types/chat';

function getDateKey(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateString: string): string {
  const dateKey = getDateKey(dateString);
  if (!dateKey) return '';
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  const targetDate = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = targetDate.getTime();
  const diffDays = Math.round((todayStart - targetStart) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export default function ChatArea() {
  const {
    userId,
    selectedConversation,
    handleBack,
    onlineUsers,
    webrtcConnectionState,
    isDataChannelOpen,
    webrtcMessages,
    connectWebRTC,
    disconnectWebRTC,
    sendWebRTCMessage,
  } = useDashboard();
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scrollToBottomVisible, setScrollToBottomVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageAreaRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const isSendingRef = useRef(false);
  const pendingInitialScroll = useRef(false);

  const scrollToBottom = useCallback(() => {
    const area = messageAreaRef.current;
    if (area) {
      requestAnimationFrame(() => {
        area.scrollTo({
          top: area.scrollHeight,
          behavior: 'smooth',
        });
      });
    }
  }, []);

  const selectedConversationId = selectedConversation?.id ?? null;

  // Connect/disconnect WebRTC when conversation changes
  useEffect(() => {
    if (!selectedConversationId) {
      disconnectWebRTC();
      return;
    }
    void connectWebRTC();
    return () => {
      disconnectWebRTC();
    };
  }, [selectedConversationId, connectWebRTC, disconnectWebRTC]);

  // Merge WebRTC messages into local message list
  useEffect(() => {
    if (webrtcMessages.length === 0) return;

    setLocalMessages((previous) => {
      const incoming = webrtcMessages.filter(
        (m) => !previous.some((p) => p.id === m.id),
      );
      const mapped: Message[] = incoming.map((m) => ({
        id: m.id,
        conversationId: selectedConversationId ?? '',
        senderId: m.senderId,
        content: m.content,
        timestamp: m.timestamp,
        status: 'delivered',
      }));
      return [...previous, ...mapped];
    });
  }, [webrtcMessages, selectedConversationId]);

  // When selectedConversationId changes, fetch messages from the API
  useEffect(() => {
    if (!selectedConversationId) return;

    let cancelled = false;

    async function loadMessages() {
      setLoading(true);

      try {
        const response = await authFetch(
          `/api/messages?conversationId=${encodeURIComponent(selectedConversationId!)}`,
          { cache: 'no-store' },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load messages');
        }

        if (!cancelled) {
          setLocalMessages(data.data?.messages ?? []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load messages');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [selectedConversationId]);

  // When conversation changes, flag that we need an initial scroll-to-bottom
  useEffect(() => {
    if (selectedConversationId) {
      pendingInitialScroll.current = true;
    }
  }, [selectedConversationId]);

  // Scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (!selectedConversationId) return;

    // On first load of a conversation, always scroll to bottom once messages exist
    if (pendingInitialScroll.current && localMessages.length > 0) {
      pendingInitialScroll.current = false;
      scrollToBottom();
      return;
    }

    if (messageAreaRef.current && !isUserScrollingRef.current) {
      const area = messageAreaRef.current;
      const isNearBottom =
        area.scrollHeight - area.scrollTop - area.clientHeight < 100;
      if (isNearBottom) {
        scrollToBottom();
      } else {
        setScrollToBottomVisible(true);
      }
    }
  }, [localMessages, selectedConversationId, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const area = messageAreaRef.current;
    if (!area) return;
    const isNearBottom =
      area.scrollHeight - area.scrollTop - area.clientHeight < 100;
    isUserScrollingRef.current = !isNearBottom;
    setScrollToBottomVisible(!isNearBottom);
  }, []);

  const otherUser = selectedConversation?.otherUser ?? null;

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!userId) return;
      setError('');

      // Prevent double submission (e.g. mobile keyboard firing both
      // keyDown and form submit for the same message).
      if (isSendingRef.current) return;
      isSendingRef.current = true;

      if (!isDataChannelOpen) {
        setError('WebRTC data channel is not open yet. Wait for connection.');
        isSendingRef.current = false;
        return;
      }

      const optimisticId = crypto.randomUUID();
      const optimistic: Message = {
        id: optimisticId,
        conversationId: selectedConversationId ?? '',
        senderId: userId,
        content,
        timestamp: new Date().toISOString(),
        status: 'sending',
      };

      setLocalMessages((prev) => [...prev, optimistic]);
      scrollToBottom();

      void (async () => {
        const sent = await sendWebRTCMessage(content);
        if (!sent) {
          setLocalMessages((prev) =>
            prev.map((m) =>
              m.id === optimisticId ? { ...m, status: 'failed' } : m,
            ),
          );
          setError('Failed to send message.');
          isSendingRef.current = false;
          return;
        }

        // Persist to backend
        try {
          await authFetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: selectedConversationId,
              content,
            }),
          });
        } catch {
          // Persistence is best-effort
        }

        setLocalMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? { ...m, status: 'sent' } : m)),
        );
        isSendingRef.current = false;
      })();
    },
    [userId, isDataChannelOpen, selectedConversationId, sendWebRTCMessage, scrollToBottom],
  );

  // Empty State
  if (!selectedConversationId || !selectedConversation || !otherUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-main h-full safe-area-inset-top">
        <div className="flex flex-col items-center text-center p-6 select-none">
          <div className="w-24 h-24 rounded-full bg-surface/50 flex items-center justify-center mb-6">
            <MessageCircle size={40} className="text-text-secondary/30" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mt-2">
            Welcome to Peerly
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Select a conversation to start chatting
          </p>
        </div>
      </div>
    );
  }

  // Chat View
  return (
    <div className="flex flex-col h-full bg-bg-main">
      {/* 1. Chat Header */}
      <header className="h-16 bg-bg-secondary border-b border-border-custom px-4 flex items-center gap-3 shrink-0 safe-area-inset-top">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to conversations"
          className="md:hidden p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer touch-target"
        >
          <ArrowLeft size={20} />
        </button>

        <Avatar
          initials={otherUser.avatar}
          size="md"
          showOnline={onlineUsers.get(otherUser.id) === true}
        />

        <div className="flex-1 min-w-0">
          <h2 className="font-medium text-text-primary truncate">
            {otherUser.name}
          </h2>
          <p className="text-xs">
            {onlineUsers.get(otherUser.id) === true ? (
              <span className="text-online font-medium">Online</span>
            ) : (
              <span className="text-text-secondary">
                {otherUser.lastSeen
                  ? `Last seen ${formatDateLabel(otherUser.lastSeen)}`
                  : 'Offline'}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <ConnectionStatus
            status={webrtcConnectionState}
            isDataChannelOpen={isDataChannelOpen}
          />
          <button
            type="button"
            aria-label="Voice call"
            className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer touch-target"
          >
            <Phone size={18} />
          </button>
          <button
            type="button"
            aria-label="Video call"
            className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer touch-target"
          >
            <Video size={18} />
          </button>
          <button
            type="button"
            aria-label="More options"
            className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer touch-target"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* 2. Message area */}
      <div
        ref={messageAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1 pb-10 safe-area-inset-bottom no-pull-to-refresh"
      >
        {loading && (
          <div className="text-center text-sm text-text-secondary py-4">
            Loading messages...
          </div>
        )}

        {!loading && error && (
          <div className="text-center text-sm text-error py-4">{error}</div>
        )}

        {!loading && !error && localMessages.length === 0 && (
          <div className="text-center text-sm text-text-secondary py-4">
            No messages yet. Say hello!
          </div>
        )}

        {localMessages.map((msg, index) => {
          const dateKey = getDateKey(msg.timestamp);
          const prevDateKey =
            index > 0 ? getDateKey(localMessages[index - 1].timestamp) : null;
          const showDateSeparator = dateKey !== prevDateKey;

          const isSent = msg.senderId === userId;
          const prevMsg = index > 0 ? localMessages[index - 1] : null;
          const isFirstInGroup =
            showDateSeparator || !prevMsg || prevMsg.senderId !== msg.senderId;

          return (
            <div key={msg.id}>
              {showDateSeparator && dateKey && (
                <div className="date-separator my-4">
                  <span>{formatDateLabel(dateKey)}</span>
                </div>
              )}

              <MessageBubble
                message={msg}
                userId={userId}
                isFirstInGroup={isFirstInGroup}
                showDateSeparator={false}
                dateLabel=""
                prevMessage={prevMsg}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} />

        {scrollToBottomVisible && (
          <button
            type="button"
            onClick={() => {
              scrollToBottom();
              setScrollToBottomVisible(false);
            }}
            className="scroll-to-bottom-btn"
            aria-label="Scroll to bottom"
          >
            <MessageCircle size={16} />
          </button>
        )}
      </div>

      {/* 3. Message composer */}
      <MessageComposer
        onSend={handleSendMessage}
        disabled={!isDataChannelOpen || !userId}
        placeholder="Type a message..."
      />
    </div>
  );
}