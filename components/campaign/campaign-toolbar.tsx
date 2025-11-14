"use client";

import React, { useState } from "react";
import { Input } from "@heroui/input";
import { DatePicker } from "@heroui/date-picker";
import { Check } from "lucide-react";
import { Tabs, Tab } from "@heroui/tabs";
import { Button, ButtonGroup } from "@heroui/button";
import { 
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    DropdownSection,
} from "@heroui/dropdown";
import { 
    Download, 
    Filter, 
    SlidersHorizontal,
    Ticket,
    ChevronDown,
} from "lucide-react";
import {
    CreateTrainingEventModal,
    CreateBloodDriveEventModal,
    CreateAdvocacyEventModal,
} from "./event-creation-modal";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
    
interface CampaignToolbarProps {
    onExport?: () => void;
    onQuickFilter?: (filter?: any) => void;
    onAdvancedFilter?: (filter?: any) => void;
    onCreateEvent?: (eventType: string, eventData: any) => void;
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
    const [quickQuery, setQuickQuery] = useState("");
    const [selectedQuick, setSelectedQuick] = useState<string | undefined>(undefined);
    
    // Modal states
    const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
    const [isBloodDriveModalOpen, setIsBloodDriveModalOpen] = useState(false);
    const [isAdvocacyModalOpen, setIsAdvocacyModalOpen] = useState(false);
    // submission/loading states to prevent duplicate creates
    const [isTrainingSubmitting, setIsTrainingSubmitting] = useState(false);
    const [isBloodSubmitting, setIsBloodSubmitting] = useState(false);
    const [isAdvocacySubmitting, setIsAdvocacySubmitting] = useState(false);
    // error states for each modal
    const [trainingError, setTrainingError] = useState<string | null>(null);
    const [bloodDriveError, setBloodDriveError] = useState<string | null>(null);
    const [advocacyError, setAdvocacyError] = useState<string | null>(null);
    const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
    const [advStart, setAdvStart] = useState<any>(null);
    const [advCoordinator, setAdvCoordinator] = useState("");
    
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
    const selectedEventTypeValue = Array.from(selectedEventType)[0] as string | undefined;
    const typedEventKey = selectedEventTypeValue as keyof typeof eventLabelsMap | undefined;
    const currentEventLabel = typedEventKey ? eventLabelsMap[typedEventKey] : "Event";
    
    // Handle create event button click - opens appropriate modal
    const handleCreateEventClick = () => {
        // Clear errors when opening modals
        setTrainingError(null);
        setBloodDriveError(null);
        setAdvocacyError(null);
        switch (selectedEventTypeValue) {
            case "blood-drive":
                setIsBloodDriveModalOpen(true);
                break;
            case "training":
                setIsTrainingModalOpen(true);
                break;
            case "advocacy":
                setIsAdvocacyModalOpen(true);
                break;
        }
    };
    
    // Handle modal confirmations
    const handleTrainingEventConfirm = async (data: any) => {
        if (!onCreateEvent) return;
        setIsTrainingSubmitting(true);
        setTrainingError(null); // Clear previous errors
        try {
            await onCreateEvent("training", data);
            setIsTrainingModalOpen(false);
            setTrainingError(null); // Clear error on success
        } catch (err: any) {
            // Capture error message and display in modal
            const errorMessage = err?.message || 'Failed to create training event';
            setTrainingError(errorMessage);
        } finally {
            setIsTrainingSubmitting(false);
        }
    };
    
    const handleBloodDriveEventConfirm = async (data: any) => {
        if (!onCreateEvent) return;
        setIsBloodSubmitting(true);
        setBloodDriveError(null); // Clear previous errors
        try {
            await onCreateEvent("blood-drive", data);
            setIsBloodDriveModalOpen(false);
            setBloodDriveError(null); // Clear error on success
        } catch (err: any) {
            // Capture error message and display in modal
            const errorMessage = err?.message || 'Failed to create blood drive event';
            setBloodDriveError(errorMessage);
        } finally {
            setIsBloodSubmitting(false);
        }
    };
    
    const handleAdvocacyEventConfirm = async (data: any) => {
        if (!onCreateEvent) return;
        setIsAdvocacySubmitting(true);
        setAdvocacyError(null); // Clear previous errors
        try {
            await onCreateEvent("advocacy", data);
            setIsAdvocacyModalOpen(false);
            setAdvocacyError(null); // Clear error on success
        } catch (err: any) {
            // Capture error message and display in modal
            const errorMessage = err?.message || 'Failed to create advocacy event';
            setAdvocacyError(errorMessage);
        } finally {
            setIsAdvocacySubmitting(false);
        }
    };
    
    return (
        <>
            <div className="w-full bg-white">
                <div className="flex items-center justify-between px-6 py-3">
                    {/* Left side - Status Tabs */}
                    <Tabs
                        radius="md"
                        size="sm"
                        selectedKey={selectedTab}
                        onSelectionChange={handleTabChange}
                        variant="solid"
                    >
                        <Tab key="all" title="All" />
                        <Tab key="approved" title="Approved" />
                        <Tab key="pending" title="Pending" />
                        <Tab key="rejected" title="Rejected" />
                    </Tabs>
            
                    {/* Right side - Action Buttons */}
                    <div className="flex items-center gap-2">
                        {/* Export Button */}
                        <Button
                            variant="faded"
                            startContent={<Download className="w-4 h-4" />}
                            onPress={onExport}
                            radius="md"
                            size="sm"
                        >
                            Export
                        </Button>
            
                        {/* Quick Filter Dropdown */}
                        <Dropdown>
                            <DropdownTrigger>
                                <Button
                                    variant="faded"
                                    startContent={<Filter className="w-4 h-4" />}
                                    endContent={<ChevronDown className="w-4 h-4"/>}
                                    radius="md"
                                    size="sm"
                                >
                                    Quick Filter
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection
                                selectionMode="single"
                                selectedKeys={selectedQuick ? new Set([selectedQuick]) : new Set()}
                                onSelectionChange={(keys: any) => {
                                    try {
                                        const arr = Array.from(keys as Iterable<any>);
                                        const val = arr[0] as string | undefined;
                                        setSelectedQuick(val);
                                        // apply immediately
                                        if (val === undefined || val === "") {
                                            onQuickFilter?.({ category: undefined });
                                        } else {
                                            onQuickFilter?.({ category: val });
                                        }
                                    } catch {
                                        setSelectedQuick(undefined);
                                        onQuickFilter?.({ category: undefined });
                                    }
                                }}
                            >
                                <DropdownSection title="Category">
                                    <DropdownItem key="">All</DropdownItem>
                                    <DropdownItem key="Blood Drive">Blood Drive</DropdownItem>
                                    <DropdownItem key="Training">Training</DropdownItem>
                                    <DropdownItem key="Advocacy">Advocacy</DropdownItem>
                                </DropdownSection>
                            </DropdownMenu>
                        </Dropdown>
            
                        {/* Advanced Filter opens modal */}
                        <Button
                            variant="faded"
                            startContent={<SlidersHorizontal className="w-4 h-4" />}
                            endContent={<ChevronDown className="w-4 h-4"/>}
                            onPress={() => setIsAdvancedModalOpen(true)}
                            radius="md"
                            size="sm"
                        >
                            Advanced Filter
                        </Button>
            
                        {/* Create Event Button Group with Dropdown Menu*/}
                        <ButtonGroup 
                            variant="solid"
                            radius="md"
                            size="sm"
                        >
                                <Button
                                    onPress={handleCreateEventClick}
                                    color="primary"
                                    startContent={<Ticket className="w-4 h-4" />}
                                >
                                    {currentEventLabel}
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
                                    className="max-w-2xl"
                                    selectedKeys={selectedEventType}
                                    selectionMode="single"
                                    onSelectionChange={(keys: any) => {
                                        // Convert the incoming selection (SharedSelection) to Set<string>
                                        try {
                                            const arr = Array.from(keys as Iterable<any>);
                                            setSelectedEventType(new Set(arr.map(String)));
                                        } catch {
                                            // fallback: clear selection
                                            setSelectedEventType(new Set());
                                        }
                                    }}
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

            {/* Event Creation Modals */}
            <CreateTrainingEventModal
                isOpen={isTrainingModalOpen}
                onClose={() => {
                    setIsTrainingModalOpen(false);
                    setTrainingError(null); // Clear error when closing
                }}
                onConfirm={handleTrainingEventConfirm}
                isSubmitting={isTrainingSubmitting}
                error={trainingError}
            />

            <CreateBloodDriveEventModal
                isOpen={isBloodDriveModalOpen}
                onClose={() => {
                    setIsBloodDriveModalOpen(false);
                    setBloodDriveError(null); // Clear error when closing
                }}
                onConfirm={handleBloodDriveEventConfirm}
                isSubmitting={isBloodSubmitting}
                error={bloodDriveError}
            />

            <CreateAdvocacyEventModal
                isOpen={isAdvocacyModalOpen}
                onClose={() => {
                    setIsAdvocacyModalOpen(false);
                    setAdvocacyError(null); // Clear error when closing
                }}
                onConfirm={handleAdvocacyEventConfirm}
                isSubmitting={isAdvocacySubmitting}
                error={advocacyError}
            />
                        {/* Advanced Filter Modal */}
                        <Modal isOpen={isAdvancedModalOpen} onClose={() => setIsAdvancedModalOpen(false)} size="md" placement="center">
                            <ModalContent>
                                <ModalHeader>
                                    <h3 className="text-lg font-semibold">Advanced Filter</h3>
                                </ModalHeader>
                                <ModalBody>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <label className="w-20 text-sm">Date</label>
                                                <div className="w-full">
                                                    <DatePicker
                                                        value={advStart}
                                                        onChange={setAdvStart}
                                                        granularity="day"
                                                        hideTimeZone
                                                        variant="bordered"
                                                        classNames={{ base: "w-full", inputWrapper: "border-default-200 hover:border-default-400 h-10", input: "text-sm" }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <label className="w-20 text-sm">Coordinator</label>
                                                <Input placeholder="Coordinator name" value={advCoordinator} onChange={(e) => setAdvCoordinator((e.target as HTMLInputElement).value)} />
                                            </div>
                                        </div>
                                    </ModalBody>
                                    <ModalFooter>
                                        <Button variant="bordered" onPress={() => { setIsAdvancedModalOpen(false); }}>Cancel</Button>
                                        <Button color="primary" onPress={() => { onAdvancedFilter?.({ start: advStart ? (new Date(advStart)).toISOString() : undefined, coordinator: advCoordinator || undefined }); setIsAdvancedModalOpen(false); }} className="ml-2">Apply</Button>
                                    </ModalFooter>
                            </ModalContent>
                        </Modal>
        </>
    );
}