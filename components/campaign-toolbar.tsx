"use client";

import React, { useState } from "react";
import { Tabs, Tab } from "@heroui/tabs";
import { Button, ButtonGroup } from "@heroui/button";
import { 
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
} from "@heroui/dropdown";
import { 
    Download, 
    Filter, 
    SlidersHorizontal,
    Ticket,
    Check,
    ChevronDown,
} from "lucide-react";
    
interface CampaignToolbarProps {
    onExport?: () => void;
    onQuickFilter?: () => void;
    onAdvancedFilter?: () => void;
    onCreateEvent?: (eventType: string) => void;
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
    const [selectedEventType, setSelectedEventType] = useState(new Set(["blood-drive"]));
    
    // Event type labels and descriptions
    const eventLabelsMap = {
        "blood-drive": "Blood Drive",
        "training": "Training",
        "advocacy": "Advocacy"
    };
    
    const eventDescriptionsMap = {
        "blood-drive": "Organize a blood donation event",
        "training": "Schedule a training session",
        "advocacy": "Create an advocacy campaign"
    };
    
    // Handle tab selection changes
    const handleTabChange = (key: React.Key) => {
        const tabKey = key.toString();
        setSelectedTab(tabKey);
        onTabChange?.(tabKey);
    };
    
    // Get selected event type value
    const selectedEventTypeValue = Array.from(selectedEventType)[0] as string;
    
    // Handle create event button click
    const handleCreateEvent = () => {
        onCreateEvent?.(selectedEventTypeValue);
    };
    
    return (
        <div className="w-full bg-white border-gray-200">
            <div className="flex items-center justify-between px-6 py-3">
                {/* Left side - Status Tabs */}
                <Tabs
                    selectedKey={selectedTab}
                    onSelectionChange={handleTabChange}
                    variant="solid"
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
                        variant="faded"
                        startContent={<Download className="w-4 h-4" />}
                        onPress={onExport}
                        className="font-medium"
                        size="md"
                    >
                        Export
                    </Button>
        
                    {/* Quick Filter Button */}
                    <Button
                        variant="faded"
                        startContent={<Filter className="w-4 h-4" />}
                        endContent={<ChevronDown className="w-4 h-4"/>}
                        onPress={onQuickFilter}
                        className="font-medium"
                    >
                        Quick Filter
                    </Button>
        
                    {/* Advanced Filter Button */}
                    <Button
                        variant="faded"
                        startContent={<SlidersHorizontal className="w-4 h-4" />}
                        endContent={<ChevronDown className="w-4 h-4"/>}
                        onPress={onAdvancedFilter}
                        className="font-medium"
                    >
                        Advanced Filter
                    </Button>
        
                    {/* Create Event Button Group with Dropdown */}
                    <ButtonGroup variant="solid">
                        <Button
                            onPress={handleCreateEvent}
                            startContent={<Ticket className="w-4 h-4" />}
                            className="bg-black text-white font-medium"
                        >
                            {eventLabelsMap[selectedEventTypeValue]}
                        </Button>
                        <Dropdown placement="bottom-end">
                            <DropdownTrigger>
                                <Button 
                                    isIconOnly
                                    color="primary"
                                >
                                    <ChevronDown className="w-4 h-4"/>
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection
                                aria-label="Event type options"
                                className="max-w-[300px]"
                                selectedKeys={selectedEventType}
                                selectionMode="single"
                                onSelectionChange={setSelectedEventType}
                            >
                                <DropdownItem 
                                    key="blood-drive" 
                                    description={eventDescriptionsMap["blood-drive"]}
                                >
                                    {eventLabelsMap["blood-drive"]}
                                </DropdownItem>
                                <DropdownItem 
                                    key="training" 
                                    description={eventDescriptionsMap["training"]}
                                >
                                    {eventLabelsMap["training"]}
                                </DropdownItem>
                                <DropdownItem 
                                    key="advocacy" 
                                    description={eventDescriptionsMap["advocacy"]}
                                >
                                    {eventLabelsMap["advocacy"]}
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </ButtonGroup>
                </div>
            </div>
        </div>
    );
}