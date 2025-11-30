"use client";

import React, { useState } from "react";
import { Input } from "@heroui/input";
import { DatePicker, DateRangePicker } from "@heroui/date-picker";
import { Tabs, Tab } from "@heroui/tabs";
import { Button, ButtonGroup } from "@heroui/button";
import { Pagination } from "@heroui/pagination";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import { Select, SelectItem } from "@heroui/select";
import { Avatar } from "@heroui/avatar";
import {
  ArrowDownToSquare,
  Funnel,
  Ticket,
  ChevronDown,
  Wrench,
} from "@gravity-ui/icons";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import type { RangeValue } from "@react-types/shared";
import type { DateValue } from "@react-types/calendar";

import {
  CreateTrainingEventModal,
  CreateBloodDriveEventModal,
  CreateAdvocacyEventModal,
} from "./event-creation-modal";

interface CampaignToolbarProps {
  onExport?: () => void;
  onQuickFilter?: (filter: any) => void;
  onAdvancedFilter?: (filter: any) => void;
  onCreateEvent?: (eventType: string, eventData: any) => void;
  onTabChange?: (tab: string) => void;
  defaultTab?: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  // Location data
  provinces?: any[];
  districts?: any[];
  onDistrictFetch?: (provinceId: string | number) => void;
}

export default function CampaignToolbar({
  onExport,
  onQuickFilter,
  onAdvancedFilter,
  onCreateEvent,
  onTabChange,
  defaultTab = "all",
  currentPage,
  totalPages,
  onPageChange,
  provinces = [],
  districts = [],
  onDistrictFetch,
  counts = { all: 0, approved: 0, pending: 0, rejected: 0 },
}: CampaignToolbarProps) {
  const [selectedTab, setSelectedTab] = useState(defaultTab);
  const [selectedEventType, setSelectedEventType] = useState(
    new Set(["blood-drive"]),
  );

  // Quick Filter States
  const [qEventType, setQEventType] = useState<string>("");
  const [qDateRange, setQDateRange] = useState<RangeValue<DateValue> | null>(
    null,
  );
  const [qProvince, setQProvince] = useState<string>("");
  const [qDistrict, setQDistrict] = useState<string>("");

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
  const [advCity, setAdvCity] = useState("");
  const [advProvince, setAdvProvince] = useState("");
  const [advDistrict, setAdvDistrict] = useState("");
  const [advOrganizer, setAdvOrganizer] = useState("");
  const [advDateRange, setAdvDateRange] =
    useState<RangeValue<DateValue> | null>(null);

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

  // Helper to apply quick filter
  const applyQuickFilter = (
    eventType: string,
    dateRange: RangeValue<DateValue> | null,
    province: string,
    district: string,
  ) => {
    const filter: any = {};

    if (eventType && eventType !== "all") filter.category = eventType;
    if (dateRange) {
      filter.startDate = dateRange.start.toString();
      filter.endDate = dateRange.end.toString();
    }
    if (province) filter.province = province;
    if (district) filter.district = district;
    onQuickFilter?.(filter);
  };

  return (
    <>
      <div className="w-full bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left side: Tabs and Pagination group */}
          <div className="flex items-center gap-4">
            {/* Status Tabs */}
            <Tabs
              classNames={{
                tabList: "bg-gray-100 p-1",
                cursor: "bg-white shadow-sm",
                tabContent:
                  "group-data-[selected=true]:text-gray-900 text-xs font-medium",
              }}
              radius="md"
              selectedKey={selectedTab}
              size="sm"
              variant="solid"
              onSelectionChange={handleTabChange}
            >
              <Tab
                key="all"
                title={counts.all > 0 ? `All (${counts.all})` : "All"}
              />
              <Tab
                key="approved"
                title={
                  counts.approved > 0
                    ? `Approved (${counts.approved})`
                    : "Approved"
                }
              />
              <Tab
                key="pending"
                title={
                  counts.pending > 0 ? `Pending (${counts.pending})` : "Pending"
                }
              />
              <Tab
                key="rejected"
                title={
                  counts.rejected > 0
                    ? `Rejected (${counts.rejected})`
                    : "Rejected"
                }
              />
            </Tabs>

            {/* Pagination and its buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Pagination
                  showControls
                  page={currentPage}
                  size="sm"
                  total={totalPages}
                  variant="light"
                  onChange={onPageChange}
                />
              </div>
            )}
          </div>

          {/* Right side - Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Export Button */}
            {/*<Button
              <Button
                className=" border-default-200 bg-white font-medium text-xs"
                radius="md"
                size="sm"
                startContent={<ArrowDownToSquare className="w-4 h-4" />}
                variant="bordered"
                onPress={onExport}
              >
                Export
              </Button>
            </Button>*/}

            {/* Quick Filter Popover (mimicking a custom dropdown) */}
            <Popover offset={10} placement="bottom" showArrow>
              <PopoverTrigger>
                <Button
                  className=" border-default-200 bg-white font-medium text-xs"
                  endContent={<ChevronDown className="w-3 h-3" />}
                  radius="md"
                  size="sm"
                  startContent={<Funnel className="w-4 h-4" />}
                  variant="bordered"
                >
                  Quick Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-4">
                <div className="w-full space-y-4">
                  <div className="text-xs">Quick Filter</div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Event Type</label>
                    <Select
                      className="h-9"
                      placeholder="Pick an event type"
                      selectedKeys={qEventType ? [qEventType] : []}
                      size="sm"
                      radius="md"
                      variant="bordered"
                      onChange={(e) => {
                        const val = e.target.value;

                        setQEventType(val);
                        applyQuickFilter(val, qDateRange, qProvince, qDistrict);
                      }}
                    >
                      <SelectItem key="all" value="all">
                        All
                      </SelectItem>
                      <SelectItem key="Blood Drive" value="Blood Drive">
                        Blood Drive
                      </SelectItem>
                      <SelectItem key="Training" value="Training">
                        Training
                      </SelectItem>
                      <SelectItem key="Advocacy" value="Advocacy">
                        Advocacy
                      </SelectItem>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Date Range</label>
                    <DateRangePicker
                      aria-label="Date Range"
                      className="w-full"
                      classNames={{
                        inputWrapper: "h-9",
                      }}
                      radius="md"
                      size="sm"
                      value={qDateRange}
                      variant="bordered"
                      onChange={(val) => {
                        setQDateRange(val);
                        applyQuickFilter(qEventType, val, qProvince, qDistrict);
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Province</label>
                    <Select
                      className="h-9"
                      placeholder="Pick a province"
                      selectedKeys={qProvince ? [qProvince] : []}
                      size="sm"
                      variant="bordered"
                      radius="md"
                      onChange={(e) => {
                        const val = e.target.value;

                        setQProvince(val);
                        // Fetch districts
                        onDistrictFetch?.(val);
                        // Clear district
                        setQDistrict("");
                        applyQuickFilter(qEventType, qDateRange, val, "");
                      }}
                    >
                      {provinces.map((p) => (
                        <SelectItem
                          key={p.id || p.province_id}
                          value={p.id || p.province_id}
                        >
                          {p.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium ">District</label>
                    <Select
                      className="h-9"
                      isDisabled={!qProvince}
                      placeholder="Pick a district"
                      selectedKeys={qDistrict ? [qDistrict] : []}
                      size="sm"
                      variant="bordered"
                      radius="md"
                      onChange={(e) => {
                        const val = e.target.value;

                        setQDistrict(val);
                        applyQuickFilter(
                          qEventType,
                          qDateRange,
                          qProvince,
                          val,
                        );
                      }}
                    >
                      {districts.map((d) => (
                        <SelectItem
                          key={d.id || d.district_id}
                          value={d.id || d.district_id}
                        >
                          {d.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Advanced Filter opens modal */}
            <Button
              className=" border-default-200 bg-white font-medium text-xs"
              endContent={<ChevronDown className="w-3 h-3" />}
              radius="md"
              size="sm"
              startContent={<Wrench className="w-4 h-4" />}
              variant="bordered"
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
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Avatar
                className="bg-default-100 border-1 border-default"
                icon={<Wrench />}
              />
            </div>
            <h3 className="text-sm font-semibold py-2">Advanced Filter</h3>
            <p className="text-xs font-normal">
              Start providing your information by selecting your blood type. Add
              details below to proceed.
            </p>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-12">
              {/* Location Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold">Location</h4>

                <div className="h-px w-full bg-default"></div>

                {/* City */}
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium">City</label>
                  <Input
                    classNames={{
                      inputWrapper: "h-9 border-default-200",
                    }}
                    placeholder="Enter city"
                    radius="md"
                    size="sm"
                    value={advCity}
                    variant="bordered"
                    onValueChange={setAdvCity}
                  />
                </div>

                <div className="flex gap-4">
                  {/* Province */}
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium">Province</label>
                    <Select
                      className="h-9"
                      classNames={{ trigger: "h-9 border-default-200" }}
                      placeholder="Pick a province"
                      radius="md"
                      selectedKeys={advProvince ? [advProvince] : []}
                      size="sm"
                      variant="bordered"
                      onChange={(e) => {
                        const val = e.target.value;

                        setAdvProvince(val);
                        onDistrictFetch?.(val);
                        setAdvDistrict("");
                      }}
                    >
                      {provinces.map((p) => (
                        <SelectItem
                          key={p.id || p.province_id}
                          value={p.id || p.province_id}
                        >
                          {p.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  {/* District */}
                  <div className="flex-1">
                    <label className="text-xs font-medium">District</label>
                    <Select
                      className="h-9"
                      classNames={{ trigger: "h-9 border-default-200" }}
                      isDisabled={!advProvince}
                      placeholder="Pick a district"
                      radius="md"
                      selectedKeys={advDistrict ? [advDistrict] : []}
                      size="sm"
                      variant="bordered"
                      onChange={(e) => setAdvDistrict(e.target.value)}
                    >
                      {districts.map((d) => (
                        <SelectItem
                          key={d.id || d.district_id}
                          value={d.id || d.district_id}
                        >
                          {d.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              {/* Event Details Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold">Event Details</h4>

                <div className="h-px w-full bg-default"></div>

                {/* Organizer */}
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium">
                    Organizer <span className="text-danger">*</span>
                  </label>
                  <Input
                    classNames={{
                      inputWrapper: "h-9 border-default-200",
                    }}
                    placeholder="Enter location"
                    radius="md"
                    size="sm"
                    value={advOrganizer}
                    variant="bordered"
                    onValueChange={setAdvOrganizer}
                  />
                </div>

                {/* Date Range */}
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium">Date Range</label>
                  <DateRangePicker
                    className="w-full"
                    classNames={{
                      inputWrapper: "h-9 border-default-200",
                    }}
                    radius="md"
                    size="sm"
                    value={advDateRange}
                    variant="bordered"
                    onChange={setAdvDateRange}
                  />
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              className="w-full"
              color="primary"
              radius="md"
              onPress={() => {
                onAdvancedFilter?.({
                  city: advCity || undefined,
                  province: advProvince || undefined,
                  district: advDistrict || undefined,
                  requester: advOrganizer || undefined,
                  startDate: advDateRange?.start?.toString(),
                  endDate: advDateRange?.end?.toString(),
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
