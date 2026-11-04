"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";

export default function Dashboard() {
  throw new Error("Dashboard page is not implemented yet.");
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [showChat, setShowChat] = useState(false);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setShowChat(true);
  };

  const handleBack = () => {
    setShowChat(false);
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar — always visible on desktop, conditionally on mobile */}
      <div
        className={`${
          showChat ? "hidden" : "flex"
        } md:flex w-full md:w-[340px] lg:w-[380px] flex-shrink-0 border-r border-border-custom`}
      >
        <div className="w-full">
          <Sidebar
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
          />
        </div>
      </div>

      {/* Chat Area — always visible on desktop, conditionally on mobile */}
      <div
        className={`${
          showChat ? "flex" : "hidden"
        } md:flex flex-1 min-w-0`}
      >
        <div className="w-full h-full">
          <ChatArea
            conversationId={selectedConversationId}
            onBack={handleBack}
          />
        </div>
      </div>
    </div>
  );
}
