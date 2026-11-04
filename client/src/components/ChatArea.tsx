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
import {
  conversations,
  getConversationMessages,
  getOtherParticipant,
  Message,
} from '@/lib/mockData';

interface ChatAreaProps {
  conversationId: string | null;
  onBack?: () => void;
}

function getDateKey(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateKey: string): string {
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

function formatMessageTime(ts: string): string {
  const date = new Date(ts);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function ChatArea({ conversationId, onBack }: ChatAreaProps) {
  const [messageInput, setMessageInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // When conversationId changes, set localMessages
  useEffect(() => {
    if (conversationId) {
      setLocalMessages(getConversationMessages(conversationId));
    } else {
      setLocalMessages([]);
    }
    setMessageInput('');
  }, [conversationId]);

  // Scroll to bottom when localMessages changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const conversation = conversationId
    ? conversations.find((c) => c.id === conversationId)
    : undefined;
  const otherUser = conversation ? getOtherParticipant(conversation) : undefined;

  const handleSend = () => {
    const trimmed = messageInput.trim();
    if (!trimmed || !conversationId) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: conversationId,
      senderId: 'user-0',
      content: trimmed,
      timestamp: new Date().toISOString(),
      status: 'sent' as const,
    };

    setLocalMessages((prev) => [...prev, newMsg]);
    setMessageInput('');
  };

  // Empty State (when conversationId is null)
  if (!conversationId || !conversation || !otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-main h-full">
        <div className="flex flex-col items-center text-center p-6 select-none">
          {/* Decorative circle */}
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

  // Chat View (when conversationId is set)
  return (
    <div className="flex flex-col h-full bg-bg-main">
      {/* 1. Chat Header */}
      <header className="h-16 bg-bg-secondary border-b border-border-custom px-4 flex items-center gap-3 shrink-0">
        {/* Back button (mobile) */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="md:hidden p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Avatar */}
        <Avatar
          initials={otherUser.avatar}
          size="md"
          showOnline={otherUser.status === 'online'}
        />

        {/* Info section */}
        <div className="flex-1 min-w-0">
          <h2 className="font-medium text-text-primary truncate">{otherUser.name}</h2>
          <p className="text-xs">
            {otherUser.status === 'online' && (
              <span className="text-online font-medium">Online</span>
            )}
            {otherUser.status === 'away' && (
              <span className="text-yellow-400 font-medium">Away</span>
            )}
            {otherUser.status === 'offline' && (
              <span className="text-text-secondary">
                Last seen {otherUser.lastSeen}
              </span>
            )}
          </p>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-1">
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
        {localMessages.map((msg, index) => {
          const dateKey = getDateKey(msg.timestamp);
          const prevDateKey =
            index > 0 ? getDateKey(localMessages[index - 1].timestamp) : null;
          const showDateSeparator = dateKey !== prevDateKey;

          const isSent = msg.senderId === 'user-0';
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
                className={`flex w-full ${isSent ? 'justify-end' : 'justify-start'} ${
                  isFirstInGroup ? 'mt-3' : 'mt-1'
                }`}
              >
                <div
                  className={`flex flex-col ${
                    isSent ? 'items-end' : 'items-start'
                  } max-w-[70%]`}
                >
                  {/* Bubble */}
                  <div
                    className={`px-4 py-2 w-fit break-words text-sm leading-relaxed ${
                      isSent
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
                        className={`text-[10px] ${
                          msg.status === 'read'
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
            disabled={!messageInput.trim()}
            aria-label="Send message"
            className={`p-2.5 rounded-full transition-all ${
              messageInput.trim()
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
