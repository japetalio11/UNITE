"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  EllipsisVertical as MoreVertical,
  Eye,
  Pencil as Edit,
  Persons as Users,
  TrashBin as Trash2,
  Check,
  Xmark as X,
} from "@gravity-ui/icons";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/dropdown";
import { Tabs, Tab } from "@heroui/tabs";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { User } from "@heroui/user";
import { usePathname } from "next/navigation";

import EventViewModal from "@/components/calendar/event-view-modal";
import EditEventModal from "@/components/calendar/event-edit-modal";
import EventManageStaffModal from "@/components/calendar/event-manage-staff-modal";
import EventRescheduleModal from "@/components/calendar/event-reschedule-modal";
import CalendarToolbar from "@/components/calendar/calendar-toolbar";
import CalendarEventCard from "@/components/calendar/calendar-event-card";
import { transformEventData } from "@/components/calendar/calendar-event-utils";
import Topbar from "@/components/layout/topbar";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getUserInfo } from "@/utils/getUserInfo";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCalendarExport } from "@/hooks/useCalendarExport";
import { getEventActionPermissions, isAdminByAuthority, clearPermissionCache } from "@/utils/eventActionPermissions";
import { decodeJwt } from "@/utils/decodeJwt";
import { hasCapability } from "@/utils/permissionUtils";
import MobileNav from "@/components/tools/mobile-nav";
import { useLocations } from "@/components/providers/locations-provider";
import {
  Ticket,
  Calendar as CalIcon,
  PersonPlanetEarth,
  Persons,
  Bell,
  Gear,
  Comments,
} from "@gravity-ui/icons";

export default function CalendarPage(props: any) {
  const publicTitle: string | undefined = props?.publicTitle;
  const pathname = usePathname();
  // Allow create on dashboard calendar, but not on public calendar route
  const allowCreateByPath = pathname === "/calendar" ? false : true;
  // State for permission check (separate from path check)
  // null = checking, true = allowed, false = denied
  const [canCreateEvent, setCanCreateEvent] = useState<boolean | null>(null);
  // Combine both checks - only allow if path permits AND user has permission
  // Button is enabled if path permits AND permission check is true
  // Button is disabled if path denies OR permission check is false/null
  const allowCreate = allowCreateByPath && canCreateEvent === true;
  
  // Default to month view on mobile, week view on desktop
  const [activeView, setActiveView] = useState("week");
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [weekEventsByDate, setWeekEventsByDate] = useState<
    Record<string, any[]>
  >({});
  const [monthEventsByDate, setMonthEventsByDate] = useState<
    Record<string, any[]>
  >({});
  const [detailedEvents, setDetailedEvents] = useState<Record<string, any>>({});
  const [eventsLoading, setEventsLoading] = useState(false);
  const [isExportLoading, setIsExportLoading] = useState(false);
  // Cache for event action permissions (keyed by eventId)
  const [eventPermissionsCache, setEventPermissionsCache] = useState<
    Record<string, Awaited<ReturnType<typeof getEventActionPermissions>>>
  >({});
  // Track loading state for each event's permissions
  const [eventPermissionsLoading, setEventPermissionsLoading] = useState<
    Record<string, boolean>
  >({});
  // Fetch current user from API
  const { user: currentUser } = useCurrentUser();
  
  const [currentUserName, setCurrentUserName] = useState<string>(
    "unite user",
  );
  const [currentUserEmail, setCurrentUserEmail] =
    useState<string>("unite@health.tech");

  // Update display name and email from API user data
  useEffect(() => {
    if (currentUser) {
      if (currentUser.fullName) {
        setCurrentUserName(currentUser.fullName);
      } else if (currentUser.firstName || currentUser.lastName) {
        const nameParts = [currentUser.firstName, currentUser.middleName, currentUser.lastName].filter(Boolean);
        setCurrentUserName(nameParts.join(" ") || "unite user");
      }
      if (currentUser.email) {
        setCurrentUserEmail(currentUser.email);
      }
    }
  }, [currentUser]);

  // Check if user has permission to create events/requests - PERMISSION-BASED ONLY
  useEffect(() => {
    const checkCreatePermission = async () => {
      try {
        const rawUser = localStorage.getItem("unite_user");
        const user = rawUser ? JSON.parse(rawUser) : null;
        const token =
          localStorage.getItem("unite_token") ||
          sessionStorage.getItem("unite_token");
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        
        // If no token, user is unauthenticated - cannot create
        if (!token) {
          setCanCreateEvent(false);
          return;
        }
        
        // Default to true for authenticated users (if we can't check, assume allowed)
        let hasPermission = true;
        
        // Helper function to check if a permission string contains the capability
        const checkPermissionString = (permString: string, capability: string): boolean => {
          if (!permString || typeof permString !== 'string') return false;
          // Handle comma-separated permissions like "event.create,read,update"
          const perms = permString.split(',').map(p => p.trim());
          // Check for exact match, wildcard all (*.*), or resource wildcard (event.*, request.*)
          const hasExactMatch = perms.includes(capability);
          const hasWildcard = perms.includes('*.*');
          const [res, action] = capability.split('.');
          const hasResourceWildcard = perms.some(p => {
            // Check for resource.* (e.g., 'event.*', 'request.*')
            return p === `${res}.*` || p === '*.*';
          });
          return hasExactMatch || hasWildcard || hasResourceWildcard;
        };
        
        // Helper to check permissions array (handles both formats)
        const checkPermissionsArray = (permissions: any[]): boolean => {
          if (!Array.isArray(permissions) || permissions.length === 0) return false;
          
          return permissions.some((perm: any) => {
            if (typeof perm === 'string') {
              // Handle comma-separated string format: 'event.initiate,read,update'
              if (perm.includes(',')) {
                return checkPermissionString(perm, 'event.initiate') || 
                       checkPermissionString(perm, 'request.initiate');
              }
              // Handle single permission string - ONLY check initiate (not create)
              return perm === 'event.initiate' || 
                     perm === 'request.initiate' ||
                     perm === '*.*' ||
                     perm === 'event.*' ||
                     perm === 'request.*';
            }
            // Handle structured permission objects (if any)
            if (perm && typeof perm === 'object') {
              const resource = perm.resource;
              const actions = Array.isArray(perm.actions) ? perm.actions : [];
              // Only check for initiate (not create) - create is for workflow operations only
              if (resource === '*' && (actions.includes('*') || actions.includes('initiate'))) return true;
              if ((resource === 'event' || resource === 'request') && actions.includes('initiate')) return true;
            }
            return false;
          });
        };
        
        // Extract user ID from multiple sources
        let userId = user?._id || user?.id || user?.ID || user?.userId || user?.user_id;
        
        // If user ID not found in user object, try to get it from JWT token
        if (!userId && token) {
          try {
            const payload = decodeJwt(token);
            userId = payload?.id || payload?.userId || payload?.user_id || payload?._id || payload?.sub;
          } catch (e) {
            // Failed to decode JWT - continue without userId
          }
        }
        
        // PRIORITY 1: Check localStorage permissions FIRST (faster, no API call needed)
        if (user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
          const found = checkPermissionsArray(user.permissions);
          // If we have permissions data, use it to determine access
          setCanCreateEvent(found);
          return;
        }
        
        // PRIORITY 2: Try API for most accurate permission data
        if (token && API_URL) {
          try {
            const headers: any = { "Content-Type": "application/json" };
            headers["Authorization"] = `Bearer ${token}`;
            
            // Try /api/auth/me first (doesn't require user ID)
            const meRes = await fetch(`${API_URL}/api/auth/me`, {
              headers,
              credentials: "include",
            });
            
            if (meRes.ok) {
              const meBody = await meRes.json();
              const meUser = meBody.user || meBody.data || meBody;
              const permissions = meUser?.permissions || [];
              
              if (Array.isArray(permissions) && permissions.length > 0) {
                const found = checkPermissionsArray(permissions);
                setCanCreateEvent(found);
                return;
              }
            }
          } catch (meErr) {
            // Failed to fetch from /api/auth/me - continue to next check
          }
        }
        
        // Fallback: Try /api/users/:userId/capabilities if we have userId
        if (userId && token && API_URL) {
            try {
              const headers: any = { "Content-Type": "application/json" };
              headers["Authorization"] = `Bearer ${token}`;
              
              const res = await fetch(`${API_URL}/api/users/${userId}/capabilities`, {
                headers,
                credentials: "include",
              });
              
              if (res.ok) {
                const body = await res.json();
                const capabilities = body.data?.capabilities || body.capabilities || body.data || [];
                
                if (Array.isArray(capabilities) && capabilities.length > 0) {
                  const found = checkPermissionsArray(capabilities);
                  setCanCreateEvent(found);
                  return;
                }
              }
            } catch (apiErr) {
              // Failed to fetch capabilities - continue to check user object as fallback
            }
          }
          
        // PRIORITY 3: Check roles for permissions
        if (user?.roles && Array.isArray(user.roles)) {
            // Try hasCapability utility for structured roles - ONLY check initiate (not create)
            const found = hasCapability(user, 'event.initiate') || hasCapability(user, 'request.initiate');
            if (found) {
              setCanCreateEvent(true);
              return;
            }
            
            // Also check if roles have permissions arrays
            for (const role of user.roles) {
              if (role && role.permissions && Array.isArray(role.permissions)) {
                const found = checkPermissionsArray(role.permissions);
                if (found) {
                  setCanCreateEvent(true);
                  return;
                }
              }
            }
        }
        
        // PRIORITY 4: Check nested data structures
        if (user?.data && user.data.permissions) {
          const found = checkPermissionsArray(user.data.permissions);
          if (found) {
            setCanCreateEvent(true);
            return;
          }
        }
        
        // Default: If authenticated but no explicit permissions found, allow (true)
        // This is safer for UX - they can try to create and get an API error if denied
        setCanCreateEvent(true);
      } catch (err) {
        // On error, default to true for authenticated users (safer UX)
        const token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token");
        setCanCreateEvent(!!token);
      }
    };
    
    checkCreatePermission().catch(() => {
      // On unhandled error, check if user is authenticated
      const token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token");
      setCanCreateEvent(!!token);
    });
  }, []);
  
  // Initialize locations provider for location resolution
  const { getProvinceName, getDistrictName, getMunicipalityName, locations } = useLocations();
  
  // Initialize export hook
  const { exportVisualPDF, exportOrganizedPDF } = useCalendarExport();
  
  const [isDateTransitioning, setIsDateTransitioning] = useState(false);
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "right",
  );
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const [quickFilterCategory, setQuickFilterCategory] = useState<
    string | undefined
  >(undefined);
  const [advancedFilter, setAdvancedFilter] = useState<{
    start?: string;
    coordinator?: string;
    title?: string;
    requester?: string;
  }>({});
  const router = useRouter();
  // Action modal states keyed by Event_ID
  const [rescheduleOpenId, setRescheduleOpenId] = useState<string | null>(null);
  const [cancelOpenId, setCancelOpenId] = useState<string | null>(null);
  const [manageStaffOpenId, setManageStaffOpenId] = useState<string | null>(
    null,
  );
  const [acceptOpenId, setAcceptOpenId] = useState<string | null>(null);
  const [rejectOpenId, setRejectOpenId] = useState<string | null>(null);

  const [acceptNote, setAcceptNote] = useState<string>("");
  const [acceptSaving, setAcceptSaving] = useState<boolean>(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const [rejectNote, setRejectNote] = useState<string>("");
  const [rejectSaving, setRejectSaving] = useState<boolean>(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Reschedule state per event
  const [rescheduledDateMap, setRescheduledDateMap] = useState<
    Record<string, any>
  >({});
  const [rescheduleNoteMap, setRescheduleNoteMap] = useState<
    Record<string, string>
  >({});

  // Manage staff simple state
  const [staffMap, setStaffMap] = useState<
    Record<string, Array<{ FullName: string; Role: string }>>
  >({});
  const [staffLoading, setStaffLoading] = useState(false);

  // Mobile navigation state (matches Campaign page pattern)
  const [isMobile, setIsMobile] = useState(false);

  // Set default view to month on mobile, week on desktop
  useEffect(() => {
    const checkViewport = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && activeView === "week") {
        // Mobile: force month view
        setActiveView("month");
      }
    };
    
    // Check on mount
    if (typeof window !== "undefined") {
      checkViewport();
      // Listen for resize events
      window.addEventListener("resize", checkViewport);
      return () => window.removeEventListener("resize", checkViewport);
    }
  }, [activeView]);

  // Horizontal scroll refs for calendar views
  const weekViewRef = useRef<HTMLDivElement>(null);
  const monthViewRef = useRef<HTMLDivElement>(null);

  // Close create menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        createMenuRef.current &&
        !createMenuRef.current.contains(event.target as Node)
      ) {
        setIsCreateMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // API base (allow override via NEXT_PUBLIC_API_URL)
  const API_BASE =
    typeof process !== "undefined" &&
    process.env &&
    process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL
      : "http://localhost:3000";

  // Helpers to normalize date keys (use local date YYYY-MM-DD)
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateToLocalKey = (d: Date) => {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Parse server-provided dates robustly.
  // If backend sends a date-only string like '2025-11-17' treat it as local date
  // to avoid timezone shifts from UTC parsing.
  const parseServerDate = (raw: any): Date | null => {
    if (!raw && raw !== 0) return null;
    try {
      if (typeof raw === "string") {
        const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

        if (m) {
          const y = Number(m[1]);
          const mo = Number(m[2]) - 1;
          const d = Number(m[3]);

          return new Date(y, mo, d);
        }

        return new Date(raw);
      }
      if (typeof raw === "object" && raw.$date) {
        const d = raw.$date;

        if (typeof d === "object" && d.$numberLong)
          return new Date(Number(d.$numberLong));

        return new Date(d as any);
      }

      return new Date(raw as any);
    } catch (e) {
      return null;
    }
  };

  // Note: extractId and parseServerDate are now in calendar-event-utils.ts
  // parseServerDate is kept here for backward compatibility with other parts of the page

  const normalizeEventsMap = (
    input: Record<string, any> | undefined,
  ): Record<string, any[]> => {
    const out: Record<string, any[]> = {};

    if (!input) return out;
    try {
      // Helper: recursively search an object for the first array of event-like objects
      const findArrayInObject = (val: any, depth = 0): any[] | null => {
        if (!val || depth > 6) return null; // limit depth
        if (Array.isArray(val)) return val;
        if (typeof val !== "object") return null;
        const commonKeys = ["events", "data", "eventsByDate", "weekDays"];

        for (const k of commonKeys) {
          if (Array.isArray(val[k])) return val[k];
        }
        for (const k of Object.keys(val)) {
          try {
            const found = findArrayInObject(val[k], depth + 1);

            if (found && Array.isArray(found)) return found;
          } catch (e) {
            // ignore
          }
        }

        return null;
      };

      Object.keys(input).forEach((rawKey) => {
        // Attempt to parse rawKey into a Date. If parsing fails, keep as-is.
        const parsed = new Date(rawKey);
        let localKey = rawKey;

        if (!isNaN(parsed.getTime())) {
          localKey = dateToLocalKey(parsed);
        }

        const rawVal = input[rawKey];
        let vals: any[] = [];

        const found = findArrayInObject(rawVal);

        if (found && Array.isArray(found)) vals = found;
        else if (Array.isArray(rawVal)) vals = rawVal;
        else if (rawVal && typeof rawVal === "object") vals = [rawVal];
        else if (rawVal !== undefined && rawVal !== null) vals = [rawVal];

        if (!out[localKey]) out[localKey] = [];
        out[localKey] = out[localKey].concat(vals);
      });

      // Deduplicate events per date (prefer Event_ID / EventId when available)
      Object.keys(out).forEach((k) => {
        const seen = new Set<string>();

        out[k] = out[k].filter((ev) => {
          const id =
            ev && (ev.Event_ID || ev.EventId || ev.id)
              ? String(ev.Event_ID ?? ev.EventId ?? ev.id)
              : JSON.stringify(ev);

          if (seen.has(id)) return false;
          seen.add(id);

          return true;
        });
      });
    } catch (e) {
      return input as Record<string, any[]>;
    }

    return out;
  };

  // Fetch detailed information for events
  const fetchEventDetails = async (eventIds: string[]) => {
    if (!Array.isArray(eventIds) || eventIds.length === 0) return {};

    // Filter out ids already cached
    const idsToFetch = eventIds.filter((id) => id && !detailedEvents[id]);
    if (idsToFetch.length === 0) return {};

    const token =
      typeof window !== "undefined" &&
      (localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token"));

    const headers: any = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/api/events/batch`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ids: idsToFetch }),
        credentials: token ? undefined : "include",
      });

      const body = await res.json();

      if (res.ok && body && Array.isArray(body.data)) {
        const result: Record<string, any> = {};
        body.data.forEach((ev: any) => {
          const id = ev.Event_ID || ev.EventId || ev.id;
          if (id) result[String(id)] = ev;
        });

        if (Object.keys(result).length > 0) {
          setDetailedEvents((prev) => ({ ...prev, ...result }));
        }

        return result;
      }
    } catch (e) {
      // ignore batch fetch errors
    }

    return {};
  };

  // Fetch real events from backend and populate week/month maps
  useEffect(() => {
    refreshCalendarData();
  }, [currentDate]);

  // Pre-fetch permissions for all visible events
  useEffect(() => {
    const fetchPermissionsForEvents = async () => {
      // Get all unique event IDs from week and month views
      const allEventIds = new Set<string>();
      const eventMap = new Map<string, any>();
      
      Object.values(weekEventsByDate).forEach((events) => {
        events.forEach((event: any) => {
          const evId = event.Event_ID || event.EventId || event.id;
          if (evId && !eventPermissionsCache[evId]) {
            allEventIds.add(evId);
            eventMap.set(evId, event);
          }
        });
      });
      
      Object.values(monthEventsByDate).forEach((events) => {
        events.forEach((event: any) => {
          const evId = event.Event_ID || event.EventId || event.id;
          if (evId && !eventPermissionsCache[evId]) {
            allEventIds.add(evId);
            if (!eventMap.has(evId)) {
              eventMap.set(evId, event);
            }
          }
        });
      });

      // Fetch permissions for all events in parallel (with limit to avoid too many requests)
      const eventIdsArray = Array.from(allEventIds).slice(0, 20); // Limit to 20 at a time
      
      // Get user ID
      const rawUserStr =
        typeof window !== "undefined" ? localStorage.getItem("unite_user") : null;
      let parsedUser: any = null;
      try {
        parsedUser = rawUserStr ? JSON.parse(rawUserStr) : null;
      } catch (e) {
        parsedUser = null;
      }
      
      const userId = parsedUser?._id || parsedUser?.id || parsedUser?.User_ID || null;
      
      await Promise.all(
        eventIdsArray.map(async (evId) => {
          const eventObj = eventMap.get(evId);
          if (eventObj) {
            try {
              const permissions = await getEventActionPermissions(eventObj, userId, false);
              setEventPermissionsCache((prev) => ({
                ...prev,
                [evId]: permissions,
              }));
            } catch (error) {
              console.error(`[Calendar] Error fetching permissions for event ${evId}:`, error);
            }
          }
        })
      );
    };

    if (Object.keys(weekEventsByDate).length > 0 || Object.keys(monthEventsByDate).length > 0) {
      fetchPermissionsForEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekEventsByDate, monthEventsByDate]);

  const navigateWeek = async (direction: "prev" | "next") => {
    setIsDateTransitioning(true);
    setSlideDirection(direction === "prev" ? "right" : "left");

    const newDate = new Date(currentDate);

    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);

    setTimeout(() => {
      setIsDateTransitioning(false);
    }, 300);
  };

  const navigateMonth = async (direction: "prev" | "next") => {
    setIsDateTransitioning(true);

    const newDate = new Date(currentDate);

    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);

    setTimeout(() => {
      setIsDateTransitioning(false);
    }, 300);
  };

  const formatWeekRange = (date: Date) => {
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek;

    startOfWeek.setDate(diff);

    const endOfWeek = new Date(startOfWeek);

    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const startMonth = startOfWeek.toLocaleString("default", { month: "long" });
    const endMonth = endOfWeek.toLocaleString("default", { month: "long" });
    const year = startOfWeek.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${year}`;
    } else {
      return `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()} ${year}`;
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  };

  const getDaysForWeek = (date: Date) => {
    const days = [];
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek;

    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);

      dayDate.setDate(startOfWeek.getDate() + i);
      days.push({
        date: dayDate.getDate(),
        day: dayDate.toLocaleString("default", { weekday: "short" }),
        fullDate: new Date(dayDate),
        isToday: isToday(dayDate),
        month: dayDate.toLocaleString("default", { month: "short" }),
      });
    }

    return days;
  };

  const generateMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDate = new Date(firstDay);

    startDate.setDate(firstDay.getDate() - firstDay.getDay());

    const endDate = new Date(lastDay);

    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

    const days = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      days.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: isToday(currentDate),
        events: getEventsForDate(new Date(currentDate)),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const makeOrdinal = (n: number | string) => {
    const num = parseInt(String(n), 10);

    if (isNaN(num)) return String(n);
    const suffixes = ["th", "st", "nd", "rd"];
    const v = num % 100;
    const suffix = v >= 11 && v <= 13 ? "th" : suffixes[num % 10] || "th";

    return `${num}${suffix}`;
  };

  // Helper to convert Roman numerals to numbers
  const romanToNumber = (roman: string): number => {
    const romanMap: Record<string, number> = {
      I: 1,
      V: 5,
      X: 10,
      L: 50,
      C: 100,
      D: 500,
      M: 1000,
    };

    let total = 0;
    for (let i = 0; i < roman.length; i++) {
      const current = romanMap[roman[i]];
      const next = romanMap[roman[i + 1]];

      if (next && current < next) {
        total -= current;
      } else {
        total += current;
      }
    }

    return total;
  };

  // Helper to extract district number from district name
  const extractDistrictNumber = (districtName: string): number | null => {
    if (!districtName || typeof districtName !== "string") return null;

    // Try to match "District X" where X is Roman numeral or number
    const match = districtName.match(/^District\s+(.+)$/i);
    if (!match) return null;

    const districtPart = match[1].trim();

    // Try to parse as number first
    const num = parseInt(districtPart, 10);
    if (!isNaN(num)) return num;

    // Try to convert Roman numeral
    try {
      return romanToNumber(districtPart.toUpperCase());
    } catch {
      return null;
    }
  };

  const getEventsForDate = (date: Date) => {
    const key = dateToLocalKey(date);
    const source =
      activeView === "month" ? monthEventsByDate : weekEventsByDate;
    // Prefer normalized local key; fallback to ISO UTC key or raw date string if present
    const isoKey = date.toISOString().split("T")[0];
    
    
    let raw: any =
      source[key] || source[isoKey] || source[date.toString()] || [];

    // If backend returned a container object for this date, try to extract the array
    if (raw && !Array.isArray(raw) && typeof raw === "object") {
      if (Array.isArray(raw.events)) raw = raw.events;
      else if (Array.isArray(raw.data)) raw = raw.data;
      else raw = [raw];
    }

    raw = Array.isArray(raw) ? raw : [];


    // Events from public API are already approved, no additional filtering needed
    const approved = raw;

    // Deduplicate approved list just in case
    const deduped: any[] = [];
    const seenIds = new Set<string>();

    for (const e of approved) {
      const id = e?.Event_ID ?? e?.EventId ?? JSON.stringify(e);
      const sid = String(id);

      if (seenIds.has(sid)) continue;
      seenIds.add(sid);
      deduped.push(e);
    }

    // For both week and month views, avoid showing events on days other than their Start_Date
    // Since events are already grouped by date key in weekEventsByDate/monthEventsByDate,
    // this filter is mainly a safety check. However, we should be lenient to avoid filtering
    // out events that should be displayed.
    const filterByStartDate = (ev: any) => {
      // If we found events in the source for this date key, they're already filtered correctly
      // Only filter if the event's start date clearly doesn't match
      let start: Date | null = null;

      try {
        if (ev.Start_Date) {
          start = parseServerDate(ev.Start_Date);
        } else {
          // If no Start_Date, but event is in the source for this date, allow it
          // (might be a data inconsistency, but don't hide the event)
          return true;
        }
      } catch (err) {
        // If parsing fails, but event is in source for this date, allow it
        return true; // Be lenient - if it's in the source for this date, show it
      }
      
      if (!start) {
        // No valid start date, but if it's in source for this date, allow it
        return true;
      }

      const eventKey = dateToLocalKey(start);
      const matches = eventKey === key;

      return matches;
    };

    const finalList = deduped.filter(filterByStartDate);

    // Apply quick / advanced filters
    const afterQuick = finalList
      .filter((ev: any) => {
        if (!quickFilterCategory) return true;
        const rawCat = (ev.Category ?? ev.category ?? "")
          .toString()
          .toLowerCase();
        let categoryLabel = "Event";

        if (rawCat.includes("blood")) categoryLabel = "Blood Drive";
        else if (rawCat.includes("training")) categoryLabel = "Training";
        else if (rawCat.includes("advocacy")) categoryLabel = "Advocacy";

        return (
          quickFilterCategory === "" ||
          quickFilterCategory === undefined ||
          quickFilterCategory === categoryLabel
        );
      })
      .filter((ev: any) => {
        // advanced filter: start date (only events on or after)
        if (advancedFilter.start) {
          let start: Date | null = null;

          try {
            if (ev.Start_Date)
              start =
                typeof ev.Start_Date === "string"
                  ? new Date(ev.Start_Date)
                  : ev.Start_Date.$date
                    ? new Date(ev.Start_Date.$date)
                    : new Date(ev.Start_Date);
          } catch (err) {
            start = null;
          }
          if (start) {
            const s = new Date(advancedFilter.start);

            if (start < s) return false;
          }
        }
        if (advancedFilter.coordinator && advancedFilter.coordinator.trim()) {
          const coordQ = advancedFilter.coordinator.trim().toLowerCase();
          const coordinatorName = (
            ev.coordinator?.name ||
            ev.StakeholderName ||
            ev.MadeByCoordinatorName ||
            ev.coordinatorName ||
            ev.Email ||
            ""
          )
            .toString()
            .toLowerCase();

          if (!coordinatorName.includes(coordQ)) return false;
        }
        if (advancedFilter.title && advancedFilter.title.trim()) {
          const titleQ = advancedFilter.title.trim().toLowerCase();
          const evtTitle = (
            ev.Event_Title ||
            ev.title ||
            ev.EventTitle ||
            ev.eventTitle ||
            ""
          )
            .toString()
            .toLowerCase();

          if (!evtTitle.includes(titleQ)) return false;
        }
        if (advancedFilter.requester && advancedFilter.requester.trim()) {
          const reqQ = advancedFilter.requester.trim().toLowerCase();
          const requesterName = (
            ev.createdByName ||
            ev.raw?.createdByName ||
            ev.MadeByStakeholderName ||
            ev.StakeholderName ||
            ev.coordinator?.name ||
            ev.coordinatorName ||
            ev.Email ||
            ""
          )
            .toString()
            .toLowerCase();

          if (!requesterName.includes(reqQ)) return false;
        }

        return true;
      });

    // Transform events using utility functions
    return afterQuick.map((e: any) => {
      const eventId = e.Event_ID || e.EventId;
      
      // Since new endpoints return complete data with category and categoryData,
      // use the event itself as detailedEvent (it already has all the data we need)
      // Only use detailedEvents cache if it exists (for backward compatibility)
      const detailedEvent = (eventId && detailedEvents[eventId]) ? detailedEvents[eventId] : e;

      // Use transformEventData utility to create well-structured event object
      const transformed = transformEventData(
        e,
        detailedEvent,
        {
          getProvinceName,
          getDistrictName,
          getMunicipalityName,
        }
      );

      // Return transformed event with backward-compatible fields for month view
      return {
        ...transformed,
        time: transformed.startTime, // For backward compatibility
        type: transformed.category, // For backward compatibility
        coordinatorName: transformed.ownerName, // For backward compatibility
        raw: e, // Keep raw event for actions/modals
      };
    });
  };

  // Handlers for toolbar actions
  const handleExport = async (exportType: string) => {
    if (!exportType) return;
    
    setIsExportLoading(true);
    try {
      const monthYear = formatMonthYear(currentDate);
      const filename = `calendar-${monthYear.replace(' ', '-').toLowerCase()}`;

      if (exportType === 'visual') {
        // Only export if month view is active
        if (activeView !== 'month') {
          console.warn('Visual export only available in month view');
          alert('Please switch to month view to export the calendar.');
          setIsExportLoading(false);
          return;
        }

        // Get organization name if available (could be from user context or settings)
        const organizationName = 'Bicol Transfusion Service Center'; // Default, can be made configurable (note: "Centre" is correct spelling)
        
        // Pass monthEventsByDate, currentDate, and organizationName to export function
        const result = await exportVisualPDF(monthEventsByDate, currentDate, organizationName);
        
        if (!result.success) {
          const errorMsg = result.error || 'Failed to export calendar';
          throw new Error(errorMsg);
        }
      } else if (exportType === 'organized') {
        // Get all events for current month from monthEventsByDate
        const allEvents: any[] = [];
        Object.values(monthEventsByDate).forEach((dayEvents) => {
          allEvents.push(...dayEvents);
        });
        
        await exportOrganizedPDF(allEvents, monthYear, filename);
      }
    } catch (error) {
      console.error('Export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      alert(`Export failed: ${errorMessage}`);
    } finally {
      setIsExportLoading(false);
    }
  };

  const handleQuickFilter = (f?: any) => {
    if (f && Object.prototype.hasOwnProperty.call(f, "category"))
      setQuickFilterCategory(f.category);
    else setQuickFilterCategory(undefined);
  };

  const handleAdvancedFilter = (f?: {
    start?: string;
    end?: string;
    coordinator?: string;
    title?: string;
    requester?: string;
  }) => {
    if (f)
      setAdvancedFilter({
        start: f.start,
        coordinator: f.coordinator,
        title: f.title,
        requester: f.requester,
      });
    else setAdvancedFilter({});
  };

  const refreshCalendarData = async () => {
    const year = currentDate.getFullYear();
    const monthIndex = currentDate.getMonth();

    try {
      const monthStart = new Date(year, monthIndex, 1);
      const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

      // Check if user is authenticated to use /api/me/events, otherwise use /api/events/all
      const token =
        typeof window !== "undefined" &&
        (localStorage.getItem("unite_token") ||
          sessionStorage.getItem("unite_token"));

      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Always use the calendar-focused endpoint which returns all approved events
      // (authenticated users still get the same approved events list; permissions
      // for actions are fetched separately per-event)
      const eventsUrl = `${API_BASE}/api/events/all?date_from=${encodeURIComponent(
        monthStart.toISOString(),
      )}&date_to=${encodeURIComponent(monthEnd.toISOString())}`;

      const eventsResp = await fetch(eventsUrl, { headers, credentials: "include" });
      const eventsJson = await eventsResp.json();

      if (eventsResp.ok && eventsJson.success && Array.isArray(eventsJson.data)) {
        const monthEvents = eventsJson.data;

        // Events from new endpoints are already populated with location names, category data, etc.
        // No need for batch fetch - data is already complete

        // Group by date
        const eventsByDate: Record<string, any[]> = {};
        monthEvents.forEach((event: any) => {
          const startDate = parseServerDate(event.Start_Date);
          if (!startDate) return;
          const dateKey = dateToLocalKey(startDate);
          if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
          eventsByDate[dateKey].push(event);
        });

        const normalizedMonth = normalizeEventsMap(eventsByDate);
        setMonthEventsByDate(normalizedMonth);

        // Create week view by filtering month events to current week
        const wkStart = new Date(currentDate);
        const dayOfWeek = wkStart.getDay();
        wkStart.setDate(wkStart.getDate() - dayOfWeek);
        wkStart.setHours(0, 0, 0, 0);
        const wkEnd = new Date(wkStart);
        wkEnd.setDate(wkStart.getDate() + 6);
        wkEnd.setHours(23, 59, 59, 999);

        // Generate all date keys for the week to ensure consistent matching
        const weekDateKeys = new Set<string>();
        for (let i = 0; i < 7; i++) {
          const weekDate = new Date(wkStart);
          weekDate.setDate(wkStart.getDate() + i);
          weekDateKeys.add(dateToLocalKey(weekDate));
        }

        const weekEvents: Record<string, any[]> = {};

        // Use date key matching instead of Date object comparison to avoid timezone issues
        Object.keys(normalizedMonth).forEach((dateKey) => {
          const events = normalizedMonth[dateKey] || [];

          // Check if this date key falls within the current week using key matching
          if (weekDateKeys.has(dateKey)) {
            weekEvents[dateKey] = events;
          }
        });

        setWeekEventsByDate(weekEvents);
      } else {
        // If new endpoint fails, fall back to empty state
        setMonthEventsByDate({});
        setWeekEventsByDate({});
      }
    } catch (e) {
      console.error("[refreshCalendarData] Error fetching events:", e);
      setMonthEventsByDate({});
      setWeekEventsByDate({});
    }
  };

  // Perform an admin action (Accepted/Rejected/Rescheduled) given an Event_ID.
  // This will fetch the event to determine the linked request id, then call
  // the unified actions endpoint on the request.
  const performAdminActionByEventId = async (
    eventId: string,
    action: string,
    note?: string,
    rescheduledDate?: string,
  ) => {
    if (!eventId) throw new Error("Missing event id");
    // fetch event details to find request id
    const headers: any = { "Content-Type": "application/json" };
    const rawUser =
      typeof window !== "undefined" ? localStorage.getItem("unite_user") : null;
    const user = rawUser ? JSON.parse(rawUser as string) : null;
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("unite_token") ||
          sessionStorage.getItem("unite_token")
        : null;

    if (token) headers["Authorization"] = `Bearer ${token}`;

    // load event to resolve request id
    const evRes = await fetch(
      `${API_BASE}/api/events/${encodeURIComponent(eventId)}`,
      token ? { headers } : { headers, credentials: "include" },
    );
    const evBody = await evRes.json();

    if (!evRes.ok)
      throw new Error(evBody.message || "Failed to fetch event details");
    const evData = evBody.data || evBody.event || evBody;
    const requestId =
      evData?.request?.Request_ID ||
      evData?.Request_ID ||
      evData?.requestId ||
      evData?.request?.RequestId ||
      null;

    if (!requestId)
      throw new Error("Unable to determine request id for action");

    // Map old action names to new unified action names
    const actionMap: Record<string, string> = {
      "Accepted": "accept",
      "Rejected": "reject",
      "Rescheduled": "reschedule",
      "Cancelled": "cancel",
    };
    const unifiedAction = actionMap[action] || action.toLowerCase();

    const body: any = { action: unifiedAction, note: note ? note.trim() : undefined };

    if (rescheduledDate) body.proposedDate = rescheduledDate;

    let res;

    if (token) {
      res = await fetchWithAuth(
        `${API_BASE}/api/event-requests/${encodeURIComponent(requestId)}/actions`,
        { method: "POST", body: JSON.stringify(body) },
      );
    } else {
      res = await fetch(
        `${API_BASE}/api/event-requests/${encodeURIComponent(requestId)}/actions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          credentials: "include",
        },
      );
    }
    const resp = await res.json();

    if (!res.ok)
      throw new Error(resp.message || "Failed to perform admin action");

    return resp;
  };

  const handleCreateEvent = async (eventType: string, data: any) => {
    try {
      const rawUser = localStorage.getItem("unite_user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Normalize event payload to match backend expectation
      const eventPayload: any = {
        Event_Title:
          data.eventTitle || data.eventDescription || `${eventType} event`,
        Location: data.location || "",
        Start_Date:
          data.startTime ||
          (data.date ? new Date(data.date).toISOString() : undefined),
        End_Date: data.endTime || undefined,
        // Include description when provided (frontend modals use eventDescription)
        Event_Description:
          data.eventDescription ||
          data.Event_Description ||
          data.description ||
          undefined,
        Email: data.email || undefined,
        Phone_Number: data.contactNumber || undefined,
        categoryType:
          eventType === "blood-drive"
            ? "BloodDrive"
            : eventType === "training"
              ? "Training"
              : "Advocacy",
      };

      // Category-specific mappings
      if (eventPayload.categoryType === "Training") {
        eventPayload.MaxParticipants = data.numberOfParticipants
          ? parseInt(data.numberOfParticipants, 10)
          : undefined;
        eventPayload.TrainingType = data.trainingType || undefined;
      } else if (eventPayload.categoryType === "BloodDrive") {
        eventPayload.Target_Donation = data.goalCount
          ? parseInt(data.goalCount, 10)
          : undefined;
        eventPayload.VenueType = data.venueType || undefined;
      } else if (eventPayload.categoryType === "Advocacy") {
        eventPayload.TargetAudience =
          data.audienceType || data.targetAudience || undefined;
        eventPayload.Topic = data.topic || undefined;
        // send expected audience size when provided from the advocacy modal
        eventPayload.ExpectedAudienceSize = data.numberOfParticipants
          ? parseInt(data.numberOfParticipants, 10)
          : undefined;
      }

      // If a coordinator was selected (admin or stakeholder flow), include it
      if (data.coordinator) {
        // For createEventRequest controller we need coordinatorId in body (coordinatorId param)
        eventPayload.MadeByCoordinatorID = data.coordinator;
      }

      // If a stakeholder was selected, include it so server can assign and notify accordingly
      if (data.stakeholder) {
        eventPayload.MadeByStakeholderID = data.stakeholder;
        // include explicit stakeholder reference (some controllers/validators accept this key)
        eventPayload.stakeholder = data.stakeholder;
      }

      // Decide endpoint based on user role. Use getUserInfo helper for robust detection.
      const info = getUserInfo();
      const roleStr = String(
        info.role || user?.staff_type || user?.role || "",
      ).toLowerCase();
      const isAdmin = !!(info.isAdmin || roleStr.includes("admin"));
      const isCoordinator = !!roleStr.includes("coordinator");

      if (isAdmin || isCoordinator) {
        // Admin/Coordinator -> immediate publish endpoint
        const creatorId =
          user?.Admin_ID ||
          user?.Coordinator_ID ||
          user?.id ||
          user?.ID ||
          null;
        const creatorRole =
          info.role ||
          user?.staff_type ||
          user?.role ||
          (isAdmin ? "Admin" : isCoordinator ? "Coordinator" : null);

        const body = {
          creatorId,
          creatorRole,
          ...eventPayload,
        };

        const res = await fetch(`${API_BASE}/api/events`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const resp = await res.json();

        if (!res.ok) throw new Error(resp.message || "Failed to create event");

        // refresh requests list to show the newly created event
        await refreshCalendarData();
        // Clear permission cache to refresh permissions
        setEventPermissionsCache({});
        setEventPermissionsLoading({});
        clearPermissionCache();

        return resp;
      } else {
        // Stakeholder -> create request (needs coordinatorId)
        if (!data.coordinator)
          throw new Error("Coordinator is required for requests");
        const stakeholderId =
          user?.Stakeholder_ID || user?.StakeholderId || user?.id || null;
        const body = {
          coordinatorId: data.coordinator,
          MadeByStakeholderID: stakeholderId,
          ...eventPayload,
        };

        const res = await fetch(`${API_BASE}/api/event-requests`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const resp = await res.json();

        if (!res.ok)
          throw new Error(resp.message || "Failed to create request");

        await refreshCalendarData();
        // Clear permission cache to refresh permissions
        setEventPermissionsCache({});
        setEventPermissionsLoading({});
        clearPermissionCache();

        return resp;
      }
    } catch (err: any) {
      // Errors are already thrown with the API response message from lines 308 and 325
      // Re-throw the error so it can be caught by the toolbar handler and displayed in modal
      throw err;
    }
  };

  // Profile helpers: initial and deterministic color per user
  const getProfileInitial = (name?: string) => {
    if (!name) return "U";
    const trimmed = String(name).trim();

    return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "U";
  };

  const getProfileColor = (name?: string) => {
    const s = (name || "unknown").toString();
    // simple hash to hue
    let hash = 0;

    for (let i = 0; i < s.length; i++) {
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // keep in 32-bit int
    }
    const hue = Math.abs(hash) % 360;

    // return an HSL color string; use moderate saturation/lightness for good contrast
    return `hsl(${hue}deg 65% 40%)`;
  };

  const isToday = (date: Date) => {
    const today = new Date();

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const days = getDaysForWeek(currentDate);

  type EventType = keyof {
    "blood-drive": string;
    training: string;
    advocacy: string;
  };

  const eventLabelsMap: Record<EventType, string> = {
    "blood-drive": "Blood Drive",
    training: "Training",
    advocacy: "Advocacy",
  };

  const handleViewChange = (view: string) => {
    // Prevent switching to week view on mobile
    if (isMobile && view === "week") {
      return; // Don't allow week view on mobile
    }
    setIsViewTransitioning(true);
    setTimeout(() => {
      setActiveView(view);
      setIsViewTransitioning(false);
    }, 500);
  };

  const getViewTransitionStyle = (view: string) => {
    const isActive = activeView === view;
    const isTransitioning = isViewTransitioning;

    if (isActive && !isTransitioning) {
      return "opacity-100 scale-100 translate-y-0";
    } else if (isActive && isTransitioning) {
      return "opacity-100 scale-100 translate-y-0";
    } else if (!isActive && isTransitioning) {
      return view === "week"
        ? "opacity-0 scale-95 -translate-y-4 absolute inset-0 pointer-events-none"
        : "opacity-0 scale-95 translate-y-4 absolute inset-0 pointer-events-none";
    } else {
      return "opacity-0 scale-95 absolute inset-0 pointer-events-none";
    }
  };

  const slideVariants = {
    enter: (direction: "left" | "right") => ({
      x: direction === "left" ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: "left" | "right") => ({
      x: direction === "left" ? -100 : 100,
      opacity: 0,
    }),
  };

  // Build dropdown menus using permission-based evaluation
  const getMenuByStatus = (event: any) => {
    // Calendar events are from public API; determine status from event
    const evRaw = event.raw || event;
    const status = evRaw.Status || evRaw.status || "Approved";
    const evId = evRaw.Event_ID || evRaw.EventId || evRaw.id;

    // Unauthenticated users: view-only
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("unite_token") ||
          sessionStorage.getItem("unite_token")
        : null;
    const isAuthenticated = !!token;

    if (!isAuthenticated) {
      return (
        <DropdownMenu aria-label="Event actions menu" variant="faded">
          <DropdownSection title="Actions">
            <DropdownItem
              key="view"
              description="View this event"
              startContent={<Eye />}
              onPress={() => handleOpenViewEvent(event.raw)}
            >
              View Event
            </DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      );
    }

    // Check if permissions are loading
    // Note: Permission fetching is handled by useEffect hook, not during render
    const isLoading = evId ? eventPermissionsLoading[evId] || false : false;

    // Get cached permissions (or default to view-only if not yet loaded)
    const permissions = evId && eventPermissionsCache[evId]
      ? eventPermissionsCache[evId]
      : {
          canView: true,
          canEdit: false,
          canManageStaff: false,
          canReschedule: false,
          canCancel: false,
          canDelete: false,
        };

    // Determine event status for action availability
    const normalizedStatus = String(status || "Approved").toLowerCase();
    const isApproved = normalizedStatus.includes("approve");
    const isCancelled = normalizedStatus.includes("cancel");
    const isCompleted = normalizedStatus.includes("complete");

    // Show loading state if permissions are being fetched
    if (isLoading) {
      return (
        <DropdownMenu aria-label="Event actions menu" variant="faded">
          <DropdownSection title="Actions">
            <DropdownItem
              key="loading"
              isDisabled
              startContent={
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              }
            >
              Loading permissions...
            </DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      );
    }

    // Build menu based on status and permissions
    if (isCancelled) {
      // Cancelled events: view + delete (if admin has permission)
      return (
        <DropdownMenu aria-label="Event actions menu" variant="faded">
          <DropdownSection title="Actions">
            {permissions.canView ? (
              <DropdownItem
                key="view"
                description="View this event"
                startContent={<Eye />}
                onPress={() => handleOpenViewEvent(event.raw)}
              >
                View Event
              </DropdownItem>
            ) : null}
          </DropdownSection>
          {permissions.canDelete ? (
            <DropdownSection title="Danger zone">
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                description="Delete this event"
                startContent={
                  <Trash2 className="text-xl text-danger pointer-events-none shrink-0" />
                }
                onPress={() => {
                  // TODO: Implement delete handler
                }}
              >
                Delete
              </DropdownItem>
            </DropdownSection>
          ) : null}
        </DropdownMenu>
      );
    }

    if (isApproved || isCompleted) {
      // Approved/Completed events: full action set based on permissions
      return (
        <DropdownMenu aria-label="Event actions menu" variant="faded">
          <DropdownSection showDivider title="Actions">
            {permissions.canView ? (
              <DropdownItem
                key="view"
                description="View this event"
                startContent={<Eye />}
                onPress={() => handleOpenViewEvent(event.raw)}
              >
                View Event
              </DropdownItem>
            ) : null}
            {permissions.canEdit ? (
              <DropdownItem
                key="edit"
                description="Edit an event"
                startContent={<Edit />}
                onPress={() => handleOpenEditEvent(event.raw)}
              >
                Edit Event
              </DropdownItem>
            ) : null}
            {permissions.canManageStaff ? (
              <DropdownItem
                key="manage-staff"
                description="Manage staff for this event"
                startContent={<Users />}
                onPress={() => setManageStaffOpenId(event.raw.Event_ID)}
              >
                Manage Staff
              </DropdownItem>
            ) : null}
            {permissions.canReschedule ? (
              <DropdownItem
                key="reschedule"
                description="Reschedule this event"
                startContent={<Clock className="w-3 h-3 text-gray-500" />}
                onPress={() => setRescheduleOpenId(event.raw.Event_ID)}
              >
                Reschedule Event
              </DropdownItem>
            ) : null}
          </DropdownSection>
          {permissions.canCancel ? (
            <DropdownSection title="Danger zone">
              <DropdownItem
                key="cancel"
                className="text-danger"
                color="danger"
                description="Cancel an event"
                startContent={
                  <Trash2 className="text-xl text-danger pointer-events-none shrink-0" />
                }
                onPress={() => setCancelOpenId(event.raw.Event_ID)}
              >
                Cancel
              </DropdownItem>
            </DropdownSection>
          ) : null}
        </DropdownMenu>
      );
    }

    // Default: view-only for other statuses
    return (
      <DropdownMenu aria-label="Event actions menu" variant="faded">
        <DropdownSection title="Actions">
          <DropdownItem
            key="view"
            description="View this event"
            startContent={<Eye />}
            onPress={() => handleOpenViewEvent(event.raw)}
          >
            View Event
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    );
  };

  // View/Edit handlers: open campaign modals with fetched event details
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<any>(null);

  const handleOpenViewEvent = async (rawEvent: any) => {
    if (!rawEvent) return;
    const eventId =
      rawEvent.Event_ID ||
      rawEvent.EventId ||
      rawEvent.EventId ||
      rawEvent.Event_ID;

    if (!eventId) {
      setViewRequest(rawEvent);
      setViewModalOpen(true);

      return;
    }

    setViewLoading(true);
    try {
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      // Use public endpoint if user is not authenticated
      const endpoint = token 
        ? `/api/events/${encodeURIComponent(eventId)}`
        : `/api/public/events/${encodeURIComponent(eventId)}`;
      
      // Always fetch the full event details from backend. Log the raw response to help debugging.
      const res = await fetch(
        `${API_BASE}${endpoint}`,
        { headers },
      );
      const body = await res.json();

      if (!res.ok)
        throw new Error(body.message || "Failed to fetch event details");
      // The API may return the full event under different keys; prefer body.data, then body.event, then body
      const data = body.data || body.event || body;
      // If the response wraps the event inside a `event` property, prefer that inner object for merging
      const eventData = data && data.event ? data.event : data;
      // Merge strategy: prefer fetched eventData, but FALLBACK to rawEvent for any fields missing
      // (some backend handlers return a trimmed `event` object that omits fields like Event_Description)
      const merged = { ...(eventData || {}), ...(rawEvent || {}) };
      // Keep the fetched event shape under `event` while exposing merged top-level fields
      const finalPayload = { ...merged, event: eventData || merged };

      // merged payload prepared for modal
      setViewRequest(finalPayload || rawEvent);
      setViewModalOpen(true);
    } catch (err: any) {
      console.error("Failed to load event details", err);
      // fallback to opening with rawEvent
      setViewRequest(rawEvent);
      setViewModalOpen(true);
    } finally {
      setViewLoading(false);
    }
  };

  const handleOpenEditEvent = async (rawEvent: any) => {
    if (!rawEvent) return;
    const eventId =
      rawEvent.Event_ID ||
      rawEvent.EventId ||
      rawEvent.EventId ||
      rawEvent.Event_ID;

    if (!eventId) {
      setEditRequest(rawEvent);
      setEditModalOpen(true);

      return;
    }

    try {
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(
        `${API_BASE}/api/events/${encodeURIComponent(eventId)}`,
        { headers },
      );
      const body = await res.json();

      if (!res.ok)
        throw new Error(body.message || "Failed to fetch event for edit");
      const data = body.data || body.event || body;

      setEditRequest(data || rawEvent);
      setEditModalOpen(true);
    } catch (err: any) {
      console.error("Failed to load event for edit", err);
      setEditRequest(rawEvent);
      setEditModalOpen(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-visible bg-white">
      {/* Header: match campaign spacing with mobile hamburger */}
      <div className="px-4 sm:px-6 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{publicTitle ?? "Calendar"}</h1>
        {/* Mobile nav (bell + hamburger) - hide for public/embed usage */}
        {!publicTitle && (
          <MobileNav currentUserName={currentUserName} currentUserEmail={currentUserEmail} />
        )}
      </div>

      <Topbar
        userEmail={currentUserEmail}
        userName={currentUserName}
        onUserClick={() => {}}
      />

      {/* Toolbar area with campaign padding - restore desktop layout */}
      <div className="px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4 sm:mb-6">
          {/* Left side - View Toggle and Date Navigation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* View Toggle: hide week view on mobile, show only month */}
            {/* Hide the tab controls on mobile while keeping month active */}
            {!isMobile && (
              <Tabs
                classNames={{
                  tabList: "bg-gray-100 p-1",
                  cursor: "bg-white shadow-sm",
                  tabContent: "group-data-[selected=true]:text-gray-900 text-xs font-medium",
                }}
                radius="md"
                selectedKey={activeView}
                size="sm"
                variant="solid"
                onSelectionChange={(key: React.Key) => handleViewChange(String(key))}
              >
                <Tab key="week" title="Week" />
                <Tab key="month" title="Month" />
              </Tabs>
            )}

            {/* Date Navigation - touch-friendly on mobile */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <button
                className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                onClick={() =>
                  activeView === "week"
                    ? navigateWeek("prev")
                    : navigateMonth("prev")
                }
                aria-label="Previous period"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-xs sm:text-sm font-medium text-gray-900 min-w-[140px] sm:min-w-[200px] text-center px-2">
                {activeView === "week"
                  ? formatWeekRange(currentDate)
                  : formatMonthYear(currentDate)}
              </span>
              <button
                className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                onClick={() =>
                  activeView === "week"
                    ? navigateWeek("next")
                    : navigateMonth("next")
                }
                aria-label="Next period"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Right side - Action Buttons (calendar toolbar) - restored to right side */}
          <div className="w-full lg:w-auto">
            <CalendarToolbar
              showCreate={allowCreate}
              showExport={activeView === 'month'}
              isMobile={isMobile}
              isExporting={isExportLoading}
              onAdvancedFilter={handleAdvancedFilter}
              onCreateEvent={allowCreate ? handleCreateEvent : undefined}
              onExport={handleExport}
              onQuickFilter={handleQuickFilter}
            />
          </div>
        </div>

        {/* Views Container - Responsive with proper mobile scrolling */}
        <div className="relative min-h-[400px] sm:min-h-[500px] md:min-h-[700px] overflow-x-auto hide-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
          {/* Week View */}
          <div
            ref={weekViewRef}
            className={`transition-all duration-500 ease-in-out w-full ${getViewTransitionStyle("week")}`}
          >
            <div className="w-full overflow-x-auto">
              {/* Days of Week Header - responsive grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-4 mb-3 sm:mb-4 w-full min-w-[320px] sm:min-w-[600px]">
                {days.map((day, index) => (
                  <div key={`day-${index}`} className="text-center">
                    <div className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                      {day.day}
                    </div>
                    <div className="flex justify-center">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-lg font-semibold ${
                          day.isToday
                            ? "bg-red-500 text-white"
                            : "text-gray-900"
                        }`}
                      >
                        {day.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Event Cards - responsive grid with touch-friendly spacing */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-4 mt-3 sm:mt-4 md:mt-6 w-full min-w-[320px] sm:min-w-[600px]">
                {days.map((day, index) => {
                  const dayEvents = getEventsForDate(day.fullDate);

                  return (
                    <div key={index} className="min-h-[300px] sm:min-h-[400px] md:min-h-[500px]">
                      {eventsLoading ? (
                        // Skeleton loading for events
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                              </div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                                <div className="h-3 bg-gray-200 rounded w-20"></div>
                              </div>
                              <div className="flex gap-2 mb-3">
                                <div className="h-6 bg-gray-200 rounded w-16"></div>
                                <div className="h-6 bg-gray-200 rounded w-20"></div>
                              </div>
                              <div className="mb-2">
                                <div className="h-3 bg-gray-200 rounded w-12 mb-1"></div>
                                <div className="h-3 bg-gray-200 rounded w-16"></div>
                              </div>
                              <div className="mb-3">
                                <div className="h-3 bg-gray-200 rounded w-14 mb-1"></div>
                                <div className="h-3 bg-gray-200 rounded w-24"></div>
                              </div>
                              <div className="border-t border-gray-200 pt-2">
                                <div className="flex justify-between items-center">
                                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                                  <div className="h-5 bg-gray-200 rounded w-12"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : dayEvents.length === 0 ? (
                        <div className="h-20 flex items-center justify-center text-gray-400 text-xs">
                          No events
                        </div>
                      ) : (
                        <div className="space-y-2 sm:space-y-3">
                          {dayEvents.map((event, eventIndex) => (
                            <CalendarEventCard
                              key={eventIndex}
                              title={event.title}
                              ownerName={event.coordinatorName || event.ownerName || "Coordinator"}
                              startTime={event.startTime || event.time || ""}
                              endTime={event.endTime}
                              category={event.category || event.type || "event"}
                              province={event.province}
                              district={event.district}
                              municipality={event.municipality}
                              location={event.location}
                              countType={event.countType}
                              count={event.count}
                              rawEvent={event.raw || event}
                              getMenuByStatus={getMenuByStatus}
                              categoryLabel={event.categoryLabel || eventLabelsMap[event.category as EventType] || eventLabelsMap[event.type as EventType] || "Event"}
                              getProfileInitial={getProfileInitial}
                              getProfileColor={getProfileColor}
                              color={event.color}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Month View */}
          <div
            id="calendar-month-view"
            ref={monthViewRef}
            className={`transition-all duration-500 ease-in-out w-full ${getViewTransitionStyle("month")}`}
          >
            <div className="w-full overflow-x-auto">
              {/* Days of Week Header - responsive */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4 w-full min-w-[320px] sm:min-w-[600px]">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div key={day} className="text-center">
                    <div className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                      {day}
                    </div>
                    <div className="h-6 sm:h-10" />
                  </div>
                ))}
              </div>

              {/* Calendar Grid - responsive */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden w-full min-w-[320px] sm:min-w-[600px]">
                <div className="grid grid-cols-7 gap-px bg-gray-200">
                  {generateMonthDays(currentDate).map((day, index) => (
                    <div
                      key={index}
                      className={`min-h-[60px] sm:min-h-[80px] md:min-h-[100px] bg-white p-1 sm:p-2 ${
                        !day.isCurrentMonth && "bg-gray-50 text-gray-400"
                      }`}
                    >
                      <div className="flex justify-center mb-1 sm:mb-2">
                        <div
                          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                            day.isToday
                              ? "bg-red-500 text-white"
                              : day.isCurrentMonth
                                ? "text-gray-900"
                                : "text-gray-400"
                          }`}
                        >
                          {day.date.getDate()}
                        </div>
                      </div>

                      {eventsLoading ? (
                        // Skeleton loading for month events
                        <div className="space-y-1">
                          {[...Array(Math.floor(Math.random() * 3) + 1)].map(
                            (_, i) => (
                              <div
                                key={i}
                                className="h-6 bg-gray-200 rounded animate-pulse"
                                style={{ width: `${Math.random() * 40 + 60}%` }}
                              ></div>
                            ),
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {day.events.map((event, eventIndex) => (
                            <div
                              key={eventIndex}
                              className="text-[10px] sm:text-xs p-1 rounded font-medium truncate cursor-pointer transition-colors hover:shadow-sm active:opacity-80 touch-manipulation"
                              role="button"
                              style={{
                                backgroundColor: `${event.color}22`,
                                color: event.color,
                              }}
                              tabIndex={0}
                              title={`${event.categoryLabel || eventLabelsMap[event.type as EventType] || "Event"}: ${event.title}`}
                              onClick={() => handleOpenViewEvent(event.raw)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  handleOpenViewEvent(event.raw);
                                }
                              }}
                            >
                              <div className="break-words whitespace-normal leading-tight">
                                {event.title}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of the modals remain the same */}
      <EventViewModal
        isOpen={viewModalOpen}
        request={viewRequest}
        onClose={() => {
          setViewModalOpen(false);
          setViewRequest(null);
        }}
      />
      <EventManageStaffModal
        eventId={manageStaffOpenId}
        isOpen={!!manageStaffOpenId}
        onClose={() => {
          setManageStaffOpenId(null);
        }}
        onSaved={async () => {
          // refresh calendar after saving staff
          await refreshCalendarData();
          // Clear permission cache to refresh permissions
          setEventPermissionsCache({});
          clearPermissionCache();
        }}
      />
      <EventRescheduleModal
        eventId={rescheduleOpenId}
        isOpen={!!rescheduleOpenId}
        onClose={() => {
          setRescheduleOpenId(null);
        }}
        onSaved={async () => {
          // refresh calendar after reschedule
          await refreshCalendarData();
          // Clear permission cache to refresh permissions
          setEventPermissionsCache({});
          clearPermissionCache();
        }}
      />
      <EditEventModal
        isOpen={editModalOpen}
        request={editRequest}
        onClose={() => {
          setEditModalOpen(false);
          setEditRequest(null);
        }}
        onSaved={async () => {
          // refresh calendar after edit
          setViewModalOpen(false);
          setEditModalOpen(false);
          await refreshCalendarData();
          // Clear permission cache to refresh permissions
          setEventPermissionsCache({});
          clearPermissionCache();
        }}
      />
      {/* Accept confirmation modal */}
      <Modal
        isOpen={!!acceptOpenId}
        placement="center"
        size="sm"
        onClose={() => {
          setAcceptOpenId(null);
          setAcceptNote("");
          setAcceptError(null);
        }}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-default-100">
              <Check className="w-5 h-5 text-default-600" />
            </div>
            <span className="text-lg font-semibold">Accept Event</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600 mb-4">
              Optionally add a note to record when accepting this request.
            </p>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-default-900"
                htmlFor="accept-note"
              >
                Note (optional)
              </label>
              <textarea
                className="w-full px-3 py-2 text-sm border border-default-300 rounded-lg"
                id="accept-note"
                rows={4}
                value={acceptNote}
                onChange={(e) =>
                  setAcceptNote((e.target as HTMLTextAreaElement).value)
                }
              />
            </div>
            {acceptError && (
              <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded">
                <p className="text-xs text-warning-700">{acceptError}</p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              className="font-medium"
              variant="bordered"
              onPress={() => {
                setAcceptOpenId(null);
                setAcceptNote("");
                setAcceptError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-black text-white font-medium"
              color="default"
              onPress={async () => {
                setAcceptError(null);
                if (!acceptOpenId) return setAcceptError("No event selected");
                try {
                  setAcceptSaving(true);
                  await performAdminActionByEventId(
                    acceptOpenId,
                    "Accepted",
                    acceptNote || undefined,
                  );
                  await refreshCalendarData();
                  setAcceptOpenId(null);
                  setAcceptNote("");
                } catch (err: any) {
                  setAcceptError(err?.message || "Failed to accept request");
                } finally {
                  setAcceptSaving(false);
                }
              }}
            >
              {acceptSaving ? "Accepting..." : "Accept"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reject confirmation modal */}
      <Modal
        isOpen={!!rejectOpenId}
        placement="center"
        size="sm"
        onClose={() => {
          setRejectOpenId(null);
          setRejectNote("");
          setRejectError(null);
        }}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-default-100">
              <X className="w-5 h-5 text-default-600" />
            </div>
            <span className="text-lg font-semibold">Reject Event</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600 mb-4">
              Provide a reason for rejecting this request. This will be recorded
              in the request history.
            </p>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-default-900"
                htmlFor="reject-note"
              >
                Reason
              </label>
              <textarea
                className="w-full px-3 py-2 text-sm border border-default-300 rounded-lg"
                id="reject-note"
                rows={4}
                value={rejectNote}
                onChange={(e) =>
                  setRejectNote((e.target as HTMLTextAreaElement).value)
                }
              />
            </div>
            {rejectError && (
              <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded">
                <p className="text-xs text-warning-700">{rejectError}</p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              className="font-medium"
              variant="bordered"
              onPress={() => {
                setRejectOpenId(null);
                setRejectNote("");
                setRejectError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white font-medium"
              color="danger"
              onPress={async () => {
                setRejectError(null);
                if (!rejectOpenId) return setRejectError("No event selected");
                if (!rejectNote || rejectNote.trim().length === 0)
                  return setRejectError(
                    "Please provide a reason for rejection",
                  );
                try {
                  setRejectSaving(true);
                  await performAdminActionByEventId(
                    rejectOpenId,
                    "Rejected",
                    rejectNote,
                  );
                  await refreshCalendarData();
                  setRejectOpenId(null);
                  setRejectNote("");
                } catch (err: any) {
                  setRejectError(err?.message || "Failed to reject request");
                } finally {
                  setRejectSaving(false);
                }
              }}
            >
              {rejectSaving ? "Rejecting..." : "Reject"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Mobile navigation is provided by the reusable MobileNav component */}

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .touch-manipulation {
          touch-action: manipulation;
        }
      `}</style>
    </div>
  );
}