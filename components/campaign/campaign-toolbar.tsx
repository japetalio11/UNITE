"use client";

import React, { useState } from "react";
import { Input } from "@heroui/input";
import { DatePicker } from "@heroui/date-picker";
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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";

import {
  CreateTrainingEventModal,
  CreateBloodDriveEventModal,
  CreateAdvocacyEventModal,
} from "./event-creation-modal";

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
  defaultTab = "all",
}: CampaignToolbarProps) {
  const [selectedTab, setSelectedTab] = useState(defaultTab);
  const [selectedEventType, setSelectedEventType] = useState(
    new Set(["blood-drive"]),
  );
  const [quickQuery, setQuickQuery] = useState("");
  const [selectedQuick, setSelectedQuick] = useState<string | undefined>(
    undefined,
  );

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
  const [advTitle, setAdvTitle] = useState("");
  const [advRequester, setAdvRequester] = useState("");

  // Event type labels and descriptions
  const eventLabelsMap = {
    "blood-drive": "Blood Drive",
    training: "Training",
    advocacy: "Advocacy",
  };

  const eventDescriptionsMap = {
    "blood-drive": "Organize a blood donation event",
    training: "Schedule a training session",
    advocacy: "Create an advocacy campaign",
  };

  // Handle tab selection changes
  const handleTabChange = (key: React.Key) => {
    const tabKey = key.toString();

    setSelectedTab(tabKey);
    onTabChange?.(tabKey);
  };

  // Get selected event type value
  const selectedEventTypeValue = Array.from(selectedEventType)[0] as
    | string
    | undefined;
  const typedEventKey = selectedEventTypeValue as
    | keyof typeof eventLabelsMap
    | undefined;
  const currentEventLabel = typedEventKey
    ? eventLabelsMap[typedEventKey]
    : "Event";

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
      const errorMessage = err?.message || "Failed to create training event";

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
      const errorMessage = err?.message || "Failed to create blood drive event";

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
      const errorMessage = err?.message || "Failed to create advocacy event";

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
            selectedKey={selectedTab}
            size="sm"
            variant="solid"
            onSelectionChange={handleTabChange}
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
              radius="md"
              size="sm"
              startContent={<Download className="w-4 h-4" />}
              variant="faded"
              onPress={onExport}
            >
              Export
            </Button>

            {/* Quick Filter Dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <Button
                  endContent={<ChevronDown className="w-4 h-4" />}
                  radius="md"
                  size="sm"
                  startContent={<Filter className="w-4 h-4" />}
                  variant="faded"
                >
                  Quick Filter
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection
                selectedKeys={
                  selectedQuick ? new Set([selectedQuick]) : new Set()
                }
                selectionMode="single"
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
              endContent={<ChevronDown className="w-4 h-4" />}
              radius="md"
              size="sm"
              startContent={<SlidersHorizontal className="w-4 h-4" />}
              variant="faded"
              onPress={() => setIsAdvancedModalOpen(true)}
            >
              Advanced Filter
            </Button>

            {/* Create Event Button Group with Dropdown Menu*/}
            <ButtonGroup radius="md" size="sm" variant="solid">
              <Button
                color="primary"
                startContent={<Ticket className="w-4 h-4" />}
                onPress={handleCreateEventClick}
              >
                {currentEventLabel}
              </Button>
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button isIconOnly color="primary">
                    <ChevronDown className="w-4 h-4" />
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
        error={trainingError}
        isOpen={isTrainingModalOpen}
        isSubmitting={isTrainingSubmitting}
        onClose={() => {
          setIsTrainingModalOpen(false);
          setTrainingError(null); // Clear error when closing
        }}
        onConfirm={handleTrainingEventConfirm}
      />

      <CreateBloodDriveEventModal
        error={bloodDriveError}
        isOpen={isBloodDriveModalOpen}
        isSubmitting={isBloodSubmitting}
        onClose={() => {
          setIsBloodDriveModalOpen(false);
          setBloodDriveError(null); // Clear error when closing
        }}
        onConfirm={handleBloodDriveEventConfirm}
      />

      <CreateAdvocacyEventModal
        error={advocacyError}
        isOpen={isAdvocacyModalOpen}
        isSubmitting={isAdvocacySubmitting}
        onClose={() => {
          setIsAdvocacyModalOpen(false);
          setAdvocacyError(null); // Clear error when closing
        }}
        onConfirm={handleAdvocacyEventConfirm}
      />
      {/* Advanced Filter Modal */}
      <Modal
        isOpen={isAdvancedModalOpen}
        placement="center"
        size="md"
        onClose={() => setIsAdvancedModalOpen(false)}
      >
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
                    hideTimeZone
                    classNames={{
                      base: "w-full",
                      inputWrapper:
                        "border-default-200 hover:border-default-400 h-10",
                      input: "text-sm",
                    }}
                    granularity="day"
                    value={advStart}
                    variant="bordered"
                    onChange={setAdvStart}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm">Title</label>
                <Input
                  placeholder="Event title"
                  value={advTitle}
                  onChange={(e) =>
                    setAdvTitle((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm">Requester</label>
                <Input
                  placeholder="Requester name"
                  value={advRequester}
                  onChange={(e) =>
                    setAdvRequester((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              onPress={() => {
                setIsAdvancedModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              className="ml-2"
              variant="bordered"
              onPress={() => {
                setAdvStart(null);
                setAdvTitle("");
                setAdvRequester("");
                onAdvancedFilter?.();
              }}
            >
              Clear
            </Button>
            <Button
              className="ml-2"
              color="primary"
              onPress={() => {
                onAdvancedFilter?.({
                  start: advStart
                    ? new Date(advStart).toISOString()
                    : undefined,
                  title: advTitle || undefined,
                  requester: advRequester || undefined,
                });
                setIsAdvancedModalOpen(false);
              }}
            >
              Apply
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
