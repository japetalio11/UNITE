"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Select, SelectItem } from "@heroui/select";
import { DateRangePicker, RangeValue } from "@heroui/date-picker";
import { DateValue } from "@react-types/datepicker";
import { today, getLocalTimeZone } from "@internationalized/date";
import { Tabs, Tab } from "@heroui/tabs";
import {
  Magnifier,
  Funnel,
  Check,
  Clock,
  Person,
  TrashBin,
  Xmark,
  CircleCheck,
  ChevronDown,
  Persons,
} from "@gravity-ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { format, isToday, isYesterday } from "date-fns";

import { getUserInfo } from "@/utils/getUserInfo";
import { fetchJsonWithAuth } from "@/utils/fetchWithAuth";
import EventViewModal from "@/components/campaign/event-view-modal";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Sample data to match the design screenshot
const SAMPLE_NOTIFICATIONS = [
  {
    _id: "sample-1",
    NotificationType: "Reschedule",
    Message: "You rescheduled a blood drive event from Local Government Unit",
    CreatedAt: new Date().setHours(8, 50),
    IsRead: false,
  },
  {
    _id: "sample-2",
    NotificationType: "Request",
    Message:
      "Local Government Unit has requested a blood drive event on January 27, 2026",
    CreatedAt: new Date().setHours(8, 50),
    IsRead: false,
  },
  {
    _id: "sample-3",
    NotificationType: "Assign",
    Message: "You reassigned a coordinator",
    CreatedAt: new Date().setHours(8, 50),
    IsRead: false,
  },
  {
    _id: "sample-4",
    NotificationType: "Request",
    Message:
      "Local Government Unit has requested a training event on January 27, 2026",
    CreatedAt: new Date().setHours(8, 50),
    IsRead: false,
  },
  {
    _id: "sample-5",
    NotificationType: "Delete",
    Message: "You deleted a coordinator",
    CreatedAt: new Date().setHours(8, 50),
    IsRead: false,
  },
  {
    _id: "sample-6",
    NotificationType: "Delete",
    Message: "You deleted a blood drive event by Local Government Unit",
    CreatedAt: new Date().setHours(8, 50),
    IsRead: false,
  },
  {
    _id: "sample-7",
    NotificationType: "Delete",
    Message: "You deleted a stakeholder",
    CreatedAt: new Date().setHours(8, 50),
    IsRead: false,
  },
  {
    _id: "sample-8",
    NotificationType: "Request",
    Message:
      "Local Government Unit has requested an advocacy event on January 27, 2026",
    CreatedAt: new Date().setHours(8, 50),
    IsRead: false,
  },
  {
    _id: "sample-9",
    NotificationType: "Approve",
    Message: "You approved a blood drive event from Local Government Unit",
    CreatedAt: new Date().setHours(8, 50),
    IsRead: true, // Only this one is read in the list based on description
  },
];

export default function NotificationModal({
  isOpen,
  onClose,
}: NotificationModalProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [query, setQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");

  // Quick Filter states
  const [qEventType, setQEventType] = useState<string>("");
  const [qDateRange, setQDateRange] = useState<RangeValue<DateValue> | null>(
    null,
  );
  const [dateFilterLabel, setDateFilterLabel] = useState("Today");

  const handleDateAction = (key: React.Key) => {
    const tz = getLocalTimeZone();
    let start = today(tz);
    const end = today(tz);

    switch (key) {
      case "today":
        setDateFilterLabel("Today");
        break;
      case "last7":
        start = start.subtract({ days: 6 });
        setDateFilterLabel("Last 7 days");
        break;
      case "last30":
        start = start.subtract({ days: 29 });
        setDateFilterLabel("Last 30 days");
        break;
      // 'custom' will be handled by a separate popover, so we just clear here
      case "clear":
      default:
        setQDateRange(null);
        setDateFilterLabel("Today");
        return;
    }

    setQDateRange({ start, end });
  };

  // View Modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<any>(null);

  // --- Helpers to resolve recipient ---
  const getRecipientId = useCallback(() => {
    const info = getUserInfo();
    const parsed = info.raw || {};

    return (
      parsed.Coordinator_ID ||
      parsed.CoordinatorId ||
      parsed.coordinator_id ||
      parsed.coordinatorId ||
      parsed.Stakeholder_ID ||
      parsed.StakeholderId ||
      parsed.stakeholder_id ||
      parsed.stakeholderId ||
      parsed.id ||
      parsed.ID ||
      parsed.user_id ||
      parsed.user?.id ||
      null
    );
  }, []);

  const getRecipientType = useCallback(() => {
    const info = getUserInfo();

    if (info.isAdmin) return "Admin";
    const role = (info.role || "").toLowerCase();

    // Check raw for specific ID fields if role is ambiguous
    const parsed = info.raw || {};
    const hasStakeholderId = !!(
      parsed.Stakeholder_ID ||
      parsed.StakeholderId ||
      parsed.stakeholder_id ||
      parsed.stakeholderId
    );
    const hasCoordinatorId = !!(
      parsed.Coordinator_ID ||
      parsed.CoordinatorId ||
      parsed.coordinator_id ||
      parsed.coordinatorId
    );

    if (hasStakeholderId || role.includes("stakeholder")) return "Stakeholder";
    if (hasCoordinatorId || role.includes("coordinator")) return "Coordinator";

    // Fallback
    return "Coordinator";
  }, []);

  // --- Data Loading ---
  const loadNotifications = useCallback(async () => {
    const recipientId = getRecipientId();

    if (!recipientId) {
      // If no user context, just show samples for UI demo
      setNotifications(SAMPLE_NOTIFICATIONS);

      return;
    }

    setLoading(true);
    try {
      const rType = getRecipientType();
      const params = new URLSearchParams();

      params.append("recipientId", String(recipientId));
      params.append("recipientType", rType);
      params.append("page", "1");
      params.append("limit", "50");

      const url = `${API_URL}/api/notifications?${params.toString()}`;
      const body: any = await fetchJsonWithAuth(url);

      const items = body?.data?.notifications || body?.notifications || [];

      // Sort by date desc
      items.sort(
        (a: any, b: any) =>
          new Date(b.CreatedAt || b.created_at).getTime() -
          new Date(a.CreatedAt || a.created_at).getTime(),
      );

      // FOR DEMO PURPOSES: If API returns empty, fill with samples so the user sees the design
      if (items.length === 0) {
        setNotifications(SAMPLE_NOTIFICATIONS);
      } else {
        setNotifications(items);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
      // Fallback to samples on error for demo consistency
      setNotifications(SAMPLE_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  }, [getRecipientId, getRecipientType]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // --- Actions ---
  const markAllRead = async () => {
    const recipientId = getRecipientId();

    if (!recipientId) return;

    try {
      const rType = getRecipientType();

      await fetchJsonWithAuth(`${API_URL}/api/notifications/mark-all-read`, {
        method: "POST",
        body: JSON.stringify({ recipientId, recipientType: rType }),
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, IsRead: true, is_read: true })),
      );

      // Notify other components
      window.dispatchEvent(
        new CustomEvent("unite:notifications-read", { detail: { unread: 0 } }),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = async (n: any) => {
    if (n.IsRead || n.is_read) return;
    const nid = n.Notification_ID || n._id;

    // Handle sample data click locally
    if (String(nid).startsWith("sample-")) {
      setNotifications((prev) =>
        prev.map((item) => {
          if ((item.Notification_ID || item._id) === nid) {
            return { ...item, IsRead: true, is_read: true };
          }

          return item;
        }),
      );

      return;
    }

    if (!nid) return;

    try {
      await fetchJsonWithAuth(`${API_URL}/api/notifications/${nid}/read`, {
        method: "PUT",
        body: JSON.stringify({ isRead: true }),
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((item) => {
          const itemId = item.Notification_ID || item._id;

          if (itemId === nid) {
            return { ...item, IsRead: true, is_read: true };
          }

          return item;
        }),
      );

      // Recalculate unread count for event dispatch
      const unreadCount = notifications.filter(
        (x) => (x.Notification_ID || x._id) !== nid && !(x.IsRead || x.is_read),
      ).length;

      window.dispatchEvent(
        new CustomEvent("unite:notifications-read", {
          detail: { unread: unreadCount },
        }),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (n: any) => {
    markAsRead(n);

    // If related to a request, open view modal
    const rid =
      n.RelatedEntityID ||
      n.RelatedEntityId ||
      n.related_entity_id ||
      n.relatedEntityId;

    if (rid && n.NotificationType !== "System") {
      try {
        const url = `${API_URL}/api/requests/${encodeURIComponent(rid)}`;
        const body: any = await fetchJsonWithAuth(url);
        const data = body?.data || body?.request || body;

        if (data) {
          setViewRequest(data);
          setViewModalOpen(true);
        }
      } catch (e) {
        console.error("Failed to load request for notification", e);
      }
    }
  };

  // --- Filtering & Grouping ---
  const filteredNotifications = useMemo(() => {
    let base = notifications;

    // Search
    if (query.trim()) {
      const q = query.toLowerCase();

      base = base.filter((n) =>
        (n.Message || n.message || "").toLowerCase().includes(q),
      );
    }

    // Tabs
    if (selectedTab === "unread") {
      base = base.filter((n) => !(n.IsRead || n.is_read));
    } else if (selectedTab === "system") {
      base = base.filter((n) => n.NotificationType === "System");
    }

    // Quick Filters
    if (qEventType && qEventType !== "all") {
      base = base.filter(
        (n) =>
          (n.NotificationType || "").toLowerCase() === qEventType.toLowerCase(),
      );
    }
    if (qDateRange?.start && qDateRange?.end) {
      const start = qDateRange.start.toDate("UTC");
      const end = qDateRange.end.toDate("UTC");
      // Adjust end date to include the entire day
      end.setHours(23, 59, 59, 999);

      base = base.filter((n) => {
        const date = new Date(n.CreatedAt || n.created_at);

        return date >= start && date <= end;
      });
    }

    return base;
  }, [notifications, query, selectedTab, qEventType, qDateRange]);

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: any[] } = {};

    filteredNotifications.forEach((n) => {
      const date = new Date(n.CreatedAt || n.created_at);
      let key = "Older";

      if (isToday(date)) key = "Today";
      else if (isYesterday(date)) key = "Yesterday";
      else key = format(date, "MMMM d, yyyy");

      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });

    // Order keys: Today, Yesterday, others sorted desc
    const keys = Object.keys(groups).sort((a, b) => {
      if (a === "Today") return -1;
      if (b === "Today") return 1;
      if (a === "Yesterday") return -1;
      if (b === "Yesterday") return 1;

      return 0;
    });

    return keys.map((k) => ({ title: k, items: groups[k] }));
  }, [filteredNotifications]);

  // --- Counts ---
  const counts = useMemo(() => {
    const all = notifications.length;
    const unread = notifications.filter((n) => !(n.IsRead || n.is_read)).length;
    const system = notifications.filter(
      (n) => n.NotificationType === "System",
    ).length;

    return { all, unread, system };
  }, [notifications]);

  // --- Presentation Helpers ---
  const formatTime = (dateStr: string | number) => {
    try {
      return format(new Date(dateStr), "h:mm a");
    } catch {
      return "";
    }
  };

  const getIconAndStyle = (type: string) => {
    const t = (type || "").toLowerCase();

    if (t.includes("reschedule")) {
      return {
        icon: <Clock className="w-[18px] h-[18px]" />,
        bg: "bg-[#FFF8E1]", // Light yellow
        text: "text-[#F59E0B]", // Orange/Yellow
      };
    }
    if (t.includes("delete") || t.includes("cancel") || t.includes("reject")) {
      return {
        icon: <TrashBin className="w-[18px] h-[18px]" />,
        bg: "bg-[#FFEAEA]", // Light red
        text: "text-[#D92D20]", // Red
      };
    }
    if (
      t.includes("accept") ||
      t.includes("approve") ||
      t.includes("confirm")
    ) {
      return {
        icon: <CircleCheck className="w-[18px] h-[18px]" />,
        bg: "bg-[#E6F4EA]", // Light green
        text: "text-[#1E8E3E]", // Green
      };
    }
    if (t.includes("assign") || t.includes("coordinator")) {
      return {
        icon: <Persons className="w-[18px] h-[18px]" />, // or Person
        bg: "bg-[#F3F4F6]", // Gray
        text: "text-[#4B5563]", // Gray text
      };
    }
    if (t.includes("request")) {
      return {
        // Using a gradient-like style for request reception
        icon: (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#FCD34D] to-[#F87171]" />
        ),
        bg: "p-0 overflow-hidden", // Remove padding for gradient div
        text: "",
        isGradient: true,
      };
    }

    // Default
    return {
      icon: <Person className="w-[18px] h-[18px]" />,
      bg: "bg-default-100",
      text: "text-default-500",
    };
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-40 bg-transparent"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={onClose}
            />

            {/* Modal Panel */}
            <motion.div
              animate={{ x: 0, opacity: 1 }}
              className="fixed left-[72px] top-4 bottom-4 w-[800px] bg-white rounded-2xl shadow-2xl z-50 border border-gray-200 overflow-hidden flex flex-col font-sans"
              exit={{ x: -20, opacity: 0 }}
              initial={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header Section */}
              <div className="p-6 pb-2 border-b border-gray-100">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h2 className="text-2xl font-bold ">Notifications</h2>
                    <p className="text-xs mt-1">
                      Stay updated with your latest notifications.
                    </p>
                  </div>
                  <Button
                    isIconOnly
                    className="text-gray-400 hover:text-gray-600 -mr-2 -mt-2"
                    size="sm"
                    variant="light"
                    onPress={onClose}
                  >
                    <Xmark className="w-5 h-5" />
                  </Button>
                </div>

                {/* Search & Toolbar Row 1: Search + Filters */}
                <div className="flex gap-3 mt-6">
                  <Input
                    className="flex-1"
                    isClearable
                    classNames={{
                      inputWrapper:
                        "bg-white border border-default-200 shadow-none hover:border-default-400 focus-within:!border-default-foreground focus-within:!bg-white",
                      input: "text-xs",
                    }}
                    placeholder="Search requests..."
                    radius="md"
                    size="sm"
                    startContent={
                      <Magnifier className="text-gray-400 w-4 h-4" />
                    }
                    value={query}
                    variant="bordered"
                    onClear={() => setQuery("")}
                    onValueChange={setQuery}
                  />

                  <div className="flex gap-3 shrink-0">
                    <Popover offset={10} placement="bottom" showArrow>
                      <PopoverTrigger>
                        <Button
                          className="text-gray-700 border-default-200 bg-white font-medium text-xs"
                          endContent={
                            <ChevronDown className="w-3 h-3 text-gray-500" />
                          }
                          radius="md"
                          size="sm"
                          startContent={
                            <Funnel className="w-4 h-4 text-gray-500" />
                          }
                          variant="bordered"
                        >
                          Quick Filter
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-4">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">
                              Event Type
                            </label>
                            <Select
                              placeholder="Pick an event type"
                              selectedKeys={qEventType ? [qEventType] : []}
                              size="sm"
                              radius="md"
                              variant="bordered"
                              onChange={(e) => setQEventType(e.target.value)}
                            >
                              <SelectItem key="all" value="all">
                                All
                              </SelectItem>
                              <SelectItem key="Request" value="Request">
                                Request
                              </SelectItem>
                              <SelectItem key="Reschedule" value="Reschedule">
                                Reschedule
                              </SelectItem>
                              <SelectItem key="Approve" value="Approve">
                                Approve
                              </SelectItem>
                              <SelectItem key="Delete" value="Delete">
                                Delete
                              </SelectItem>
                              <SelectItem key="Assign" value="Assign">
                                Assign
                              </SelectItem>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium">
                              Date Range
                            </label>
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
                              onChange={setQDateRange}
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Toolbar Row 2: Tabs + Secondary Actions */}
                <div className="flex items-center justify-between mt-6 mb-2">
                  <Tabs
                    classNames={{
                      tabList: "bg-gray-100 p-1",
                      cursor: "bg-white shadow-sm",
                      tabContent:
                        "group-data-[selected=true]: text-xs font-medium",
                    }}
                    radius="md"
                    selectedKey={selectedTab}
                    size="sm"
                    variant="solid"
                    onSelectionChange={(k) => setSelectedTab(k as string)}
                  >
                    <Tab key="all" title={`All (${counts.all})`} />
                    <Tab key="unread" title={`Unread (${counts.unread})`} />
                    <Tab key="system" title={`System (${counts.system})`} />
                  </Tabs>

                  <div className="flex items-center gap-3">
                    <Button
                      className="border-default-200  text-xs font-medium"
                      endContent={<ChevronDown className="w-3 h-3" />}
                      radius="md"
                      size="sm"
                      startContent={<Clock className="w-3 h-3" />}
                      variant="bordered"
                    >
                      Today
                    </Button>
                    <Button
                      className="text-xs font-medium  border-default-200"
                      radius="md"
                      size="sm"
                      startContent={<Check className="w-3 h-3" />}
                      variant="bordered"
                      onPress={markAllRead}
                    >
                      Mark all as read
                    </Button>
                  </div>
                </div>
              </div>

              {/* Scrollable List */}
              <ScrollShadow
                className="flex-1 overflow-y-auto bg-white"
                size={10}
              >
                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-black rounded-full" />
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                    <p className="text-xs">No notifications found</p>
                  </div>
                ) : (
                  <div className="pb-6">
                    {groupedNotifications.map((group) => (
                      <div key={group.title}>
                        <div className="px-6 py-3 bg-white sticky top-0 z-10">
                          <span className="text-xs font-medium">
                            {group.title}
                          </span>
                        </div>

                        <div className="space-y-1 px-4">
                          {group.items.map((n) => {
                            const isRead = n.IsRead || n.is_read;
                            const { icon, bg, text } = getIconAndStyle(
                              n.NotificationType,
                            );

                            return (
                              <div
                                key={n.Notification_ID || n._id}
                                className="group relative p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer flex items-start gap-4"
                                role="button"
                                tabIndex={0}
                                onClick={() => handleNotificationClick(n)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    handleNotificationClick(n);
                                  }
                                }}
                              >
                                {/* Icon */}
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg} ${text}`}
                                >
                                  {icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <p className="text-xs  leading-snug">
                                    {n.Message || n.message}
                                  </p>
                                  <div className="mt-2 flex items-center">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-gray-200 bg-white">
                                      <Clock className="w-3 h-3 text-gray-400" />
                                      <span className="text-[10px] font-medium text-gray-600">
                                        {formatTime(
                                          n.CreatedAt || n.created_at,
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions / Status */}
                                <div className="flex flex-col items-end gap-2 pt-2">
                                  {!isRead && (
                                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollShadow>

              {/* View Detail Modal */}
              <EventViewModal
                isOpen={viewModalOpen}
                request={viewRequest}
                onClose={() => {
                  setViewModalOpen(false);
                  setViewRequest(null);
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
