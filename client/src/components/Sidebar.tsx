'use client';

import { useEffect, useState } from 'react';
import { SquarePen, Settings, Search, LogOut, Bell, Trash2 } from 'lucide-react';
import Avatar from '@/components/Avatar';
import ConnectionRequests from '@/components/ConnectionRequests';
import RequestHistory from '@/components/RequestHistory/RequestHistory';
import NewChatModal from '@/components/NewChatModal';
import SettingsModal from '@/components/SettingsModal';
import type { ChatUser, ConnectionRequest, Conversation } from '@/types/chat';

import { formatTime } from '@/lib/utils/formatDate-time';

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


  const noConversationsFound = !loading && !error && filteredConversations.length === 0;

  const requestsToShow = requestHistory.length > 0
    ? requestHistory
    : [...connectionRequests, ...sentConnectionRequests];

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
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {/* 3. Connection requests */}

      {requestsOpen && (
        <div className="absolute top-16 left-0 right-0 z-20 mx-3 rounded-lg border border-border-custom bg-bg-secondary shadow-lg max-h-96 overflow-y-auto">
          <RequestHistory userId={currentUser?.id ?? null} />
        </div>
      )}

      {/* 4. Conversation list */}
      <ConversationList
        error={error}
        loading={loading}
        filteredConversations={filteredConversations}
        noConversationsFound={noConversationsFound}
        selectedConversationId={selectedConversationId}
        onSelectConversation={onSelectConversation}
        onDeleteConversation={onDeleteConversation}
      />

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

const RequestTabs = ({ requestsToShow }: { requestsToShow: ConnectionRequest[] }) => {
  return (<div className="absolute top-16 left-0 right-0 z-20 mx-3 rounded-lg border border-border-custom bg-bg-secondary shadow-lg">
    <div className="max-h-64 overflow-y-auto">
      <ConnectionRequests
        requests={requestsToShow}
        mode="history"
        title="Requests"
      />
    </div>
  </div>)
}

const SearchBar = ({ searchQuery, setSearchQuery }: { searchQuery: string; setSearchQuery: (query: string) => void }) => {
  return (
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
  )

}


const ConversationList = ({
  error,
  loading,
  filteredConversations,
  noConversationsFound,
  selectedConversationId,
  onSelectConversation,
  onDeleteConversation,
}: {
  error: string;
  loading: boolean;
  filteredConversations: Conversation[];
  noConversationsFound: boolean;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation?: (conversationId: string) => Promise<void>;
}) => {
  return (<div className="flex-1 overflow-y-auto">
    {loading && <LoadingConversations />}

    {!loading && error && <ErrorConversations error={error} />}

    {noConversationsFound && (
      <div className="p-6 text-center text-sm text-text-secondary">
        No conversations found
      </div>
    )}

    {!loading && !error && filteredConversations.map((conversation) => {
      const otherUser = conversation.otherUser;
      if (!otherUser) return null;

      const isSelected = conversation.id === selectedConversationId;
      const preview = conversation.lastMessage || 'No messages yet';

      return (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isSelected={isSelected}
          onSelectConversation={onSelectConversation}
          otherUser={otherUser}
          formatTime={formatTime}
          onDeleteConversation={onDeleteConversation}
          preview={preview}
        />
      );
    })}


  </div>)
}


const ErrorConversations = ({ error }: { error: string }) => (
  <div className="p-6 text-center text-sm text-error">{error}</div>
);


const LoadingConversations = () => (
  <div className="p-6 text-center text-sm text-text-secondary">
    Loading conversations...
  </div>
);

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelectConversation: (id: string) => void;
  otherUser: ChatUser;
  formatTime: (timestamp: string) => string;
  onDeleteConversation?: (conversationId: string) => Promise<void>;
  preview: string;
}

const ConversationItem = ({ conversation, isSelected, onSelectConversation, otherUser, formatTime, onDeleteConversation, preview }: ConversationItemProps) => {
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
      className={`w-full text-left px-3 py-3 flex items-center gap-3 transition-colors cursor-pointer ${isSelected
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
  )
}