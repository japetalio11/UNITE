"use client";

import React from "react";
import { User } from "@heroui/user";
import { Kbd } from "@heroui/kbd";
import { Button } from "@heroui/button";
import { ChevronDown, Magnifier } from "@gravity-ui/icons";

/**
 * Topbar Component
 *
 * A top navigation bar with user profile and global search functionality.
 * Features HeroUI User component with dropdown and search with keyboard shortcut.
 */

interface TopbarProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onUserClick?: () => void;
  onSearch?: (query: string) => void;
}

export default function Topbar({
  userName = "Bicol Medical Center",
  userEmail = "bmc@gmail.com",
  userAvatar = "",
  onUserClick,
  onSearch,
}: TopbarProps) {
  const handleSearchButtonClick = () => {
    // Invoke parent-provided handler if present (public pages may noop)
    if (onSearch) onSearch("");
  };

  // Handle keyboard shortcuts (Win+K or Cmd+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("topbar-search-button")?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="w-full bg-white border-default">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left side - User Profile */}
        <div className="hidden sm:flex items-center gap-3">
          <User
            avatarProps={{
              src: userAvatar,
              size: "sm",
              className: "bg-orange-400 text-white",
            }}
            classNames={{
              base: "cursor-pointer",
              name: "font-semibold text-gray-900 text-sm",
              description: "text-defau  lt text-xs",
            }}
            description={userEmail}
            name={userName}
            onClick={onUserClick}
          />

          {/* Dropdown chevron */}
          <button aria-label="User menu" onClick={onUserClick}>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Right side - Search Input (hidden on mobile) */}
        <div>
          <Button
            className=" hidden sm:inline-flex text-default bg-gray-100 borderursor-pointer text-xs"
            radius="lg"
            size="md"
            id="topbar-search-button"
            onClick={handleSearchButtonClick}
          >
            <div className="flex items-center gap-2">
              <Magnifier className="w-4 h-4" />
              <span>Search files...</span>
            </div>
            <Kbd className="hidden sm:inline-flex" keys={["command"]}>
              K
            </Kbd>
          </Button>
        </div>
        {/* Mobile drawer moved to parent page for centralized control */}
      </div>
    </div>
  );
}
