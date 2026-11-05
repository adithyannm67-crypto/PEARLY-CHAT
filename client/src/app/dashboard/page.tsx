'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import { useSupabase } from '@/components/AuthProvider';
import { authFetch } from '@/lib/authFetch';
import type { ChatUser, ConnectionRequest, Conversation } from '@/types/chat';

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

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionRequestsError, setConnectionRequestsError] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!authLoading && !userId) {
      router.replace('/auth/login');
    }
  }, [authLoading, router, userId]);

  const loadConversations = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError('');

    try {
      const response = await authFetch('/api/conversations', {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load conversations');
      }

      setConversations(data.data?.conversations ?? []);
      setCurrentUser(data.data?.currentUser ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load conversations'
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadConnectionRequests = useCallback(async () => {
    if (!userId) return;

    setConnectionRequestsError('');

    try {
      const response = await authFetch(
        '/api/connection-requests?direction=incoming',
        { cache: 'no-store' }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load connection requests');
      }

      setConnectionRequests(data.data?.requests ?? []);
    } catch (err) {
      setConnectionRequestsError(
        err instanceof Error
          ? err.message
          : 'Failed to load connection requests'
      );
    }
  }, [userId]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadConversations();
      void loadConnectionRequests();
    });
  }, [loadConnectionRequests, loadConversations]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`dashboard-messages:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as {
            conversation_id: string;
            content: string;
            created_at: string;
          };

          setConversations((previous) => {
            const index = previous.findIndex(
              (conversation) => conversation.id === row.conversation_id
            );

            if (index === -1) return previous;

            const next = [...previous];
            next[index] = {
              ...next[index],
              lastMessage: row.content,
              lastMessageTime: row.created_at,
            };

            return next.sort(
              (a, b) =>
                new Date(b.lastMessageTime).getTime() -
                new Date(a.lastMessageTime).getTime()
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_requests',
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          loadConnectionRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connection_requests',
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          loadConnectionRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connection_requests',
          filter: `sender_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { status?: string };

          if (row.status === 'accepted') {
            loadConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConnectionRequests, loadConversations, supabase, userId]);

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

  const handleAcceptRequest = async (requestId: string) => {
    const response = await authFetch('/api/connection-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action: 'accept' }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to accept connection request');
    }

    setConnectionRequests((prev) =>
      prev.filter((request) => request.id !== requestId)
    );

    if (data.data?.conversation) {
      handleConversationCreated(data.data.conversation);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const response = await authFetch('/api/connection-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action: 'reject' }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to decline connection request');
    }

    setConnectionRequests((prev) =>
      prev.filter((request) => request.id !== requestId)
    );
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
            connectionRequests={userId ? connectionRequests : []}
            connectionRequestsError={userId ? connectionRequestsError : ''}
            loading={displayLoading}
            error={displayError}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
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
