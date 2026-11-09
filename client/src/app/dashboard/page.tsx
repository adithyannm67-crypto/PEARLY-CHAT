'use client';

import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime';

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardInner />
    </DashboardProvider>
  );
}

function DashboardInner() {
  const {
    supabase,
    userId,
    authLoading,
    isAuthenticated,
    setConversations,
    loadConversations,
    loadConnectionRequests,
    loadSentConnectionRequests,
    loadRequestHistory,
    showChat,
  } = useDashboard();

  useDashboardRealtime({
    userId,
    supabase,
    setConversations,
    loadConversations,
    loadConnectionRequests,
    loadSentConnectionRequests,
    loadRequestHistory,
  });

  if (!authLoading && !isAuthenticated) {
    throw new Error('You must be signed in to access the dashboard.');
  }

  return (
    <div className="h-full flex overflow-hidden dvh no-pull-to-refresh">
      {/* Mobile: conversation list full-width when not in chat view */}
      {!showChat && (
        <aside className="relative flex flex-col h-full bg-bg-secondary select-none w-full border-r border-border-custom md:hidden">
          <Sidebar />
        </aside>
      )}

      {/* Desktop: always show sidebar alongside chat */}
      <aside className="hidden md:flex flex-col h-full bg-bg-secondary select-none md:w-[420px] lg:w-[480px] flex-shrink-0 border-r border-border-custom">
        <Sidebar />
      </aside>

      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {showChat ? (
          <ChatArea />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-bg-main">
            <div className="text-center">
              <p className="text-text-secondary text-sm">
                Select a conversation to start chatting
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
