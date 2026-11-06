'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/context/AuthProvider';
import { authFetch } from '@/lib/authFetch';
import type { ChatUser, ConnectionRequest, Conversation } from '@/types/chat';
import { usePresence } from '@/hooks/usePresence';
import { useConversations } from '@/hooks/useConversations';
import { useConnectionRequests } from '@/hooks/useConnectionRequests';
import { useSentConnectionRequests } from '@/hooks/useSentConnectionRequests';
import getInitials from '@/lib/utils/getInitials';

interface DashboardContextValue {
  session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null } | null;
  supabase: ReturnType<typeof useSupabase>['supabase'];
  signOut: ReturnType<typeof useSupabase>['signOut'];
  router: ReturnType<typeof useRouter>;

  userId: string | null;
  currentUser: ChatUser | null;

  onlineUsers: Map<string, boolean>;
  setOwnStatus: (isOnline: boolean) => Promise<void>;
  isOwnOnline: boolean;

  conversations: Conversation[];
  setConversations: (value: Conversation[] | ((prev: Conversation[]) => Conversation[])) => void;
  loading: boolean;
  error: string;
  loadConversations: () => void | Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  handleConversationCreated: (conversation: Conversation) => void;

  connectionRequests: ConnectionRequest[];
  connectionRequestsError: string;
  connectionRequestsLoading: boolean;
  loadConnectionRequests: () => void | Promise<void>;
  acceptRequest: (requestId: string) => Promise<Conversation | null>;
  rejectRequest: (requestId: string) => Promise<void>;

  sentConnectionRequests: ConnectionRequest[];
  sentConnectionRequestsError: string;
  sentConnectionRequestsLoading: boolean;
  loadSentConnectionRequests: () => void | Promise<void>;
  setSentConnectionRequests: (requests: ConnectionRequest[]) => void;
  cancelRequest: (requestId: string) => Promise<void>;

  requestHistory: ConnectionRequest[];
  setRequestHistory: (requests: ConnectionRequest[]) => void;
  loadRequestHistory: () => void | Promise<void>;

  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  requestsOpen: boolean;
  setRequestsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  requestTab: 'incoming' | 'sent' | 'history';
  setRequestTab: (tab: 'incoming' | 'sent' | 'history') => void;
  historyTab: 'received' | 'sent';
  setHistoryTab: (tab: 'received' | 'sent') => void;
  activeModal: 'new-chat' | 'settings' | null;
  setActiveModal: (modal: 'new-chat' | 'settings' | null) => void;

  handleSelectConversation: (id: string) => void;
  handleBack: () => void;
  handleLogout: () => Promise<void>;
  handleAcceptRequest: (requestId: string) => Promise<void>;
  handleRejectRequest: (requestId: string) => Promise<void>;
  handleDeleteConversation: (conversationId: string) => Promise<void>;
  handleUserUpdated: (user: ChatUser) => void;
  onConnectionRequestSent: (request: ConnectionRequest) => void;

  displayConversations: Conversation[];
  displayCurrentUser: ChatUser | null;
  displayLoading: boolean;
  displayError: string;
  selectedConversation: Conversation | null;
  sessionName: string;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, loading: authLoading, signOut, supabase } = useSupabase();
  const userId = session?.user?.id ?? null;

  const { onlineUsers, setOwnStatus, isOwnOnline } = usePresence(userId);

  const {
    conversations,
    setConversations,
    currentUser: conversationsCurrentUser,
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
    cancelRequest,
  } = useSentConnectionRequests(userId);

  const [requestHistory, setRequestHistory] = useState<ConnectionRequest[]>([]);

  const loadRequestHistory = useCallback(async () => {
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
  }, [userId]);

  useEffect(() => {
    void loadRequestHistory();
  }, [userId, loadRequestHistory]);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(true);
  const [requestTab, setRequestTab] = useState<'incoming' | 'sent' | 'history'>('incoming');
  const [historyTab, setHistoryTab] = useState<'received' | 'sent'>('received');
  const [activeModal, setActiveModal] = useState<'new-chat' | 'settings' | null>(null);

  useEffect(() => {
    if (!authLoading && !userId) {
      router.replace('/auth/login');
    }
  }, [authLoading, router, userId]);

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

  const handleUserUpdated = useCallback((user: ChatUser) => {
    void user;
  }, []);

  const onConnectionRequestSent = useCallback((request: ConnectionRequest) => {
    setSentConnectionRequests((prev) => [
      request,
      ...prev.filter((item) => item.id !== request.id),
    ]);
    void loadRequestHistory();
  }, [loadRequestHistory]);

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
        status: isOwnOnline ? 'online' : 'offline',
        lastSeen: '',
      }
    : null;

  const displayConversations = userId ? conversations : [];
  const displayCurrentUser = userId
    ? conversationsCurrentUser ?? fallbackUser
    : null;
  const displayLoading = userId ? loading : false;
  const displayError = userId
    ? error
    : 'Please sign in to view your conversations.';

  const selectedConversation =
    displayConversations.find(
      (conversation) => conversation.id === selectedConversationId
    ) ?? null;

  const value = useMemo<DashboardContextValue>(
    () => ({
      session,
      supabase,
      signOut,
      router,
      userId,
      currentUser: conversationsCurrentUser,
      onlineUsers,
      setOwnStatus,
      isOwnOnline,
      conversations,
      setConversations,
      loading,
      error,
      loadConversations,
      deleteConversation,
      handleConversationCreated,
      connectionRequests,
      connectionRequestsError,
      connectionRequestsLoading,
      loadConnectionRequests,
      acceptRequest,
      rejectRequest,
      sentConnectionRequests,
      sentConnectionRequestsError,
      sentConnectionRequestsLoading,
      loadSentConnectionRequests,
      setSentConnectionRequests,
      cancelRequest,
      requestHistory,
      setRequestHistory,
      loadRequestHistory,
      selectedConversationId,
      setSelectedConversationId,
      showChat,
      setShowChat,
      requestsOpen,
      setRequestsOpen,
      requestTab,
      setRequestTab,
      historyTab,
      setHistoryTab,
      activeModal,
      setActiveModal,
      handleSelectConversation,
      handleBack,
      handleLogout,
      handleAcceptRequest,
      handleRejectRequest,
      handleDeleteConversation,
      handleUserUpdated,
      onConnectionRequestSent,
      displayConversations,
      displayCurrentUser,
      displayLoading,
      displayError,
      selectedConversation,
      sessionName,
    }),
    [
      session,
      supabase,
      signOut,
      router,
      userId,
      conversationsCurrentUser,
      onlineUsers,
      setOwnStatus,
      isOwnOnline,
      conversations,
      setConversations,
      loading,
      error,
      loadConversations,
      deleteConversation,
      handleConversationCreated,
      connectionRequests,
      connectionRequestsError,
      connectionRequestsLoading,
      loadConnectionRequests,
      acceptRequest,
      rejectRequest,
      sentConnectionRequests,
      sentConnectionRequestsError,
      sentConnectionRequestsLoading,
      loadSentConnectionRequests,
      setSentConnectionRequests,
      cancelRequest,
      requestHistory,
      setRequestHistory,
      loadRequestHistory,
      selectedConversationId,
      setSelectedConversationId,
      showChat,
      setShowChat,
      requestsOpen,
      setRequestsOpen,
      requestTab,
      setRequestTab,
      historyTab,
      setHistoryTab,
      activeModal,
      setActiveModal,
      handleSelectConversation,
      handleBack,
      handleLogout,
      handleAcceptRequest,
      handleRejectRequest,
      handleDeleteConversation,
      handleUserUpdated,
      onConnectionRequestSent,
      displayConversations,
      displayCurrentUser,
      displayLoading,
      displayError,
      selectedConversation,
      sessionName,
    ]
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
