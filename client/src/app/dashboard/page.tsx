'use client';

import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime';
import { ArrowLeft } from 'lucide-react';

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
    setConversations,
    loadConversations,
    loadConnectionRequests,
    loadSentConnectionRequests,
    loadRequestHistory,
    showChat,
    handleBack,
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
        <ChatArea />
        {showChat && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back to conversations"
            className="absolute left-3 top-3 z-20 p-2 rounded-lg bg-black/60 text-white hover:bg-black/70 transition-colors cursor-pointer md:hidden touch-target"
          >
            <ArrowLeft size={20} />
          </button>
        )}
      </main>
    </div>
  );
}
