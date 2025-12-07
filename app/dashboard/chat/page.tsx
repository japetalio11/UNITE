"use client";
import React, { useState } from "react";
import { ChatList, ChatWindow, ChatDetails } from "@/components/chat";

export default function ChatPage() {
  const [selected, setSelected] = useState<string | null>("1");

  return (
    <div className="h-screen w-full flex bg-white font-sans text-slate-900">
      {/* Left column: Chat list */}

      {/* Chat List Column */}
      <div className="w-[340px] h-full">
        <ChatList onSelect={(id) => setSelected(id)} />
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 h-full min-w-0 border-l border-r border-gray-100">
        <ChatWindow selected={selected} />
      </div>

      {/* Right Details Panel */}
      <div className="w-[320px] h-full hidden xl:block">
        <ChatDetails />
      </div>
    </div>
  );
}