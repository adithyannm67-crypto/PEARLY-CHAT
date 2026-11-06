
import type { Conversation, ChatUser } from '@/types/chat';
import Avatar from '@/components/Avatar';

import { formatTime } from '@/lib/utils/formatDate-time';

import { Trash2 } from 'lucide-react';


const ConversationList = ({
  error,
  loading,
  filteredConversations,
  noConversationsFound,
  selectedConversationId,
  onSelectConversation,
  onDeleteConversation,
  onlineUsers,
}: {
  error: string;
  loading: boolean;
  filteredConversations: Conversation[];
  noConversationsFound: boolean;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation?: (conversationId: string) => Promise<void>;
  onlineUsers: Map<string, boolean>;
}) => {
  return (
    <div className="flex-1 overflow-y-auto">
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
            onlineUsers={onlineUsers}
            onDeleteConversation={onDeleteConversation}
            preview={preview}
          />
        );
      })}
    </div>
  );
};
export default ConversationList;


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
  preview: string;
  onlineUsers: Map<string, boolean>;
  onDeleteConversation?: (conversationId: string) => Promise<void>;
}

const ConversationItem = ({
  conversation,
  isSelected,
  onSelectConversation,
  otherUser,
  formatTime,
  onlineUsers,
  onDeleteConversation,
  preview,
}: ConversationItemProps) => {
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
        showOnline={onlineUsers.get(otherUser.id) === true}
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
};
