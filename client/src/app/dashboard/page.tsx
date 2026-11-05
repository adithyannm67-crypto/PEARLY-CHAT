'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import { useSupabase } from '@/components/AuthProvider';
import { authFetch } from '@/lib/authFetch';
import type { ChatUser, ConnectionRequest } from '@/types/chat';
import { useConversations } from '@/hooks/useConversations';
import { useConnectionRequests } from '@/hooks/useConnectionRequests';
import { useSentConnectionRequests } from '@/hooks/useSentConnectionRequests';
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime';

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
  const { session, loading: authLoading, signOut, supabase } = useSupabase();
  const userId = session?.user?.id ?? null;

  const {
    conversations,
    setConversations,
    currentUser,
    loading,
    error,
    loadConversations,
    deleteConversation,
    handleConversationCreated,
  } = useConversations(userId);

  const {
    requests: connectionRequests,
    error: connectionRequestsError,
    loading: connectionRequestsLoading,
    loadConnectionRequests,
    acceptRequest,
    rejectRequest,
  } = useConnectionRequests(userId);

  const {
    requests: sentConnectionRequests,
    error: sentConnectionRequestsError,
    loading: sentConnectionRequestsLoading,
    setRequests: setSentConnectionRequests,
    loadSentConnectionRequests,
  } = useSentConnectionRequests(userId);

  const [requestHistory, setRequestHistory] = useState<ConnectionRequest[]>([]);

  const loadRequestHistory = async () => {
    if (!userId) return;

    try {
      const [incomingResponse, outgoingResponse] = await Promise.all([
        authFetch('/api/connection-requests?direction=incoming&status=all', {
          cache: 'no-store',
        }),
        authFetch('/api/connection-requests?direction=outgoing&status=all', {
          cache: 'no-store',
        }),
      ]);
      const incomingData = await incomingResponse.json();
      const outgoingData = await outgoingResponse.json();

      const incoming = incomingData.data?.requests ?? [];
      const outgoing = outgoingData.data?.requests ?? [];

      setRequestHistory(
        [...incoming, ...outgoing].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    } catch {
      // Keep history best-effort.
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadRequestHistory();
    });
  }, [userId]);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!authLoading && !userId) {
      router.replace('/auth/login');
    }
  }, [authLoading, router, userId]);

  useDashboardRealtime({
    userId,
    supabase,
    setConversations,
    loadConversations,
    loadConnectionRequests,
    loadSentConnectionRequests,
    loadRequestHistory,
  });

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

  const handleAcceptRequest = async (requestId: string) => {
    const conversation = await acceptRequest(requestId);
    if (conversation) {
      handleConversationCreated(conversation);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    await rejectRequest(requestId);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    await deleteConversation(conversationId);
    if (selectedConversationId === conversationId) {
      setSelectedConversationId(null);
      setShowChat(false);
    }
  };

  const handleUserUpdated = (user: ChatUser) => {
    // no-op: currentUser managed by useConversations
    void user;
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
      <div
        className={`${showChat ? 'hidden' : 'flex'} md:flex w-full md:w-[340px] lg:w-[380px] flex-shrink-0 border-r border-border-custom`}
      >
        <div className="w-full">
          <Sidebar
            currentUser={displayCurrentUser}
            conversations={displayConversations}
            connectionRequests={userId ? connectionRequests : []}
            connectionRequestsError={userId ? connectionRequestsError : ''}
            connectionRequestsLoading={userId ? connectionRequestsLoading : false}
            sentConnectionRequests={userId ? sentConnectionRequests : []}
            sentConnectionRequestsError={userId ? sentConnectionRequestsError : ''}
            sentConnectionRequestsLoading={userId ? sentConnectionRequestsLoading : false}
            requestHistory={userId ? requestHistory : []}
            loading={displayLoading}
            error={displayError}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
            onDeleteConversation={handleDeleteConversation}
            onConnectionRequestSent={(request) => {
              setSentConnectionRequests((prev) => [
                request,
                ...prev.filter((item) => item.id !== request.id),
              ]);
              void loadRequestHistory();
            }}
            onUserUpdated={handleUserUpdated}
            onLogout={handleLogout}
          />
        </div>
      </div>

      <div
        className={`${showChat ? 'flex' : 'hidden'} md:flex flex-1 min-w-0`}
      >
        <div className="w-full h-full">
          <ChatArea
            key={selectedConversationId ?? 'empty'}
            currentUserId={userId}
            conversation={selectedConversation}
            onBack={handleBack}
          />
        </div>
      </div>
    </div>
  );
}
