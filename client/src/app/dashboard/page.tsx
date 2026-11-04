'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import { useSupabase } from '@/components/AuthProvider';
import type { ChatUser, Conversation } from '@/types/chat';

export default function Dashboard() {
  const { session } = useSupabase();
  const userId = session?.user?.id ?? null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function loadConversations() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(
          `/api/conversations?userId=${encodeURIComponent(userId!)}`,
          { cache: 'no-store' }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load conversations');
        }

        if (!cancelled) {
          setConversations(data.data?.conversations ?? []);
          setCurrentUser(data.data?.currentUser ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load conversations');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadConversations();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setShowChat(true);
  };

  const handleBack = () => {
    setShowChat(false);
  };

  const displayConversations = userId ? conversations : [];
  const displayCurrentUser = userId ? currentUser : null;
  const displayLoading = userId ? loading : false;
  const displayError = userId ? error : 'Please sign in to view your conversations.';

  const selectedConversation =
    displayConversations.find(
      (conversation) => conversation.id === selectedConversationId
    ) ?? null;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar — always visible on desktop, conditionally on mobile */}
      <div
        className={`${showChat ? 'hidden' : 'flex'} md:flex w-full md:w-[340px] lg:w-[380px] flex-shrink-0 border-r border-border-custom`}
      >
        <div className="w-full">
          <Sidebar
            currentUser={displayCurrentUser}
            conversations={displayConversations}
            loading={displayLoading}
            error={displayError}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
          />
        </div>
      </div>

      {/* Chat Area — always visible on desktop, conditionally on mobile */}
      <div
        className={`${showChat ? 'flex' : 'hidden'} md:flex flex-1 min-w-0`}
      >
        <div className="w-full h-full">
          <ChatArea
            currentUserId={userId}
            conversation={selectedConversation}
            onBack={handleBack}
          />
        </div>
      </div>
    </div>
  );
}
