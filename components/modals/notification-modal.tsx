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
import { DateRangePicker } from "@heroui/date-picker";
import { DateValue } from "@react-types/datepicker";

// Define the RangeValue type inline
type RangeValue<T> = {
  start: T;
  end: T;
};
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
import { motion, AnimatePresence, Variants } from "framer-motion";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { format, isToday, isYesterday } from "date-fns";

import { getUserInfo } from "@/utils/getUserInfo";
import { fetchJsonWithAuth } from "@/utils/fetchWithAuth";
import { decodeJwt } from "@/utils/decodeJwt";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import EventViewModal from "@/components/campaign/event-view-modal";
import { createPortal } from "react-dom";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Hook to detect mobile screen for animation adjustments
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

export default function NotificationModal({
  isOpen,
  onClose,
}: NotificationModalProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMobile = useIsMobile();

  // Filter states
  const [query, setQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");

  // Quick Filter states
  const [qEventType, setQEventType] = useState<string>("");
  const [qDateRange, setQDateRange] = useState<RangeValue<DateValue> | null>(
    null,
  );
  const [dateFilterLabel, setDateFilterLabel] = useState("Today");

  // View Modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<any>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Notification preferences for filtering
  const { preferences: notificationPreferences } = useNotificationPreferences(isOpen);

  // --- Helper to get current user's ObjectId ---
  const getCurrentUserId = useCallback(() => {
    try {
      // Try to get from localStorage user data
      const rawUser = localStorage.getItem("unite_user");
      if (rawUser) {
        const user = JSON.parse(rawUser);
        const userId = user?._id || user?.id || user?.User_ID || user?.userId || user?.ID;
        if (userId) {
          return String(userId);
        }
      }

      // Fallback: decode JWT token
      const token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token");
      if (token) {
        const decoded = decodeJwt(token);
        const tokenUserId = decoded?.id || decoded?.userId || decoded?._id;
        if (tokenUserId) {
          return String(tokenUserId);
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting current user ID:", error);
      return null;
    }
  }, []);

  // --- Data Loading ---
  const loadNotifications = useCallback(async () => {
    const userId = getCurrentUserId();

    if (!userId) {
      setNotifications([]);
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();

      // Use new format: recipientUserId (ObjectId)
      params.append("recipientUserId", String(userId));
      params.append("page", "1");
      params.append("limit", "50");

      const url = `/api/notifications?${params.toString()}`;
      const response: any = await fetchJsonWithAuth(url);

      if (response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : [];

        items.sort(
          (a: any, b: any) => {
            const aDate = a.createdAt?.$date || a.createdAt || a.CreatedAt;
            const bDate = b.createdAt?.$date || b.createdAt || b.CreatedAt;
            return new Date(bDate).getTime() - new Date(aDate).getTime();
          },
        );

        setNotifications(items);
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      console.error("Failed to load notifications", err);
      setError(err.message || "Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [getCurrentUserId]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // --- Actions ---
  const markAllRead = async () => {
    const userId = getCurrentUserId();

    if (!userId) {
      console.warn("Cannot mark all as read: user not authenticated");
      return;
    }

    try {
      await fetchJsonWithAuth(`/api/notifications/mark-all-read`, {
        method: "PUT",
        body: JSON.stringify({ recipientUserId: userId }),
      });

      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, IsRead: true, isRead: true, is_read: true }));
        
        // Dispatch unread count event after render cycle completes (all marked as read = 0 unread)
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("unite:notifications-read", { detail: { unread: 0 } }),
          );
        }, 0);
        
        return updated;
      });
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  };

  const markAsRead = async (n: any) => {
    // Check both IsRead and isRead for compatibility
    if (n.IsRead || n.isRead || n.is_read) return;
    
    const nid = n.Notification_ID || n._id;
    if (!nid) return;

    const userId = getCurrentUserId();
    if (!userId) {
      console.warn("Cannot mark as read: user not authenticated");
      return;
    }

    try {
      await fetchJsonWithAuth(`/api/notifications/${encodeURIComponent(nid)}/read`, {
        method: "PUT",
        body: JSON.stringify({ recipientId: userId }),
      });

      // Update notifications state
      setNotifications((prev) => {
        const updated = prev.map((item) => {
          const itemId = item.Notification_ID || item._id;

          if (itemId === nid) {
            return { ...item, IsRead: true, isRead: true, is_read: true };
          }

          return item;
        });

        // Recalculate unread count after update
        const unreadCount = updated.filter(
          (x) => !(x.IsRead || x.isRead || x.is_read),
        ).length;

        // Dispatch unread count event after render cycle completes
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("unite:notifications-read", {
              detail: { unread: unreadCount },
            }),
          );
        }, 0);

        return updated;
      });
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    }
  };

  const handleNotificationClick = async (n: any) => {
    await markAsRead(n);

    // Extract request ID from notification - check multiple possible fields
    const rid =
      n.Request_ID ||
      n.RelatedEntityID ||
      n.RelatedEntityId ||
      n.related_entity_id ||
      n.relatedEntityId ||
      n.requestId ||
      n.request_id;

    // Extract event ID if no request ID (for event-only notifications)
    const eventId = n.Event_ID || n.eventId || n.event_id;

    if ((rid || eventId) && n.NotificationType !== "System") {
      try {
        let requestData = null;

        // Try to fetch by request ID first (most common case)
        if (rid) {
          try {
            const url = `/api/event-requests/${encodeURIComponent(rid)}`;
            const response: any = await fetchJsonWithAuth(url);
            
            // API returns: { success: true, data: { request: {...}, staff: [...] } }
            // Extract the request object from the nested structure
            requestData = response?.data?.request || response?.data || response?.request || response;

            if (requestData) {
              console.log("Loaded request data:", { requestId: rid, hasEvent: !!requestData.event });
            }
          } catch (reqError: any) {
            console.warn("Failed to load request, trying event ID:", reqError);
            // If request fetch fails, try event ID as fallback
            if (eventId) {
              const eventUrl = `/api/events/${encodeURIComponent(eventId)}`;
              const eventResponse: any = await fetchJsonWithAuth(eventUrl);
              const eventData = eventResponse?.data || eventResponse;
              
              if (eventData) {
                // Construct request-like structure for EventViewModal
                requestData = { event: eventData };
                console.log("Loaded event data as request:", { eventId });
              }
            }
          }
        } else if (eventId) {
          // Only event ID available - fetch event and wrap in request structure
          const eventUrl = `/api/events/${encodeURIComponent(eventId)}`;
          const eventResponse: any = await fetchJsonWithAuth(eventUrl);
          const eventData = eventResponse?.data || eventResponse;
          
          if (eventData) {
            // Construct request-like structure for EventViewModal
            requestData = { event: eventData };
            console.log("Loaded event data:", { eventId });
          }
        }

        if (requestData) {
          // The EventViewModal expects: request.event or request itself
          setViewRequest(requestData);
          setViewModalOpen(true);
        } else {
          console.warn("No request/event data found in API response for notification:", {
            notificationId: n.Notification_ID || n._id,
            requestId: rid,
            eventId: eventId,
            notificationType: n.NotificationType
          });
        }
      } catch (e: any) {
        console.error("Failed to load request/event for notification:", {
          error: e.message || e,
          notificationId: n.Notification_ID || n._id,
          requestId: rid,
          eventId: eventId,
          notificationType: n.NotificationType
        });
      }
    }
  };

  // --- Filtering & Grouping ---
  const filteredNotifications = useMemo(() => {
    let base = notifications;

    // Filter based on user notification preferences
    if (notificationPreferences) {
      const enabledTypes = notificationPreferences.enabledNotificationTypes || [];
      const criticalTypes = ['request.approved', 'request.rejected', 'request.rescheduled'];
      
      // If enabledNotificationTypes is not empty, filter by it
      // (empty array means all types are enabled - default behavior)
      if (enabledTypes.length > 0) {
        base = base.filter((n) => {
          const nType = n.NotificationType || '';
          // Always include critical types
          if (criticalTypes.includes(nType)) {
            return true;
          }
          // Include if type is in enabled list
          return enabledTypes.includes(nType);
        });
      }
      // If enabledTypes is empty, show all notifications (default behavior)
    }

    // Text search filter
    if (query.trim()) {
      const q = query.toLowerCase();

      base = base.filter((n) =>
        (n.Message || n.message || "").toLowerCase().includes(q),
      );
    }

    // Tab filters
    if (selectedTab === "unread") {
      base = base.filter((n) => !(n.IsRead || n.isRead || n.is_read));
    } else if (selectedTab === "system") {
      base = base.filter((n) => {
        const nType = (n.NotificationType || "").toLowerCase();
        return nType.includes("signup") || nType.includes("cancel") || nType.includes("delete");
      });
    }

    if (qEventType && qEventType !== "all") {
      base = base.filter(
        (n) => {
          const nType = (n.NotificationType || "").toLowerCase();
          const filterType = qEventType.toLowerCase();
          
          if (filterType === "request") {
            return (
              nType === "request.pending-review" ||
              nType.includes("request") ||
              nType.includes("newrequest") ||
              nType.includes("newsignuprequest")
            );
          }
          if (filterType === "reschedule") {
            return (
              nType === "request.rescheduled" ||
              nType.includes("reschedule") ||
              nType.includes("adminrescheduled")
            );
          }
          if (filterType === "approve") {
            return (
              nType === "request.approved" ||
              nType === "event.published" ||
              nType.includes("approve") ||
              nType.includes("accept") ||
              nType.includes("adminaccepted") ||
              nType.includes("coordinatorapproved") ||
              nType.includes("requestcompleted") ||
              nType.includes("signuprequestapproved")
            );
          }
          if (filterType === "delete") {
            return (
              nType === "request.rejected" ||
              nType === "event.cancelled" ||
              nType === "event.deleted" ||
              nType.includes("delete") ||
              nType.includes("cancel") ||
              nType.includes("requestdeleted") ||
              nType.includes("requestcancelled")
            );
          }
          if (filterType === "assign") {
            return (
              nType === "event.staff-added" ||
              nType.includes("assign")
            );
          }
          
          return nType === filterType;
        }
      );
    }
    if (qDateRange?.start && qDateRange?.end) {
      const start = qDateRange.start.toDate("UTC");
      const end = qDateRange.end.toDate("UTC");
      end.setHours(23, 59, 59, 999);

      base = base.filter((n) => {
        const dateStr = n.CreatedAt?.$date || n.CreatedAt || n.createdAt;
        const date = new Date(dateStr);

        return date >= start && date <= end;
      });
    }

    return base;
  }, [notifications, query, selectedTab, qEventType, qDateRange, notificationPreferences]);

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: any[] } = {};

    filteredNotifications.forEach((n) => {
      const dateStr = n.createdAt?.$date || n.createdAt || n.CreatedAt;
      const date = new Date(dateStr);
      let key = "Older";

      if (isToday(date)) key = "Today";
      else if (isYesterday(date)) key = "Yesterday";
      else key = format(date, "MMMM d, yyyy");

      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });

    const keys = Object.keys(groups).sort((a, b) => {
      if (a === "Today") return -1;
      if (b === "Today") return 1;
      if (a === "Yesterday") return -1;
      if (b === "Yesterday") return 1;

      return 0;
    });

    return keys.map((k) => ({ title: k, items: groups[k] }));
  }, [filteredNotifications]);

  const counts = useMemo(() => {
    // Use filteredNotifications for counts to reflect preferences
    const all = filteredNotifications.length;
    const unread = filteredNotifications.filter((n) => !(n.IsRead || n.isRead || n.is_read)).length;
    const system = filteredNotifications.filter(
      (n) => {
        const nType = (n.NotificationType || "").toLowerCase();
        return nType.includes("signup") || nType.includes("cancel") || nType.includes("delete");
      }
    ).length;

    return { all, unread, system };
  }, [filteredNotifications]);

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

    // New notification types (dot notation)
    if (t === "request.rescheduled" || t.includes("reschedule") || t.includes("adminrescheduled")) {
      return {
        icon: <Clock className="w-[18px] h-[18px]" />,
        bg: "bg-[#FFF8E1]",
        text: "text-[#F59E0B]",
      };
    }
    if (
      t === "request.rejected" ||
      t === "event.cancelled" ||
      t === "event.deleted" ||
      t.includes("delete") ||
      t.includes("cancel") ||
      t.includes("reject") ||
      t.includes("requestrejected") ||
      t.includes("requestcancelled") ||
      t.includes("requestdeleted")
    ) {
      return {
        icon: <TrashBin className="w-[18px] h-[18px]" />,
        bg: "bg-[#FFEAEA]",
        text: "text-[#D92D20]",
      };
    }
    if (
      t === "request.approved" ||
      t === "event.published" ||
      t.includes("accept") ||
      t.includes("approve") ||
      t.includes("confirm") ||
      t.includes("adminaccepted") ||
      t.includes("coordinatorapproved") ||
      t.includes("requestcompleted") ||
      t.includes("signuprequestapproved")
    ) {
      return {
        icon: <CircleCheck className="w-[18px] h-[18px]" />,
        bg: "bg-[#E6F4EA]",
        text: "text-[#1E8E3E]",
      };
    }
    if (
      t === "event.staff-added" ||
      t.includes("assign") ||
      t.includes("coordinator")
    ) {
      return {
        icon: <Persons className="w-[18px] h-[18px]" />,
        bg: "bg-[#F3F4F6]",
        text: "text-[#4B5563]",
      };
    }
    if (
      t === "request.pending-review" ||
      t.includes("request") ||
      t.includes("newrequest") ||
      t.includes("newsignuprequest")
    ) {
      return {
        icon: (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#FCD34D] to-[#F87171]" />
        ),
        bg: "p-0 overflow-hidden",
        text: "",
        isGradient: true,
      };
    }
    if (t === "event.edited") {
      return {
        icon: <Person className="w-[18px] h-[18px]" />,
        bg: "bg-[#E0E7FF]",
        text: "text-[#4F46E5]",
      };
    }
    if (t === "newmessage" || t === "messageread") {
      return {
        icon: <Person className="w-[18px] h-[18px]" />,
        bg: "bg-[#F0F9FF]",
        text: "text-[#0284C7]",
      };
    }

    return {
      icon: <Person className="w-[18px] h-[18px]" />,
      bg: "bg-default-100",
      text: "text-default-500",
    };
  };

  // Animation Variants
  const modalVariants: Variants = {
    initial: isMobile ? { y: "100%", opacity: 0 } : { x: -20, opacity: 0 },
    animate: isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 },
    exit: isMobile ? { y: "100%", opacity: 0 } : { x: -20, opacity: 0 },
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop - Lower z-index, only blocks content behind notification modal */}
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={onClose}
            />

            {/* Modal Panel - Higher than backdrop but lower than event modal */}
            <motion.div
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`
                fixed z-[100000] bg-white overflow-hidden flex flex-col font-sans shadow-2xl
                inset-0 w-full h-full rounded-none
                md:left-[72px] md:top-4 md:bottom-4 md:w-[800px] md:rounded-2xl md:inset-auto md:border md:border-gray-200
              `}
            >
              {/* Header Section */}
              <div className="p-4 md:p-6 pb-2 border-b border-gray-100 flex-shrink-0">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold">Notifications</h2>
                    <p className="text-xs mt-1 text-gray-500">
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

                {/* Search & Toolbar Row 1 */}
                <div className="flex flex-col md:flex-row gap-3 mt-4 md:mt-6">
                  <Input
                    className="flex-1 w-full"
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
                    <Popover offset={10} placement={isMobile ? "bottom" : "bottom-end"} showArrow>
                      <PopoverTrigger>
                        <Button
                          className="text-gray-700 border-default-200 bg-white font-medium text-xs w-full md:w-auto"
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
                      <PopoverContent className="w-[calc(100vw-32px)] md:w-72 p-4">
                        <div className="space-y-4 w-full">
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
                              <SelectItem key="all">All</SelectItem>
                              <SelectItem key="Request">Request</SelectItem>
                              <SelectItem key="Reschedule">Reschedule</SelectItem>
                              <SelectItem key="Approve">Approve</SelectItem>
                              <SelectItem key="Delete">Delete</SelectItem>
                              <SelectItem key="Assign">Assign</SelectItem>
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

                {/* Toolbar Row 2 */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 md:mt-6 mb-2 gap-3 md:gap-0">
                  <div className="w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                    <Tabs
                      classNames={{
                        tabList: "bg-gray-100 p-1 w-full md:w-auto",
                        cursor: "bg-white shadow-sm",
                        tabContent:
                          "group-data-[selected=true]: text-xs font-medium whitespace-nowrap",
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
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                    <Button
                      className="border-default-200 text-xs font-medium flex-1 md:flex-none"
                      endContent={<ChevronDown className="w-3 h-3" />}
                      radius="md"
                      size="sm"
                      startContent={<Clock className="w-3 h-3" />}
                      variant="bordered"
                    >
                      Today
                    </Button>
                    <Button
                      className="text-xs font-medium border-default-200 flex-1 md:flex-none"
                      radius="md"
                      size="sm"
                      startContent={<Check className="w-3 h-3" />}
                      variant="bordered"
                      onPress={markAllRead}
                    >
                      Mark all read
                    </Button>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="px-4 md:px-6 py-3 bg-red-50 border-b border-red-200">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

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
                    <p className="text-xs">
                      {error ? "Failed to load notifications" : "No notifications found"}
                    </p>
                  </div>
                ) : (
                  <div className="pb-20 md:pb-6">
                    {groupedNotifications.map((group) => (
                      <div key={group.title}>
                        <div className="px-4 md:px-6 py-3 bg-white sticky top-0 z-10 border-b border-gray-50 md:border-none">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {group.title}
                          </span>
                        </div>

                        <div className="space-y-1 px-3 md:px-4">
                          {group.items.map((n) => {
                            // Check both IsRead and isRead for compatibility
                            const isRead = n.IsRead || n.isRead || n.is_read;
                            const { icon, bg, text } = getIconAndStyle(
                              n.NotificationType,
                            );
                            
                            // Check if this is a critical notification
                            const criticalTypes = ['request.approved', 'request.rejected', 'request.rescheduled'];
                            const isCritical = criticalTypes.includes(n.NotificationType || '');

                            return (
                              <div
                                key={n.Notification_ID || n._id}
                                className="group relative p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer flex items-start gap-3 md:gap-4 active:bg-gray-100"
                                role="button"
                                tabIndex={0}
                                onClick={() => handleNotificationClick(n)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    handleNotificationClick(n);
                                  }
                                }}
                              >
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg} ${text}`}
                                >
                                  {icon}
                                </div>

                                <div className="flex-1 min-w-0 pt-0.5">
                                  <div className="flex items-start gap-2">
                                    <p className={`text-sm md:text-xs leading-snug flex-1 ${isRead ? 'text-gray-500' : 'text-gray-900'}`}>
                                      {n.Message || n.message}
                                    </p>
                                    {isCritical && (
                                      <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded" title="Critical notification">
                                        Required
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-2 flex items-center">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-gray-200 bg-white">
                                      <Clock className="w-3 h-3 text-gray-400" />
                                      <span className="text-[10px] font-medium text-gray-600">
                                        {formatTime(
                                          n.createdAt?.$date || n.createdAt || n.CreatedAt,
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 pt-2">
                                  {!isRead && (
                                    <div className="w-2.5 h-2.5 md:w-2 md:h-2 bg-red-500 rounded-full ring-2 ring-white" />
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Portal: EventViewModal with even higher z-index to appear above notification modal */}
      {createPortal(
        <EventViewModal
          isOpen={viewModalOpen}
          request={viewRequest}
          onClose={() => {
            setViewModalOpen(false);
            setViewRequest(null);
          }}
        />,
        document.body
      )}
    </>
  );
}