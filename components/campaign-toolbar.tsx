"use client";

import React, { useState } from "react";
import { Tabs, Tab } from "@heroui/tabs";
import { Button } from "@heroui/button";
import { 
    Download, 
    Filter, 
    SlidersHorizontal, 
    ChevronDown,
    Ticket,
} from "lucide-react";
    
interface CampaignToolbarProps {
    onExport?: () => void;
    onQuickFilter?: () => void;
    onAdvancedFilter?: () => void;
    onCreateEvent?: () => void;
    onTabChange?: (tab: string) => void;
    defaultTab?: string;
}
    
export default function CampaignToolbar({
    onExport,
    onQuickFilter,
    onAdvancedFilter,
    onCreateEvent,
    onTabChange,
    defaultTab = "all"
    }: CampaignToolbarProps) {
    const [selectedTab, setSelectedTab] = useState(defaultTab);
    
    // Handle tab selection changes
    const handleTabChange = (key: React.Key) => {
        const tabKey = key.toString();
        setSelectedTab(tabKey);
        onTabChange?.(tabKey);
    };
    
    return (
        <div className="w-full bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-3">
            {/* Left side - Status Tabs */}
            <Tabs
            selectedKey={selectedTab}
            onSelectionChange={handleTabChange}
            variant="underlined"
            classNames={{
                base: "w-auto",
                tabList: "gap-6 border-b-0",
                cursor: "bg-black",
                tab: "px-0 h-10",
                tabContent: "text-gray-600 group-data-[selected=true]:text-black font-medium"
            }}
            >
            <Tab key="all" title="All" />
            <Tab key="approved" title="Approved" />
            <Tab key="pending" title="Pending" />
            <Tab key="rejected" title="Rejected" />
            <Tab key="finished" title="Finished" />
            </Tabs>
    
            {/* Right side - Action Buttons */}
            <div className="flex items-center gap-2">
            {/* Export Button */}
            <Button
                variant="light"
                startContent={<Download className="w-4 h-4" />}
                onPress={onExport}
                className="font-medium"
            >
                Export
            </Button>
    
            {/* Quick Filter Button */}
            <Button
                variant="light"
                startContent={<Filter className="w-4 h-4" />}
                endContent={
                <svg 
                    className="w-3 h-3 ml-1" 
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
                }
                onPress={onQuickFilter}
                className="font-medium"
            >
                Quick Filter
            </Button>
    
            {/* Advanced Filter Button */}
            <Button
                variant="light"
                startContent={<SlidersHorizontal className="w-4 h-4" />}
                endContent={
                <svg 
                    className="w-3 h-3 ml-1" 
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
                }
                onPress={onAdvancedFilter}
                className="font-medium"
            >
                Advanced Filter
            </Button>
    
            {/* Create Event Button */}
            <Button
                color="default"
                startContent={<Ticket className="w-4 h-4" />}
                endContent={<ChevronDown className="w-4 h-4" />}
                onPress={onCreateEvent}
                className="bg-black text-white font-medium hover:bg-gray-800"
            >
                Create an event
            </Button>
            </div>
        </div>
        </div>
    );
}