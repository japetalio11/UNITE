"use client";

import { useState, useEffect } from "react";
import { getUserInfo } from "../../../utils/getUserInfo";
import { Search, Download, Filter, Plus, MoreHorizontal, ThumbsUp, ArrowUpRight, ChevronLeft, ChevronRight, Calendar, ChevronDown } from "lucide-react";
import Topbar from "@/components/topbar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Input,
  Tabs,
  Tab,
  Chip,
  Avatar,
  Textarea,
  Checkbox,
} from "@heroui/react";

interface RequisitionFormData {
  bloodType: string;
  units: number;
  requestDate: string;
  location: string;
  status: string;
  bloodbankLocation: string;
}

interface Requisition {
  id: string;
  orderId: string;
  hospital: string;
  department: string;
  units: number;
  bloodType: string;
  priority: "Non-urgent" | "Emergent" | "Urgent" | "Normal";
  requestDate: string;
  requiredDate: string;
  eta?: string;
  status: "Open" | "Closed";
}

export default function RequisitionManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequisitions, setSelectedRequisitions] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [filteredRequisitions, setFilteredRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [directionFilter, setDirectionFilter] = useState<"All" | "Incoming" | "Outgoing">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "Closed">("All");
  
  const [filters, setFilters] = useState<{
    hospital?: string;
    department?: string;
    bloodType?: string;
    priority?: string;
    status?: string;
  }>({});
  const [openQuickFilter, setOpenQuickFilter] = useState(false);
  
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [displayName, setDisplayName] = useState("Bicol Medical Center");
  const [displayEmail, setDisplayEmail] = useState("bmc@gmail.com");
  const [canManageRequisitions, setCanManageRequisitions] = useState(false);

  // Format date for display in MM/DD/YYYY format
  const formatDateForDisplay = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Format date for input in YYYY-MM-DD format
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState<RequisitionFormData>({
    bloodType: "",
    units: 1,
    requestDate: "",
    location: "",
    status: "",
    bloodbankLocation: "",
  });

  useEffect(() => {
    try {
      const info = getUserInfo();
      setUserInfo(info);
      
      const rawUser = info?.raw || null;
      const staffType = rawUser?.StaffType || rawUser?.staff_type || null;
      const isStaffAdmin = !!staffType && String(staffType).toLowerCase() === "admin";
      const resolvedRole = info?.role || null;
      const roleLower = resolvedRole ? String(resolvedRole).toLowerCase() : "";
      const isSystemAdmin = !!info?.isAdmin || (roleLower.includes("sys") && roleLower.includes("admin"));

      setCanManageRequisitions(
        Boolean(isSystemAdmin || isStaffAdmin || roleLower.includes("coordinator"))
      );
      setDisplayName(info?.displayName || "Bicol Medical Center");
      setDisplayEmail(info?.email || "bmc@gmail.com");
    } catch (e) {
      /* ignore */
    }
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleUserClick = () => {
    // User profile clicked
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(filteredRequisitions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'requisitions-export.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleQuickFilter = () => {
    setOpenQuickFilter(true);
  };

  const handleAdvancedFilter = () => {
    console.log("Advanced filter clicked");
  };

  const handleAddRequisition = () => {
    setIsAddModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setFormData({
      bloodType: "",
      units: 1,
      requestDate: "",
      location: "",
      status: "",
      bloodbankLocation: "",
    });
  };

  const handleModalSubmit = async () => {
    setIsCreating(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      const token = typeof window !== "undefined"
        ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
        : null;

      const url = base ? `${base}/api/requisitions` : `/api/requisitions`;

      const requestDate = formData.requestDate ? new Date(formData.requestDate) : new Date();
      
      const requisitionData = {
        bloodType: formData.bloodType,
        units: formData.units,
        requestDate: requestDate.toISOString().split('T')[0],
        location: formData.location,
        status: formData.status,
        bloodbankLocation: formData.bloodbankLocation,
        orderId: `ORDER-${Date.now().toString().slice(-6)}`,
        hospital: "Bicol Medical Center",
        department: "ER",
        priority: formData.status === "Emergent" ? "Emergent" : "Non-urgent",
        requiredDate: new Date(requestDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        eta: new Date(requestDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };

      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requisitionData),
      });

      const text = await res.text();
      let json: any = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch (err) {
        throw new Error(
          `Invalid JSON response when creating requisition: ${text.slice(0, 200)}`
        );
      }

      if (!res.ok) {
        throw new Error(
          json?.message || `Failed to create requisition (status ${res.status})`
        );
      }

      await fetchRequisitions();
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert(err?.message || "Failed to create requisition");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredRequisitions.map((r) => r.id);
      setSelectedRequisitions(allIds);
    } else {
      setSelectedRequisitions(prev => 
        prev.filter(id => !filteredRequisitions.some(r => r.id === id))
      );
    }
  };

  const handleSelectRequisition = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRequisitions([...selectedRequisitions, id]);
    } else {
      setSelectedRequisitions(selectedRequisitions.filter((rId) => rId !== id));
    }
  };

  const handleAcceptRequest = (id: string) => {
    console.log("Accept request for requisition:", id);
    // Add accept request logic here
  };

  const handleRedirectRequest = (id: string) => {
    console.log("Redirect request for requisition:", id);
    // Add redirect request logic here
  };

  const fetchRequisitions = async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);
    
    try {
      const mockRequisitions: Requisition[] = [
        {
          id: "1",
          orderId: "ORDER 1234",
          hospital: "Bicol Medical Center",
          department: "ER",
          units: 1,
          bloodType: "A",
          priority: "Non-urgent",
          requestDate: "October 28, 2025",
          requiredDate: "October 28, 2025",
          eta: "October 29, 2025",
          status: "Open"
        },
        {
          id: "2",
          orderId: "ORDER 1235",
          hospital: "Bicol Medical Center",
          department: "ICU",
          units: 2,
          bloodType: "O+",
          priority: "Emergent",
          requestDate: "October 28, 2025",
          requiredDate: "October 28, 2025",
          eta: "October 29, 2025",
          status: "Closed"
        },
        {
          id: "3",
          orderId: "ORDER 1236",
          hospital: "Bicol Medical Center",
          department: "Pediatrics",
          units: 3,
          bloodType: "B+",
          priority: "Non-urgent",
          requestDate: "October 28, 2025",
          requiredDate: "October 28, 2025",
          eta: "October 29, 2025",
          status: "Open"
        },
        {
          id: "4",
          orderId: "ORDER 1237",
          hospital: "Bicol Medical Center",
          department: "Surgery",
          units: 4,
          bloodType: "AB+",
          priority: "Emergent",
          requestDate: "October 28, 2025",
          requiredDate: "October 28, 2025",
          eta: "October 29, 2025",
          status: "Closed"
        },
      ];

      setRequisitions(mockRequisitions);

      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 1000;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...requisitions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.orderId.toLowerCase().includes(query) ||
        r.hospital.toLowerCase().includes(query) ||
        r.department.toLowerCase().includes(query) ||
        r.bloodType.toLowerCase().includes(query) ||
        r.priority.toLowerCase().includes(query) ||
        r.status.toLowerCase().includes(query)
      );
    }

    if (directionFilter === "Incoming") {
      filtered = filtered.filter(r => r.status === "Open");
    } else if (directionFilter === "Outgoing") {
      filtered = filtered.filter(r => r.status === "Closed");
    }

    if (statusFilter === "Open") {
      filtered = filtered.filter(r => r.status === "Open");
    } else if (statusFilter === "Closed") {
      filtered = filtered.filter(r => r.status === "Closed");
    }

    if (filters.hospital) {
      filtered = filtered.filter(r => r.hospital === filters.hospital);
    }
    if (filters.department) {
      filtered = filtered.filter(r => r.department === filters.department);
    }
    if (filters.bloodType) {
      filtered = filtered.filter(r => r.bloodType === filters.bloodType);
    }
    if (filters.priority) {
      filtered = filtered.filter(r => r.priority === filters.priority);
    }
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    setFilteredRequisitions(filtered);
  }, [requisitions, filters, searchQuery, directionFilter, statusFilter]);

  useEffect(() => {
    const init = async () => {
      await fetchRequisitions();
      setLoading(false);
    };
    init();
  }, []);

  const handleApplyFilters = (newFilters: {
    hospital?: string;
    department?: string;
    bloodType?: string;
    priority?: string;
    status?: string;
  }) => {
    setFilters(newFilters);
    setOpenQuickFilter(false);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery("");
    setDirectionFilter("All");
    setStatusFilter("All");
  };

  const bloodTypes = [
    { key: "A", label: "A" },
    { key: "B", label: "B" },
    { key: "AB", label: "AB" },
    { key: "O", label: "O" },
    { key: "A+", label: "A+" },
    { key: "A-", label: "A-" },
    { key: "B+", label: "B+" },
    { key: "B-", label: "B-" },
    { key: "AB+", label: "AB+" },
    { key: "AB-", label: "AB-" },
    { key: "O+", label: "O+" },
    { key: "O-", label: "O-" },
  ];

  const statusOptions = [
    { key: "Non-urgent", label: "Non-urgent" },
    { key: "Emergent", label: "Emergent" },
    { key: "Urgent", label: "Urgent" },
    { key: "Normal", label: "Normal" },
  ];

  const bloodbankLocations = [
    { key: "main", label: "Main Blood Bank" },
    { key: "north", label: "North Wing Blood Bank" },
    { key: "south", label: "South Wing Blood Bank" },
    { key: "emergency", label: "Emergency Blood Bank" },
  ];

  // Updated DatePicker component with popup styling
  const DatePicker = ({ value, onChange }: { value: string; onChange: (date: string) => void }) => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    useEffect(() => {
      setMounted(true);
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(timer);
    }, []);

    const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    const calendarDays = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const firstDay = new Date(year, month, 1);
      const startingDayOfWeek = firstDay.getDay();
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const prevMonthLastDay = new Date(year, month, 0).getDate();

      const days = [];

      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        days.push({
          day: prevMonthLastDay - i,
          isCurrentMonth: false,
          date: new Date(year, month - 1, prevMonthLastDay - i),
        });
      }

      for (let i = 1; i <= daysInMonth; i++) {
        days.push({
          day: i,
          isCurrentMonth: true,
          date: new Date(year, month, i),
        });
      }

      const remainingDays = 42 - days.length;
      for (let i = 1; i <= remainingDays; i++) {
        days.push({
          day: i,
          isCurrentMonth: false,
          date: new Date(year, month + 1, i),
        });
      }

      return days;
    };

    const goToPreviousMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const goToNextMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const goToToday = () => {
      const today = new Date();
      setCurrentDate(today);
      onChange(formatDateForInput(today));
      setIsOpen(false);
    };

    const handleDateClick = (date: Date) => {
      onChange(formatDateForInput(date));
      setIsOpen(false);
    };

    const isToday = (date: Date) => {
      if (!mounted) return false;
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    };

    const isSelected = (date: Date) => {
      if (!value) return false;
      const selected = new Date(value);
      return (
        date.getDate() === selected.getDate() &&
        date.getMonth() === selected.getMonth() &&
        date.getFullYear() === selected.getFullYear()
      );
    };

    const monthYear = currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const formatTime = () => {
      const hours = currentTime.getHours();
      const minutes = currentTime.getMinutes().toString().padStart(2, "0");
      const seconds = currentTime.getSeconds().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${displayHours} : ${minutes} : ${seconds} ${ampm}`;
    };

    return (
    <div className="relative w-full">
      <div
        className="w-full px-3 h-10 rounded-medium border-2 border-default-200 hover:border-default-400 cursor-pointer flex items-center justify-between bg-transparent transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm text-default-700">
          {value ? formatDateForDisplay(new Date(value)) : "Pick a date"}
        </span>
        <ChevronDown className="w-4 h-4 text-default-500" />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-default-200 rounded-lg shadow-lg w-[420px] -left-2">
            {/* Calendar header with month/year and navigation */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-default-200">
              <h3 className="text-base font-medium">{monthYear}</h3>
              <div className="flex gap-2 items-center">
                <Button
                  isIconOnly
                  aria-label="Previous month"
                  size="sm"
                  variant="light"
                  onPress={goToPreviousMonth}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  className="text-sm"
                  size="sm"
                  variant="light"
                  onPress={goToToday}
                >
                  Today
                </Button>
                <Button
                  isIconOnly
                  aria-label="Next month"
                  size="sm"
                  variant="light"
                  onPress={goToNextMonth}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-2 px-4 pt-4">
              {dayLabels.map((label) => (
                <div
                  key={label}
                  className="text-center text-xs font-medium text-gray-500 py-2"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 px-4 pb-4">
              {calendarDays().map((dayInfo, index) => {
                const today = isToday(dayInfo.date);
                const selected = isSelected(dayInfo.date);
                
                return (
                  <div key={index} className="flex flex-col items-center">
                    <button
                      className={`
                        w-10 h-10 flex items-center justify-center rounded-full
                        text-sm transition-all duration-150
                        ${!dayInfo.isCurrentMonth ? "text-gray-300" : "text-gray-700"}
                        ${today ? "font-bold" : ""}
                        ${selected ? "bg-black text-white" : "hover:bg-default-100"}
                        ${!selected && today ? "bg-default-300 text-black" : ""}
                        `}
                      onClick={() => handleDateClick(dayInfo.date)}
                    >
                      {dayInfo.day}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Time display */}
            <div className="border-t border-default-200 px-4 py-3">
              <div className="flex justify-between items-center w-full">
                <span className="text-xs font-medium text-gray-600">Time</span>
                <Chip radius="sm" variant="faded">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">{formatTime()}</span>
                    <span className="text-xs text-gray-500">PHT</span>
                  </div>
                </Chip>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Checkbox logic copied from StakeholderTable
  const isAllSelected =
    filteredRequisitions.length > 0 &&
    filteredRequisitions.every((r) => selectedRequisitions.includes(r.id));

  return (
    <div className="min-h-screen bg-white">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          Requisition Management
        </h1>
      </div>

      <Topbar
        userEmail={displayEmail}
        userName={displayName}
        onUserClick={handleUserClick}
      />

      {/* Updated Search Container - Matching Campaign Popup styling */}
      <div className="w-full bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Direction Filter Tabs */}
            <Tabs
              radius="md"
              selectedKey={directionFilter}
              size="sm"
              variant="solid"
              onSelectionChange={(key) => setDirectionFilter(key as any)}
            >
              <Tab key="All" title="All" />
              <Tab key="Incoming" title="Incoming" />
              <Tab key="Outgoing" title="Outgoing" />
            </Tabs>

            {/* Status Filter Tabs */}
            <Tabs
              radius="md"
              selectedKey={statusFilter}
              size="sm"
              variant="solid"
              onSelectionChange={(key) => setStatusFilter(key as any)}
            >
              <Tab key="All" title="All" />
              <Tab key="Open" title="Open" />
              <Tab key="Closed" title="Closed" />
            </Tabs>

            {/* Search Bar - Updated styling */}
            <Input
              className="max-w-xs"
              classNames={{
                input: "text-sm",
                inputWrapper: "border-default-200 hover:border-default-400 h-9",
              }}
              placeholder="Search requisitions..."
              radius="md"
              size="sm"
              startContent={<Search className="w-4 h-4 text-default-400" />}
              type="text"
              variant="bordered"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          {/* Right side - Action buttons with updated styling */}
          <div className="flex items-center gap-2">
            {/* Export Button */}
            <Button
              className="border-default-200 hover:border-default-400 font-medium"
              radius="md"
              size="sm"
              startContent={<Download className="w-4 h-4" />}
              variant="bordered"
              onPress={handleExport}
            >
              Export
            </Button>

            {/* Quick Filter Button */}
            <Button
              className="border-default-200 hover:border-default-400 font-medium"
              radius="md"
              size="sm"
              startContent={<Filter className="w-4 h-4" />}
              variant="bordered"
              onPress={handleQuickFilter}
            >
              Quick Filter
            </Button>

            {/* Advanced Filter Button */}
            <Button
              className="border-default-200 hover:border-default-400 font-medium"
              radius="md"
              size="sm"
              startContent={<Filter className="w-4 h-4" />}
              variant="bordered"
              onPress={handleAdvancedFilter}
            >
              Advanced Filter
            </Button>

            {/* Add Requisition Button */}
            <Button
              className="bg-black text-white font-medium hover:bg-gray-800"
              radius="md"
              size="sm"
              startContent={<Plus className="w-4 h-4" />}
              onPress={handleAddRequisition}
            >
              Make a request
            </Button>
          </div>
        </div>
      </div>

      {/* Table Content - Using StakeholderTable checkbox logic */}
      <div className="px-6 py-4">
        <div className="overflow-x-auto rounded-lg border border-default-200">
          <table className="w-full">
            <thead className="bg-default-50">
              <tr>
                {/* Checkbox header - copied from StakeholderTable */}
                <th className="px-6 py-3.5 text-left w-12">
                  <Checkbox
                    aria-label="Select all requisitions"
                    checked={isAllSelected}
                    size="sm"
                    onValueChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ORDER ID
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  HOSPITAL
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DEPARTMENT
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  UNITS
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BLOOD TYPE
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PRIORITY
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  REQUEST DATE
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ETA
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  STATUS
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-default-200">
              {loading ? (
                [...Array(4)].map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 bg-default-200 rounded w-4"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-default-200 rounded w-24"></div>
                    </td>
                    {[...Array(9)].map((_, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4">
                        <div className="h-4 bg-default-200 rounded w-20"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={11} className="py-8 px-6 text-center text-danger">
                    {error}
                  </td>
                </tr>
              ) : filteredRequisitions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 px-6 text-center text-default-500">
                    No requisitions found
                  </td>
                </tr>
              ) : (
                filteredRequisitions.map((requisition) => (
                  <tr key={requisition.id} className="hover:bg-default-50">
                    {/* Checkbox cell - copied from StakeholderTable */}
                    <td className="px-6 py-4 w-12">
                      <Checkbox
                        aria-label={`Select ${requisition.orderId}`}
                        checked={selectedRequisitions.includes(requisition.id)}
                        size="sm"
                        onValueChange={(checked) =>
                          handleSelectRequisition(requisition.id, checked)
                        }
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-normal text-gray-900">
                      {requisition.orderId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {requisition.hospital}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {requisition.department}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {requisition.units}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {requisition.bloodType}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-left px-3 py-1 rounded-full text-xs font-medium ${
                        requisition.priority === "Emergent" 
                          ? "bg-danger-100 text-danger-800 border border-danger-200"
                          : "bg-default-100 text-default-800 border border-default-200"
                      }`}>
                        {requisition.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {requisition.requestDate}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {requisition.eta}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        requisition.status === "Open" 
                          ? "bg-success-100 text-success-800 border border-success-200"
                          : "bg-danger-100 text-danger-800 border border-danger-200"
                      }`}>
                        {requisition.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-start">
                        <Dropdown>
                          <DropdownTrigger>
                            <Button
                              variant="light"
                              size="sm"
                              className="min-w-0 p-4 bg-default-100 hover:bg-default-200 rounded-md"
                            >
                              <MoreHorizontal className="w-4 h-4 text-default-600" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu 
                            aria-label="Requisition actions"
                            className="min-w-[180px] p-2 bg-white shadow-lg rounded-lg border border-default-200"
                          >
                            <DropdownItem 
                              key="accept"
                              className="px-3 py-2 hover:bg-default-50"
                              onPress={() => handleAcceptRequest(requisition.id)}
                            >
                              <div className="flex items-center gap-2">
                                <ThumbsUp className="w-4 h-4 text-default-700" />
                                <div className="flex flex-col">
                                  <span className="font-medium text-default-900">Accept Request</span>
                                  <span className="text-xs text-default-500">Accept request</span>
                                </div>
                              </div>
                            </DropdownItem>
                            <DropdownItem 
                              key="redirect"
                              className="px-3 py-2 hover:bg-default-50"
                              onPress={() => handleRedirectRequest(requisition.id)}
                            >
                              <div className="flex items-center gap-2">
                                <ArrowUpRight className="w-4 h-4 text-default-700" />
                                <div className="flex flex-col">
                                  <span className="font-medium text-default-900">Redirect Request</span>
                                  <span className="text-xs text-default-500">Redirect Request</span>
                                </div>
                              </div>
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* "Make a Request" Modal with Campaign Popup styling */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={handleModalClose}
        placement="center"
        scrollBehavior="inside"
        size="2xl"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Avatar
                className="bg-default-100 border-1 border-default"
                icon={<Calendar />}
              />
            </div>
            <h3 className="text-sm font-semibold py-2">
              Make a request
            </h3>
            <p className="text-xs font-normal">
              Start providing your information by selecting your blood type. Add details below to proceed.
            </p>
          </ModalHeader>
          <ModalBody className="py-6">
            <div className="space-y-5">
              {/* Blood Type and Units in single row */}
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium">
                    Blood Type <span className="text-danger ml-1">*</span>
                  </label>
                  <Select
                    placeholder="Select one"
                    classNames={{
                      trigger: "border-default-200 h-9 hover:border-default-400",
                      value: "text-sm text-default-700",
                    }}
                    selectedKeys={formData.bloodType ? [formData.bloodType] : []}
                    variant="bordered"
                    onChange={(e) => setFormData({...formData, bloodType: e.target.value})}
                  >
                    {bloodTypes.map((type) => (
                      <SelectItem key={type.key}>{type.label}</SelectItem>
                    ))}
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium">
                    Unit/s <span className="text-danger ml-1">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      value={formData.units.toString()}
                      onChange={(e) => setFormData({...formData, units: parseInt(e.target.value) || 1})}
                      classNames={{
                        inputWrapper: "border-default-200 h-10",
                        input: "text-foreground",
                      }}
                      radius="md"
                      size="sm"
                      variant="bordered"
                    />
                  </div>
                </div>
              </div>

              {/* Request Date with updated styling */}
              <div className="space-y-1">
                <label className="text-xs font-medium">Request Date</label>
                <DatePicker
                  value={formData.requestDate}
                  onChange={(date) => setFormData({...formData, requestDate: date})}
                />
              </div>

              {/* Location Input */}
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Location <span className="text-danger ml-1">*</span>
                </label>
                <Input
                  placeholder="Enter location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  classNames={{
                    inputWrapper: "border-default-200 h-10",
                    input: "text-foreground",
                  }}
                  radius="md"
                  size="sm"
                  variant="bordered"
                />
              </div>

              {/* Set Status */}
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Set Status <span className="text-danger ml-1">*</span>
                </label>
                <Select
                  placeholder="Select one"
                  classNames={{
                    trigger: "border-default-200 h-10 hover:border-default-400",
                    value: "text-sm text-default-700",
                  }}
                  selectedKeys={formData.bloodType ? [formData.bloodType] : []}
                  variant="bordered"
                  onChange={(e) => setFormData({...formData, bloodType: e.target.value})}
                >
                  {statusOptions.map((status) => (
                    <SelectItem key={status.key}>{status.label}</SelectItem>
                  ))}
                </Select>
              </div>

              {/* Horizontal line separator */}
              <div className="border-t border-default-200 pt-4">
                {/* Map Visualization */}
                <div className="mb-4">
                  <div className="w-full h-65 rounded-lg border border-default-200 overflow-hidden relative">
                    <img 
                      src="https://cdn.prod.website-files.com/609ed46055e27a02ffc0749b/668ed88b0d1cb50a971bf2e9_64d2310b77a293e18725a871_London_Day%2520-Mapbox%2520Standard-2023-MKTG-approved%2520(rounded).png"
                      alt="Map visualization of Woodlands Pet Shop location"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Bloodbank Location */}
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Bloodbank Location <span className="text-danger ml-1">*</span>
                  </label>
                  <Select
                    placeholder="Select one"
                    classNames={{
                      trigger: "border-default-200 h-10 hover:border-default-400",
                      value: "text-sm text-default-700",
                    }}
                    selectedKeys={formData.bloodbankLocation ? [formData.bloodbankLocation] : []}
                    variant="bordered"
                    onChange={(e) => setFormData({...formData, bloodbankLocation: e.target.value})}
                  >
                    {bloodbankLocations.map((location) => (
                      <SelectItem key={location.key}>{location.label}</SelectItem>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              onPress={handleModalClose}
              className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors text-center"
            >
              Cancel
            </Button>
            <Button
              onClick={handleModalSubmit}
              aria-busy={!!isCreating}
              disabled={isCreating}
              className={`flex-1 py-3 px-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors text-center ${isCreating ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isCreating ? "Creating..." : "Redirect Request"}
            </Button>
          </ModalFooter>
        </ModalContent> 
      </Modal>

      {/* Quick Filter Modal with updated styling */}
      <Modal 
        isOpen={openQuickFilter} 
        onClose={() => setOpenQuickFilter(false)}
        placement="center"
        size="sm"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold py-2">Quick Filter</h2>
            <p className="text-xs font-normal">Filter requisitions by different criteria</p>
          </ModalHeader>
          <ModalBody className="py-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Hospital</label>
                <Select
                  placeholder="Select hospital"
                  classNames={{
                    trigger: "border-default-200 h-9",
                  }}
                  selectedKeys={filters.hospital ? [filters.hospital] : []}
                  variant="bordered"
                  onChange={(e) => handleApplyFilters({...filters, hospital: e.target.value})}
                >
                  <SelectItem key="Bicol Medical Center">Bicol Medical Center</SelectItem>
                  <SelectItem key="General Hospital">General Hospital</SelectItem>
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium">Department</label>
                <Select
                  placeholder="Select department"
                  classNames={{
                    trigger: "border-default-200 h-9",
                  }}
                  selectedKeys={filters.department ? [filters.department] : []}
                  variant="bordered"
                  onChange={(e) => handleApplyFilters({...filters, department: e.target.value})}
                >
                  <SelectItem key="ER">ER</SelectItem>
                  <SelectItem key="ICU">ICU</SelectItem>
                  <SelectItem key="OR">OR</SelectItem>
                  <SelectItem key="Pediatrics">Pediatrics</SelectItem>
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium">Blood Type</label>
                <Select
                  placeholder="Select blood type"
                  classNames={{
                    trigger: "border-default-200 h-9",
                  }}
                  selectedKeys={filters.bloodType ? [filters.bloodType] : []}
                  variant="bordered"
                  onChange={(e) => handleApplyFilters({...filters, bloodType: e.target.value})}
                >
                  {bloodTypes.map((type) => (
                    <SelectItem key={type.key}>{type.label}</SelectItem>
                  ))}
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium">Priority</label>
                <Select
                  placeholder="Select priority"
                  classNames={{
                    trigger: "border-default-200 h-9",
                  }}
                  selectedKeys={filters.priority ? [filters.priority] : []}
                  variant="bordered"
                  onChange={(e) => handleApplyFilters({...filters, priority: e.target.value})}
                >
                  {statusOptions.map((status) => (
                    <SelectItem key={status.key}>{status.label}</SelectItem>
                  ))}
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium">Status</label>
                <Select
                  placeholder="Select status"
                  classNames={{
                    trigger: "border-default-200 h-9",
                  }}
                  selectedKeys={filters.status ? [filters.status] : []}
                  variant="bordered"
                  onChange={(e) => handleApplyFilters({...filters, status: e.target.value})}
                >
                  <SelectItem key="Open">Open</SelectItem>
                  <SelectItem key="Closed">Closed</SelectItem>
                </Select>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              className="font-medium"
              variant="bordered"
              radius="md"
              onPress={() => setOpenQuickFilter(false)}
            >
              Close
            </Button>
            <Button
              className="bg-default-100 text-default-700 font-medium hover:bg-default-200"
              onPress={() => {
                handleClearFilters();
                setOpenQuickFilter(false);
              }}
            >
              Clear Filters
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}