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
    setConversations,
    loadConversations,
    loadConnectionRequests,
    loadSentConnectionRequests,
    loadRequestHistory,
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
    <div className="h-full flex overflow-hidden">
      <Sidebar />
      <ChatArea />
    </div>
  );
}
