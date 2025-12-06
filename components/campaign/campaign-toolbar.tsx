"use client";

import React, { useState, useEffect } from "react";
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
import { ArrowDownToSquare, Funnel, Ticket, ChevronDown, Wrench } from "@gravity-ui/icons";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { RangeValue } from "@react-types/shared";
import { DateValue } from "@internationalized/date";
import { useLocations } from "../locations-provider";
import { getUserInfo } from "../../utils/getUserInfo";
import { decodeJwt } from "../../utils/decodeJwt";

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
  municipalities?: any[];
  onDistrictFetch?: (provinceId: string | number) => void;
  counts?: { all: number; approved: number; pending: number; rejected: number };
  totalRequests?: number;
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
  municipalities = [],
  onDistrictFetch,
  counts = { all: 0, approved: 0, pending: 0, rejected: 0 },
}: CampaignToolbarProps) {
  const { getMunicipalitiesForDistrict } = useLocations();
  const [selectedTab, setSelectedTab] = useState(defaultTab);
  const [selectedEventType, setSelectedEventType] = useState(
    new Set(["blood-drive"]),
  );

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Quick Filter States
  const [qEventType, setQEventType] = useState<string>("");
  const [qDateRange, setQDateRange] = useState<RangeValue<DateValue> | null>(
    null,
  );
  const [qProvince, setQProvince] = useState<string>("");
  const [qDistrict, setQDistrict] = useState<string>("");
  const [qMunicipality, setQMunicipality] = useState<string>("");

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
  const [advTitle, setAdvTitle] = useState("");
  const [advCoordinator, setAdvCoordinator] = useState("");
  const [advStakeholder, setAdvStakeholder] = useState("");
  const [advCoordinatorOptions, setAdvCoordinatorOptions] = useState<
    { key: string; label: string }[]
  >([]);
  const [advStakeholderOptions, setAdvStakeholderOptions] = useState<
    { key: string; label: string }[]
  >([]);
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
    municipality: string,
  ) => {
    const filter: any = {};

    if (eventType && eventType !== "all") filter.category = eventType;
    if (dateRange) {
      filter.startDate = dateRange.start.toString();
      filter.endDate = dateRange.end.toString();
    }
    if (province) filter.province = province;
    if (district) filter.district = district;
    if (municipality) filter.municipality = municipality;
    onQuickFilter?.(filter);
  };

  // Helper to clear all quick filters
  const clearAllFilters = () => {
    setQEventType("");
    setQDateRange(null);
    setQProvince("");
    setQDistrict("");
    setQMunicipality("");
    applyQuickFilter("", null, "", "", "");
  };

  // Fetch coordinators for advanced filter when modal opens
  useEffect(() => {
    const fetchCoordinators = async () => {
      try {
        const rawUser = localStorage.getItem("unite_user");
        const token =
          localStorage.getItem("unite_token") ||
          sessionStorage.getItem("unite_token");
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const user = rawUser ? JSON.parse(rawUser) : null;
        const info = getUserInfo();

        const isAdmin = !!(
          (info && info.isAdmin) ||
          (user &&
            ((user.staff_type &&
              String(user.staff_type).toLowerCase().includes("admin")) ||
              (user.role && String(user.role).toLowerCase().includes("admin"))))
        );

        if (user && isAdmin) {
          const res = await fetch(`${API_URL}/api/coordinators`, {
            headers,
            credentials: "include",
          });
          const body = await res.json();

          if (res.ok) {
            const list = body.data || body.coordinators || body;
            const opts = (Array.isArray(list) ? list : []).map((c: any) => {
              const staff = c.Staff || c.staff || null;
              const district = c.District || c.district || null;
              const fullName = staff
                ? [staff.First_Name, staff.Middle_Name, staff.Last_Name]
                    .filter(Boolean)
                    .join(" ")
                    .trim()
                : c.StaffName || c.label || "";
              const districtLabel = district?.District_Number
                ? `District ${district.District_Number}`
                : district?.District_Name || "";

              return {
                key: c.Coordinator_ID || (staff && staff.ID) || c.id,
                label: `${fullName}${districtLabel ? " - " + districtLabel : ""}`,
              };
            });

            setAdvCoordinatorOptions(opts);
          }
        }

        // Non-admin flows
        if (user) {
          const candidateIds: Array<string | number | undefined> = [];

          if (
            (user.staff_type &&
              String(user.staff_type).toLowerCase().includes("coordinator")) ||
            (info &&
              String(info.role || "")
                .toLowerCase()
                .includes("coordinator"))
          )
            candidateIds.push(user.id || info?.raw?.id);
          candidateIds.push(
            user.Coordinator_ID,
            user.CoordinatorId,
            user.CoordinatorID,
            user.role_data?.coordinator_id,
            user.MadeByCoordinatorID,
            info?.raw?.Coordinator_ID,
            info?.raw?.CoordinatorId,
          );

          let coordId = candidateIds.find(Boolean) as string | undefined;

          if (!coordId) {
            try {
              const t =
                token ||
                (typeof window !== "undefined"
                  ? localStorage.getItem("unite_token") ||
                    sessionStorage.getItem("unite_token")
                  : null);
              const payload = decodeJwt(t);

              if (payload) {
                coordId = payload.coordinator_id || payload.Coordinator_ID;
              }
            } catch (e) {}
          }

          if (coordId) {
            try {
              let resolvedCoordId = String(coordId);

              if (/^stkh_/i.test(resolvedCoordId)) {
                // If it's a stakeholder ID, fetch the stakeholder to get coordinator
                const stRes = await fetch(
                  `${API_URL}/api/stakeholders/${encodeURIComponent(resolvedCoordId)}`,
                  { headers, credentials: "include" },
                );
                const stBody = await stRes.json();

                if (stRes.ok && stBody.data) {
                  const st = stBody.data;
                  resolvedCoordId = st.coordinator_id || st.Coordinator_ID || st.CoordinatorId;
                }
              }

              const res = await fetch(
                `${API_URL}/api/coordinators/${encodeURIComponent(resolvedCoordId)}`,
                { headers, credentials: "include" },
              );
              const body = await res.json();

              if (res.ok && body.data) {
                const c = body.data;
                const staff = c.Staff || c.staff || null;
                const district = c.District || c.district || null;
                const fullName = staff
                  ? [staff.First_Name, staff.Middle_Name, staff.Last_Name]
                      .filter(Boolean)
                      .join(" ")
                      .trim()
                  : c.StaffName || c.label || "";
                const districtLabel = district?.District_Number
                  ? `District ${district.District_Number}`
                  : district?.District_Name || "";

                setAdvCoordinatorOptions([{
                  key: c.Coordinator_ID || (staff && staff.ID) || c.id,
                  label: `${fullName}${districtLabel ? " - " + districtLabel : ""}`,
                }]);
              }
            } catch (e) {
              console.error("Failed to fetch coordinator by id", coordId, e);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch coordinators", err);
      }
    };

    if (isAdvancedModalOpen) {
      fetchCoordinators();
    }
  }, [isAdvancedModalOpen]);

  // Load stakeholders for selected coordinator's district when coordinator changes
  useEffect(() => {
    const fetchStakeholdersForCoordinator = async () => {
      try {
        if (!advCoordinator) {
          setAdvStakeholderOptions([]);
          return;
        }

        const token =
          localStorage.getItem("unite_token") ||
          sessionStorage.getItem("unite_token");
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Fetch coordinator details to get district id
        let districtId: any = null;

        try {
          const coordRes = await fetch(
            `${API_URL}/api/coordinators/${encodeURIComponent(advCoordinator)}`,
            { headers, credentials: "include" },
          );
          const coordBody = await coordRes.json();

          const coordData = coordBody?.data || coordBody;

          districtId =
            coordData?.District_ID ||
            coordData?.District?.District_ID ||
            coordData?.District_Id ||
            coordData?.district_id ||
            coordData?.district ||
            null;
        } catch (e) {
          // ignore
        }

        if (!districtId) {
          setAdvStakeholderOptions([]);
          return;
        }

        const stRes = await fetch(
          `${API_URL}/api/stakeholders?district_id=${encodeURIComponent(String(districtId))}`,
          { headers, credentials: "include" },
        );
        const stBody = await stRes.json();

        if (stRes.ok && Array.isArray(stBody.data)) {
          const opts = (stBody.data || []).map((s: any) => ({
            key: s.Stakeholder_ID || s.StakeholderId || s.id,
            label:
              `${s.firstName || s.First_Name || ""} ${s.lastName || s.Last_Name || ""}`.trim(),
          }));

          setAdvStakeholderOptions(opts);
          if (advStakeholder && !opts.find((o: any) => o.key === advStakeholder)) {
            setAdvStakeholder("");
          }
        } else {
          setAdvStakeholderOptions([]);
        }
      } catch (err) {
        console.warn("Failed to load stakeholders", err);
        setAdvStakeholderOptions([]);
      }
    };

    fetchStakeholdersForCoordinator();
  }, [advCoordinator]);

  return (
    <>
      <div className="w-full bg-white">
        <div className="flex flex-row flex-wrap items-center justify-between px-6 py-3 gap-3 overflow-visible pr-6 z-20">
          {/* Left side: Tabs and Pagination group */}
          <div className="flex-1 min-w-0 flex items-center gap-4">
            {/* Status Tabs */}
            <div className="min-w-0 overflow-x-auto">
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
          </div>

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
          <div className="flex items-center gap-2 flex-shrink-0 overflow-visible pr-2">
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
                  className=" border-default-200 bg-white font-medium text-xs hidden sm:inline-flex"
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
                        applyQuickFilter(val, qDateRange, qProvince, qDistrict, qMunicipality);
                      }}
                    >
                      <SelectItem key="all">
                        All
                      </SelectItem>
                      <SelectItem key="Blood Drive">
                        Blood Drive
                      </SelectItem>
                      <SelectItem key="Training">
                        Training
                      </SelectItem>
                      <SelectItem key="Advocacy">
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
                        applyQuickFilter(qEventType, val, qProvince, qDistrict, qMunicipality);
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
                        setQMunicipality("");
                        applyQuickFilter(qEventType, qDateRange, val, "", "");
                      }}
                    >
                      {provinces.map((p) => (
                        <SelectItem
                          key={p._id}
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
                        setQMunicipality("");
                        applyQuickFilter(
                          qEventType,
                          qDateRange,
                          qProvince,
                          val,
                          "",
                        );
                      }}
                    >
                      {districts.map((d) => (
                        <SelectItem
                          key={d._id}
                        >
                          {d.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Municipality</label>
                    <Select
                      className="h-9"
                      isDisabled={!qDistrict}
                      placeholder="Pick a municipality"
                      selectedKeys={qMunicipality ? [qMunicipality] : []}
                      size="sm"
                      variant="bordered"
                      radius="md"
                      onChange={(e) => {
                        const val = e.target.value;

                        setQMunicipality(val);
                        applyQuickFilter(qEventType, qDateRange, qProvince, qDistrict, val);
                      }}
                    >
                      {getMunicipalitiesForDistrict(qDistrict).map((m) => (
                        <SelectItem
                          key={m._id}
                        >
                          {m.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  <Button
                    className="w-full mt-4"
                    color="default"
                    size="sm"
                    variant="bordered"
                    onPress={clearAllFilters}
                  >
                    Clear All Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Advanced Filter opens modal */}
            <Button
              className=" border-default-200 bg-white font-medium text-xs hidden sm:inline-flex"
              endContent={<ChevronDown className="w-3 h-3" />}
              radius="md"
              size="sm"
              startContent={<Wrench className="w-4 h-4" />}
              variant="bordered"
              onPress={() => setIsAdvancedModalOpen(true)}
            >
              Advanced Filter
            </Button>

            {/* Removed separate mobile funnel icon to free space on small screens */}

            {/* Create Event Button Group with Dropdown Menu*/}
            <ButtonGroup radius="md" size="sm" variant="solid" className="flex-shrink-0 overflow-visible mr-3 relative z-50">
              {/* Full button for desktop/tablet */}
              <Button
                color="primary"
                className="hidden sm:inline-flex items-center gap-2 rounded-l-md"
                radius="md"
                size="sm"
                startContent={<Ticket className="w-4 h-4" />}
                onPress={handleCreateEventClick}
                style={{ borderTopLeftRadius: "0.75rem", borderBottomLeftRadius: "0.75rem", borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
              >
                {currentEventLabel}
              </Button>

              {/* Compact icon-only button for small screens */}
              <Button
                color="primary"
                isIconOnly
                radius="md"
                size="sm"
                className="inline-flex sm:hidden h-8 w-8 items-center justify-center rounded-l-md"
                onPress={handleCreateEventClick}
                aria-label={`Create ${currentEventLabel}`}
                style={{ borderTopLeftRadius: "0.75rem", borderBottomLeftRadius: "0.75rem", borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Button>
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button isIconOnly color="primary" className="h-8 w-8 rounded-r-md" size="sm" style={{ borderTopRightRadius: "0.75rem", borderBottomRightRadius: "0.75rem", borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>
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
              {/* Event Details Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold">Event Details</h4>

                <div className="h-px w-full bg-default"></div>

                {/* Title */}
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium">Title</label>
                  <Input
                    classNames={{
                      inputWrapper: "h-9 border-default-200",
                    }}
                    placeholder="Enter event title"
                    radius="md"
                    size="sm"
                    value={advTitle}
                    variant="bordered"
                    onValueChange={setAdvTitle}
                  />
                </div>

                {/* Coordinator */}
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium">Coordinator</label>
                  <Select
                    className="h-9"
                    classNames={{ trigger: "h-9 border-default-200" }}
                    placeholder="Pick a coordinator"
                    radius="md"
                    selectedKeys={advCoordinator ? [advCoordinator] : []}
                    size="sm"
                    variant="bordered"
                    onChange={(e) => {
                      setAdvCoordinator(e.target.value);
                      setAdvStakeholder("");
                    }}
                  >
                    {advCoordinatorOptions.map((c) => (
                      <SelectItem key={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Stakeholder */}
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium">Stakeholder</label>
                  <Select
                    className="h-9"
                    classNames={{ trigger: "h-9 border-default-200" }}
                    placeholder="Pick a stakeholder"
                    radius="md"
                    selectedKeys={advStakeholder ? [advStakeholder] : []}
                    size="sm"
                    variant="bordered"
                    onChange={(e) => setAdvStakeholder(e.target.value)}
                  >
                    {advStakeholderOptions.map((s) => (
                      <SelectItem key={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </Select>
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
              className="flex-1"
              color="default"
              variant="bordered"
              radius="md"
              onPress={() => {
                setAdvTitle("");
                setAdvCoordinator("");
                setAdvStakeholder("");
                setAdvDateRange(null);
                onAdvancedFilter?.({});
                setIsAdvancedModalOpen(false);
              }}
            >
              Clear Filters
            </Button>
            <Button
              className="flex-1"
              color="primary"
              radius="md"
              onPress={() => {
                onAdvancedFilter?.({
                  title: advTitle || undefined,
                  coordinator: advCoordinator || undefined,
                  stakeholder: advStakeholder || undefined,
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
