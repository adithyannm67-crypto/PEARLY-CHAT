'use client';
import { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  Paperclip,
  Smile,
  SendHorizontal,
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useDashboard } from '@/context/DashboardContext';
import { authFetch } from '@/lib/authFetch';
import { useWebRTC } from '@/lib/webrtc/useWebRTC';
import ConnectionStatus from '@/components/webrtc/ConnectionStatus';
import type { Conversation, Message } from '@/types/chat';
import { formatMessageTime, formatDateLabel, getDateKey } from '@/lib/utils/formatDate-time';




export default function ChatArea() {
  const { userId, selectedConversation, handleBack, onlineUsers } = useDashboard();
  const [messageInput, setMessageInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversationId = selectedConversation?.id ?? null;

  const {
    connectionState: webrtcConnectionState,
    isDataChannelOpen,
    messages: webrtcMessages,
    connect: connectWebRTC,
    disconnect: disconnectWebRTC,
    sendMessage: sendWebRTCMessage,
  } = useWebRTC({
    conversationId: selectedConversationId,
    userId,
    iceConfig: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN servers here for relay when direct connectivity fails:
        // { urls: 'turn:your-turn-server:3478', username: 'user', credential: 'pass' },
      ],
    },
  });

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

    void Promise.resolve().then(() => {
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
          status: 'sent',
        }));
        return [...previous, ...mapped];
      });
    });
  }, [webrtcMessages, selectedConversationId]);

  // When selectedConversationId changes, fetch messages from the Next.js API
  useEffect(() => {
    if (!selectedConversationId) return;

    let cancelled = false;

    async function loadMessages() {
      setLoading(true);

      try {
        const response = await authFetch(
          `/api/messages?conversationId=${encodeURIComponent(selectedConversationId!)}`,
          { cache: 'no-store' }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load messages');
        }

        if (!cancelled) {
          setLocalMessages(data.data?.messages ?? []);
        }
      } catch (err) {
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

  // Scroll to bottom when localMessages changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const otherUser = selectedConversation?.otherUser ?? null;

  const handleSend = async () => {
    const trimmed = messageInput.trim();
    if (!trimmed || !userId) return;

    setError('');

    if (!isDataChannelOpen) {
      setError('WebRTC data channel is not open yet. Wait for connection.');
      return;
    }

    const sent = sendWebRTCMessage(trimmed);
    if (!sent) {
      setError('Failed to send message.');
      return;
    }

    setMessageInput('');
  };

  // Empty State (when no selectedConversation is selected)
  if (!selectedConversationId || !selectedConversation || !otherUser) {
    return (
      <EmptyChat />
    );
  }

  // Chat View (when selectedConversationId is set)
  return (
    <div className="flex flex-col h-full bg-bg-main">
      {/* 1. Chat Header */}
      <header className="h-16 bg-bg-secondary border-b border-border-custom px-4 flex items-center gap-3 shrink-0">
        {/* Back button (mobile) */}
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to selectedConversations"
          className="md:hidden p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Avatar */}
        <Avatar
          initials={otherUser.avatar}
          size="md"
          showOnline={onlineUsers.get(otherUser.id) === true}
        />

        {/* Info section */}
        <div className="flex-1 min-w-0">
          <h2 className="font-medium text-text-primary truncate">{otherUser.name}</h2>
          <p className="text-xs">
            {onlineUsers.get(otherUser.id) === true && (
              <span className="text-online font-medium">Online</span>
            )}
            {onlineUsers.get(otherUser.id) === false && (
              <span className="text-text-secondary">
                {otherUser.lastSeen ? `Last seen ${otherUser.lastSeen}` : 'Offline'}
              </span>
            )}
            {onlineUsers.get(otherUser.id) === undefined && (
              <span className="text-text-secondary">
                {otherUser.lastSeen ? `Last seen ${otherUser.lastSeen}` : 'Offline'}
              </span>
            )}
          </p>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-1">
          <ConnectionStatus
            status={webrtcConnectionState}
            isDataChannelOpen={isDataChannelOpen}
          />
          <button
            type="button"
            aria-label="Voice call"
            className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <Phone size={18} />
          </button>
          <button
            type="button"
            aria-label="Video call"
            className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <Video size={18} />
          </button>
          <button
            type="button"
            aria-label="More options"
            className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* 2. Message area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
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
              {/* Date separator */}
              {showDateSeparator && (
                <div className="flex justify-center my-4">
                  <span className="bg-surface/80 text-text-secondary text-[11px] px-3 py-1 rounded-full select-none">
                    {formatDateLabel(dateKey)}
                  </span>
                </div>
              )}

              {/* Message row */}
              <div
                className={`flex w-full ${isSent ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-1'
                  }`}
              >
                <div
                  className={`flex flex-col ${isSent ? 'items-end' : 'items-start'
                    } max-w-[70%]`}
                >
                  {/* Bubble */}
                  <div
                    className={`px-4 py-2 w-fit break-words text-sm leading-relaxed ${isSent
                      ? 'bg-primary text-white rounded-2xl rounded-br-sm'
                      : 'bg-surface text-text-primary rounded-2xl rounded-bl-sm'
                      }`}
                  >
                    {msg.content}
                  </div>

                  {/* Below bubble: Time & Status */}
                  <div className="flex items-center gap-1 mt-0.5 px-1 select-none">
                    <span className="text-[10px] text-text-secondary/50">
                      {formatMessageTime(msg.timestamp)}
                    </span>
                    {isSent && (
                      <span
                        className={`text-[10px] ${msg.status === 'read'
                          ? 'text-primary'
                          : 'text-text-secondary/50'
                          }`}
                      >
                        {msg.status === 'sent' ? '✓' : '✓✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Message input bar */}
      <div className="bg-bg-secondary border-t border-border-custom p-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          {/* Paperclip button */}
          <button
            type="button"
            aria-label="Attach file"
            className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
          >
            <Paperclip size={18} />
          </button>

          {/* Input field */}
          <input
            type="text"
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-surface rounded-full px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 border-none"
          />

          {/* Smile button */}
          <button
            type="button"
            aria-label="Insert emoji"
            className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
          >
            <Smile size={18} />
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={
              !messageInput.trim() || !isDataChannelOpen || !userId
            }
            aria-label="Send message"
            className={`p-2.5 rounded-full transition-all ${messageInput.trim() && isDataChannelOpen && userId
              ? 'bg-primary text-white hover:bg-primary/90 cursor-pointer shadow-sm'
              : 'bg-surface text-text-secondary cursor-not-allowed'
              }`}
          >
            <SendHorizontal size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

const EmptyChat = () => {



  return (<div className="flex-1 flex items-center justify-center bg-bg-main h-full">
    <div className="flex flex-col items-center text-center p-6 select-none">
      {/* Decorative circle */}
      <div className="w-24 h-24 rounded-full bg-surface/50 flex items-center justify-center mb-6">
        <MessageCircle size={40} className="text-text-secondary/30" />
      </div>
      <h2 className="text-xl font-semibold text-text-primary mt-2">
        Welcome to Peerly
      </h2>
      <p className="text-sm text-text-secondary mt-1">
        Select a selectedConversation to start chatting
      </p>
    </div>
  </div>)
}