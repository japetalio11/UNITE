"use client";

import React, { useState } from "react";
import { User } from "@heroui/user";
import { Input } from "@heroui/input";
import { Kbd } from "@heroui/kbd";
import { Search } from "lucide-react";

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
    onSearch?: (query: string) => void;
    onUserClick?: () => void;
}
    
export default function Topbar({
    userName = "Bicol Medical Center",
    userEmail = "bmc@gmail.com",
    userAvatar = "",
    onSearch,
    onUserClick
    }: TopbarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    
    // Handle search input changes
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        onSearch?.(value);
    };
    
    // Handle keyboard shortcuts (Win+K or Cmd+K)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('topbar-search')?.focus();
        }
        };
    
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    return (
        <div className="w-full bg-white border-gray-200">
        <div className="flex items-center justify-between px-6 py-3">
            {/* Left side - User Profile */}
            <div className="flex items-center gap-3">
            <User
                name={userName}
                description={userEmail}
                avatarProps={{
                src: userAvatar,
                size: "sm",
                className: "bg-orange-400 text-white"
                }}
                classNames={{
                base: "cursor-pointer",
                name: "font-semibold text-gray-900 text-sm",
                description: "text-gray-500 text-xs"
                }}
                onClick={onUserClick}
            />
            
            {/* Dropdown chevron */}
            <button 
                onClick={onUserClick}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="User menu"
            >
                <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                >
                <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 9l-7 7-7-7" 
                />
                </svg>
            </button>
            </div>
    
            {/* Right side - Search Input */}
            <div className="flex-1 max-w-md ml-auto">
            <Input
                id="topbar-search"
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={handleSearchChange}
                startContent={
                <Search className="w-4 h-4 text-gray-400" />
                }
                endContent={
                <div className="flex items-center gap-1">
                    <Kbd keys={["command"]} className="hidden sm:inline-flex">
                    K
                    </Kbd>
                </div>
                }
                classNames={{
                    base: "w-full",
                    mainWrapper: "h-full",
                    input: "text-sm",
                    inputWrapper: "h-10 bg-gray-50 border-gray-200 hover:bg-gray-100 group-data-[focused=true]:bg-white"
                }}
            />
            </div>
        </div>
        </div>
    );
}