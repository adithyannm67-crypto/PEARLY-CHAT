'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import { useSupabase } from '@/components/AuthProvider';
import type { ChatUser, Conversation } from '@/types/chat';

function getInitials(value: string): string {
  const source = value.trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export default function Dashboard() {
  const router = useRouter();
  const { session, signOut } = useSupabase();
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

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const handleConversationCreated = (conversation: Conversation) => {
    setConversations((prev) => [
      conversation,
      ...prev.filter((item) => item.id !== conversation.id),
    ]);
    setSelectedConversationId(conversation.id);
    setShowChat(true);
  };

  const handleUserUpdated = (user: ChatUser) => {
    setCurrentUser(user);
  };

  const sessionUser = session?.user;
  const sessionName =
    (sessionUser?.user_metadata?.name as string | undefined) ||
    (sessionUser?.user_metadata?.username as string | undefined) ||
    sessionUser?.email ||
    'You';
  const fallbackUser: ChatUser | null = userId
    ? {
        id: userId,
        name: sessionName,
        username: (sessionUser?.user_metadata?.username as string | undefined) || '',
        email: sessionUser?.email || '',
        avatar: getInitials(sessionName),
        status: 'online',
        lastSeen: '',
      }
    : null;

  const displayConversations = userId ? conversations : [];
  const displayCurrentUser = userId ? currentUser ?? fallbackUser : null;
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
            onConversationCreated={handleConversationCreated}
            onUserUpdated={handleUserUpdated}
            onLogout={handleLogout}
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
