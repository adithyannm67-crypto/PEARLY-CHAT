'use client';

import { useState } from 'react';
import { SquarePen, Settings, Search, LogOut, Bell, Trash2 } from 'lucide-react';
import Avatar from '@/components/Avatar';
import ConnectionRequests from '@/components/ConnectionRequests';
import NewChatModal from '@/components/NewChatModal';
import SettingsModal from '@/components/SettingsModal';
import type { ChatUser, ConnectionRequest, Conversation } from '@/types/chat';

interface SidebarProps {
  currentUser: ChatUser | null;
  conversations: Conversation[];
  connectionRequests: ConnectionRequest[];
  connectionRequestsError: string;
  connectionRequestsLoading?: boolean;
  sentConnectionRequests?: ConnectionRequest[];
  sentConnectionRequestsError?: string;
  sentConnectionRequestsLoading?: boolean;
  requestHistory?: ConnectionRequest[];
  loading: boolean;
  error: string;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onAcceptRequest: (requestId: string) => Promise<void>;
  onRejectRequest: (requestId: string) => Promise<void>;
  onDeleteConversation?: (conversationId: string) => Promise<void>;
  onConnectionRequestSent?: (request: ConnectionRequest) => void;
  onUserUpdated: (user: ChatUser) => void;
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
  connectionRequests,
  connectionRequestsError,
  connectionRequestsLoading,
  sentConnectionRequests = [],
  sentConnectionRequestsError = '',
  sentConnectionRequestsLoading = false,
  requestHistory = [],
  loading,
  error,
  selectedConversationId,
  onSelectConversation,
  onAcceptRequest,
  onRejectRequest,
  onDeleteConversation,
  onConnectionRequestSent,
  onUserUpdated,
  onLogout,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<'new-chat' | 'settings' | null>(
    null
  );
  const [requestsOpen, setRequestsOpen] = useState(true);
  const [requestTab, setRequestTab] = useState<'incoming' | 'sent' | 'history'>('incoming');

  const filteredConversations = conversations.filter((conversation) => {
    const otherUser = conversation.otherUser;
    if (!otherUser) return false;
    return (
      otherUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      otherUser.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <aside className="relative flex flex-col h-full bg-bg-secondary select-none">
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
        <div className="flex items-center gap-1 relative">
          <button
            type="button"
            aria-label="Connection requests"
            title="Connection requests"
            onClick={() => setRequestsOpen((value) => !value)}
            className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer relative"
          >
            <Bell size={18} />
            {(connectionRequests.length + sentConnectionRequests.length) > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-medium px-1">
                {connectionRequests.length + sentConnectionRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            aria-label="New chat"
            title="New chat"
            onClick={() => setActiveModal('new-chat')}
            disabled={!currentUser}
            className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SquarePen size={18} />
          </button>
          <button
            type="button"
            aria-label="Settings"
            title="Settings"
            onClick={() => setActiveModal('settings')}
            disabled={!currentUser}
            className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

      {requestsOpen && (
        <div className="absolute top-16 left-0 right-0 z-20 mx-3 rounded-lg border border-border-custom bg-bg-secondary shadow-lg">
          <div className="flex gap-2 p-2 border-b border-border-custom/40">
            <button
              type="button"
              onClick={() => setRequestTab('incoming')}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                requestTab === 'incoming'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-surface'
              }`}
            >
              Incoming ({connectionRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setRequestTab('sent')}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                requestTab === 'sent'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-surface'
              }`}
            >
              Sent ({sentConnectionRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setRequestTab('history')}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                requestTab === 'history'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-surface'
              }`}
            >
              History ({requestHistory.length})
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {requestTab === 'incoming' ? (
              <ConnectionRequests
                requests={connectionRequests}
                error={connectionRequestsError}
                loading={connectionRequestsLoading}
                onAccept={onAcceptRequest}
                onReject={onRejectRequest}
              />
            ) : requestTab === 'sent' ? (
              <ConnectionRequests
                requests={sentConnectionRequests}
                error={sentConnectionRequestsError}
                loading={sentConnectionRequestsLoading}
                mode="outgoing"
                title="Sent requests"
              />
            ) : (
              <ConnectionRequests
                requests={requestHistory}
                mode="history"
                title="Request history"
              />
            )}
          </div>
        </div>
      )}

      {/* 4. Conversation list */}
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
            <div
              key={conversation.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectConversation(conversation.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  onSelectConversation(conversation.id);
                }
              }}
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
              {onDeleteConversation && (
                <button
                  type="button"
                  aria-label="Delete conversation"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDeleteConversation(conversation.id);
                  }}
                  className="ml-2 p-1 rounded-md text-text-secondary hover:text-error hover:bg-surface transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}

        {!loading && !error && filteredConversations.length === 0 && (
          <div className="p-6 text-center text-sm text-text-secondary">
            No conversations found
          </div>
        )}
      </div>

      {activeModal === 'new-chat' && currentUser && (
        <NewChatModal
          currentUserId={currentUser.id}
          onClose={() => setActiveModal(null)}
          onConnectionRequestSent={onConnectionRequestSent}
        />
      )}

      {activeModal === 'settings' && currentUser && (
        <SettingsModal
          currentUser={currentUser}
          onClose={() => setActiveModal(null)}
          onUserUpdated={onUserUpdated}
        />
      )}
    </aside>
  );
}
