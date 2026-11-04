'use client';

import { useState } from 'react';
import { SquarePen, Settings, Search, LogOut } from 'lucide-react';
import Avatar from '@/components/Avatar';
import type { ChatUser, Conversation } from '@/types/chat';

interface SidebarProps {
  currentUser: ChatUser | null;
  conversations: Conversation[];
  loading: boolean;
  error: string;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onLogout: () => void;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';

  const now = new Date();

  // If same day as today: return HH:MM format (e.g. '14:30')
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // If yesterday: return 'Yesterday'
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return 'Yesterday';
  }

  // Otherwise: return 'MMM DD' (e.g. 'Nov 02')
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
  });
}

export default function Sidebar({
  currentUser,
  conversations,
  loading,
  error,
  selectedConversationId,
  onSelectConversation,
  onLogout,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((conversation) => {
    const otherUser = conversation.otherUser;
    if (!otherUser) return false;
    return (
      otherUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      otherUser.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <aside className="flex flex-col h-full bg-bg-secondary select-none">
      {/* 1. Header (fixed at top of sidebar) */}
      <header className="h-16 bg-bg-secondary border-b border-border-custom px-4 flex items-center justify-between shrink-0">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <Avatar
            initials={currentUser?.avatar ?? '?'}
            size="sm"
            showOnline
          />
          <span className="font-semibold text-lg text-text-primary">Chats</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="New chat"
            className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <SquarePen size={18} />
          </button>
          <button
            type="button"
            aria-label="Settings"
            className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <Settings size={18} />
          </button>
          <button
            type="button"
            aria-label="Log out"
            title="Log out"
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* 2. Search bar */}
      <div className="px-3 py-3 shrink-0">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-surface border-none rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* 3. Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-6 text-center text-sm text-text-secondary">
            Loading conversations...
          </div>
        )}

        {!loading && error && (
          <div className="p-6 text-center text-sm text-error">{error}</div>
        )}

        {!loading && !error && filteredConversations.map((conversation) => {
          const otherUser = conversation.otherUser;
          if (!otherUser) return null;

          const isSelected = conversation.id === selectedConversationId;
          const preview = conversation.lastMessage || 'No messages yet';

          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelectConversation(conversation.id)}
              className={`w-full text-left px-3 py-3 flex items-center gap-3 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : 'border-l-2 border-l-transparent hover:bg-surface/50'
              }`}
            >
              <Avatar
                initials={otherUser.avatar}
                size="md"
                showOnline={otherUser.status === 'online'}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-text-primary truncate">
                    {otherUser.name}
                  </span>
                  <span className="text-[11px] text-text-secondary whitespace-nowrap ml-2">
                    {formatTime(conversation.lastMessageTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-text-secondary truncate">
                    {preview.slice(0, 45)}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <span className="min-w-[20px] h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-medium px-1.5 shrink-0 ml-2">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {!loading && !error && filteredConversations.length === 0 && (
          <div className="p-6 text-center text-sm text-text-secondary">
            No conversations found
          </div>
        )}
      </div>
    </aside>
  );
}
