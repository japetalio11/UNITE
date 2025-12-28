"use client";
import React, { useState, useEffect } from "react";
import { ChatList, ChatWindow, ChatDetails } from "@/components/chat";
import { ChatProvider } from "@/contexts/ChatContext";
import { getUserInfo } from "@/utils/getUserInfo";
import {
  Ticket,
  Calendar as CalIcon,
  PersonPlanetEarth,
  Persons,
  Bell,
  Gear,
  Comments,
} from "@gravity-ui/icons";
import MobileNav from "@/components/tools/mobile-nav";

export default function ChatPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

  // Detect mobile viewport
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    if (typeof window !== "undefined") {
      checkViewport();
      window.addEventListener("resize", checkViewport);
      return () => window.removeEventListener("resize", checkViewport);
    }
  }, []);

  // Initialize user info from localStorage using getUserInfo utility
  useEffect(() => {
    try {
      const userInfo = getUserInfo();
      if (userInfo.displayName) {
        setCurrentUserName(userInfo.displayName);
      }
      if (userInfo.email) {
        setCurrentUserEmail(userInfo.email);
      }
    } catch (err) {
      // ignore malformed localStorage entry
    }
  }, []);

  // Handle back button - return to chat list on mobile
  const handleBack = () => {
    setSelected(null);
  };

  return (
    <ChatProvider>
      <div className="relative h-screen w-full flex bg-white font-sans text-slate-900 overflow-hidden">
        {/* Mobile nav component (positioned top-right) */}
        <div className="absolute top-4 right-4 md:hidden z-[9999]">
          <MobileNav currentUserName={currentUserName} currentUserEmail={currentUserEmail} />
        </div>

        {/* Left column: Chat list - visible on desktop, conditionally on mobile */}
        <div
          className={`${
            isMobile && selected
              ? "hidden"
              : isMobile
                ? "w-full"
                : "w-[340px]"
          } h-full transition-all duration-300 ease-in-out border-r border-gray-100`}
        >
          <ChatList
            onSelect={(id) => {
              setSelected(id);
            }}
            onMobileNavOpen={() => {}}
            showMobileNav={false}
          />
        </div>

        {/* Main Chat Window - Facebook Messenger style on mobile */}
        <div
          className={`${
            isMobile && !selected
              ? "hidden"
              : isMobile
                ? "w-full"
                : "flex-1"
          } h-full min-w-0 border-r border-gray-100 transition-all duration-300 ease-in-out`}
        >
          <ChatWindow
            selected={selected}
            onBack={isMobile ? handleBack : undefined}
            showBackButton={isMobile && !!selected}
          />
        </div>

        {/* Right Details Panel - hidden on mobile */}
        <div className="w-[320px] h-full hidden xl:block">
          <ChatDetails />
        </div>
      </div>
    </ChatProvider>
  );
}