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

export default function ChatPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  // Initialize user info from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("unite_user");
      if (raw) {
        const u = JSON.parse(raw);
        const first =
          u.First_Name ||
          u.FirstName ||
          u.first_name ||
          u.firstName ||
          u.First ||
          "";
        const middle =
          u.Middle_Name ||
          u.MiddleName ||
          u.middle_name ||
          u.middleName ||
          u.Middle ||
          "";
        const last =
          u.Last_Name ||
          u.LastName ||
          u.last_name ||
          u.lastName ||
          u.Last ||
          "";
        const parts = [first, middle, last]
          .map((p: any) => (p || "").toString().trim())
          .filter(Boolean);
        const full = parts.join(" ");
        const email =
          u.Email || u.email || u.Email_Address || u.emailAddress || "";

        if (full) setCurrentUserName(full);
        else if (u.name) setCurrentUserName(u.name);
        if (email) setCurrentUserEmail(email);
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
      <div className="h-screen w-full flex bg-white font-sans text-slate-900 overflow-hidden">
        {/* Mobile Navigation Drawer (right-side) - matches Calendar page pattern */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="ml-auto w-3/4 max-w-sm bg-white h-full shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold">{currentUserName || "User"}</div>
                  <div className="text-xs text-default-500">{currentUserEmail || ""}</div>
                </div>
                <button
                  aria-label="Close navigation"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-2 text-xl hover:bg-gray-100 rounded transition-colors"
                >
                  ✕
                </button>
              </div>

              <nav className="flex flex-col gap-3">
                <a className="flex items-center gap-3 text-sm hover:bg-gray-100 p-2 rounded transition-colors" href="/dashboard/campaign">
                  <Ticket className="w-5 h-5" />
                  Campaign
                </a>
                <a className="flex items-center gap-3 text-sm hover:bg-gray-100 p-2 rounded transition-colors" href="/dashboard/calendar">
                  <CalIcon className="w-5 h-5" />
                  Calendar
                </a>
                <a className="flex items-center gap-3 text-sm hover:bg-gray-100 p-2 rounded transition-colors bg-gray-50 font-semibold" href="/dashboard/chat">
                  <Comments className="w-5 h-5" />
                  Chat
                </a>
                <a className="flex items-center gap-3 text-sm hover:bg-gray-100 p-2 rounded transition-colors" href="/dashboard/stakeholder-management">
                  <PersonPlanetEarth className="w-5 h-5" />
                  Stakeholders
                </a>
                <a className="flex items-center gap-3 text-sm hover:bg-gray-100 p-2 rounded transition-colors" href="/dashboard/coordinator-management">
                  <Persons className="w-5 h-5" />
                  Coordinators
                </a>
                <a className="flex items-center gap-3 text-sm hover:bg-gray-100 p-2 rounded transition-colors" href="/dashboard/notification">
                  <Bell className="w-5 h-5" />
                  Notifications
                </a>
                <a className="flex items-center gap-3 text-sm hover:bg-gray-100 p-2 rounded transition-colors" href="/dashboard/settings">
                  <Gear className="w-5 h-5" />
                  Settings
                </a>
                <a className="flex items-center gap-3 text-sm text-danger hover:bg-red-50 p-2 rounded transition-colors" href="/auth/login">
                  Logout
                </a>
              </nav>
            </div>
            <div className="flex-1" onClick={() => setMobileNavOpen(false)} />
          </div>
        )}

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
            onMobileNavOpen={() => setMobileNavOpen(true)}
            showMobileNav={isMobile}
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