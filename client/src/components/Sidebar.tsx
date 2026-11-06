'use client';

import { useState } from 'react';


import RequestHistory from '@/components/sidebar/RequestHistory/RequestHistory';
import NewChatModal from '@/components/sidebar/NewChatModal';
import SettingsModal from '@/components/sidebar/SettingsModal';

import ConversationList from './sidebar/conversationList';
import SearchBar from './sidebar/SearchBar';
import SidebarHeader from './sidebar/sidebarHeader';

import { useDashboard } from '@/context/DashboardContext';


export default function Sidebar() {
  const {
    currentUser,
    conversations,
    connectionRequests,
    sentConnectionRequests,
    requestHistory,
    loading,
    error,
    selectedConversationId,
    handleSelectConversation,
    handleDeleteConversation,
    handleUserUpdated,
    handleLogout,
    onConnectionRequestSent,
    userId,
    requestsOpen,
    setRequestsOpen,
    activeModal,
    setActiveModal,
    onlineUsers,
    isOwnOnline,
  } = useDashboard();

  const [searchQuery, setSearchQuery] = useState('');

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
    <aside className="relative flex flex-col h-full bg-bg-secondary select-none md:w-[420px] lg:w-[480px] flex-shrink-0 border-r border-border-custom">
          <SidebarHeader
            currentUser={currentUser}
            setRequestsOpen={setRequestsOpen}
            connectionRequests={requestsToShow}
            sentConnectionRequests={sentConnectionRequests}
            handleLogout={handleLogout}
            setActiveModal={setActiveModal}
            isOwnOnline={isOwnOnline}
          />
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {requestsOpen && (
        <div className="absolute top-16 left-0 right-0 z-20 mx-3 rounded-lg border border-border-custom bg-bg-secondary shadow-lg max-h-96 overflow-y-auto">
          <RequestHistory userId={userId} />
        </div>
      )}

      <ConversationList
        error={error}
        loading={loading}
        filteredConversations={filteredConversations}
        noConversationsFound={noConversationsFound}
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onlineUsers={onlineUsers}
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
          onUserUpdated={handleUserUpdated}
        />
      )}
    </aside>
  );
}

