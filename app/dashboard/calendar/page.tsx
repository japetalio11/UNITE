"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock as ClockIcon,
  Calendar,
  CalendarDays,
  MoreVertical,
  Eye,
  Edit,
  Users,
  Trash2,
  Check,
  X,
} from "lucide-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/dropdown";
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
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getUserInfo } from "@/utils/getUserInfo";

export default function CalendarPage() {
  const pathname = usePathname();
  // Allow create on dashboard calendar, but not on public calendar route
  const allowCreate = pathname === "/calendar" ? false : true;
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
  const [currentUserName, setCurrentUserName] = useState<string>(
    "Bicol Medical Center",
  );
  const [currentUserEmail, setCurrentUserEmail] =
    useState<string>("bmc@gmail.com");

  // Initialize displayed user name/email from localStorage (match campaign page logic)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("unite_user");

      if (raw) {
        const u = JSON.parse(raw);
        const first =
          u.First_Name ||
          u.FirstName ||
          u.first_name ||
          u.firstName ||
          u.First ||
          "";
        const middle =
          u.Middle_Name ||
          u.MiddleName ||
          u.middle_name ||
          u.middleName ||
          u.Middle ||
          "";
        const last =
          u.Last_Name ||
          u.LastName ||
          u.last_name ||
          u.lastName ||
          u.Last ||
          "";
        const parts = [first, middle, last]
          .map((p: any) => (p || "").toString().trim())
          .filter(Boolean);
        const full = parts.join(" ");
        const email =
          u.Email || u.email || u.Email_Address || u.emailAddress || "";

        if (full) setCurrentUserName(full);
        else if (u.name) setCurrentUserName(u.name);
        if (email) setCurrentUserEmail(email);
      }
    } catch (err) {
      // ignore malformed localStorage entry
    }
  }, []);
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
    const idsToFetch = eventIds.filter(id => id && !detailedEvents[id]);
    if (idsToFetch.length === 0) return {};

    const token =
      typeof window !== 'undefined' && (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token'));

    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/api/events/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: idsToFetch }),
        credentials: token ? undefined : 'include'
      });

      const body = await res.json();

      if (res.ok && body && Array.isArray(body.data)) {
        const result: Record<string, any> = {};
        body.data.forEach((ev: any) => {
          const id = ev.Event_ID || ev.EventId || ev.id;
          if (id) result[String(id)] = ev;
        });

        if (Object.keys(result).length > 0) {
          setDetailedEvents(prev => ({ ...prev, ...result }));
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
    let mounted = true;

    const fetchData = async () => {
      const startTime = Date.now();
      setEventsLoading(true);
      // Fetch all public events and filter client-side for approved events in the current month
      let normalizedMonth: Record<string, any[]> = {};

      try {
        // Fetch public events only for the current month range (server-side filtering)
        const year = currentDate.getFullYear();
        const monthIndex = currentDate.getMonth(); // 0-based month
        const monthStart = new Date(year, monthIndex, 1);
        const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

        const publicUrl = `${API_BASE}/api/public/events?date_from=${encodeURIComponent(monthStart.toISOString())}&date_to=${encodeURIComponent(monthEnd.toISOString())}`;
        const publicResp = await fetch(publicUrl, { credentials: 'include' });
        const publicJson = await publicResp.json();

        if (mounted && publicResp.ok && publicJson && Array.isArray(publicJson.data)) {
          const monthEvents = publicJson.data;

          // Batch fetch detailed info for all events in the month (single request)
          const eventIds = monthEvents.map((e: any) => e.Event_ID || e.EventId).filter(Boolean);
          if (eventIds.length > 0) {
            await fetchEventDetails(eventIds);
          }

          // Group by date
          const eventsByDate: Record<string, any[]> = {};
          monthEvents.forEach((event: any) => {
            const startDate = parseServerDate(event.Start_Date);
            if (!startDate) return;
            const dateKey = dateToLocalKey(startDate);
            if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
            eventsByDate[dateKey].push(event);
          });

          // Normalize keys to local YYYY-MM-DD
          normalizedMonth = normalizeEventsMap(eventsByDate);
          setMonthEventsByDate(normalizedMonth);

          // Create week view by filtering month events to current week
          const wkStart = new Date(currentDate);
          const dayOfWeek = wkStart.getDay();
          wkStart.setDate(wkStart.getDate() - dayOfWeek);
          wkStart.setHours(0, 0, 0, 0);
          const wkEnd = new Date(wkStart);
          wkEnd.setDate(wkStart.getDate() + 6);

          const weekEvents: Record<string, any[]> = {};

          // First, collect all events that naturally fall within the current week dates
          Object.keys(normalizedMonth).forEach((dateKey) => {
            const events = normalizedMonth[dateKey] || [];
            const eventDate = new Date(dateKey + 'T00:00:00');

            // Check if this date falls within the current week
            if (eventDate >= wkStart && eventDate <= wkEnd) {
              weekEvents[dateKey] = events;
            }
          });

          setWeekEventsByDate(weekEvents);
        } else if (mounted) {
          setMonthEventsByDate({});
          setWeekEventsByDate({});
        }
      } catch (error) {
        if (mounted) {
          setWeekEventsByDate({});
          setMonthEventsByDate({});
        }
        // Optionally log: console.error('Failed to fetch calendar data', error);
      } finally {
        if (mounted) {
          // Ensure minimum 1.5 second loading time for better UX
          const elapsed = Date.now() - startTime;
          const minDuration = 1000; // shorten artificial minimum loading time
          if (elapsed < minDuration) {
            await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
          }
          setEventsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [currentDate]);

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
    const filterByStartDate = (ev: any) => {
      let start: Date | null = null;

      try {
        if (ev.Start_Date) start = parseServerDate(ev.Start_Date);
      } catch (err) {
        start = null;
      }
      if (!start) return false;

      return dateToLocalKey(start) === key;
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

    return afterQuick.map((e: any) => {
      const eventId = e.Event_ID || e.EventId;
      const detailedEvent = eventId ? detailedEvents[eventId] : null;

      // Start date may come in different shapes (ISO, number, or mongo export object)
      let start: Date | null = null;

      if (e.Start_Date) {
        try {
          if (typeof e.Start_Date === "object" && e.Start_Date.$date) {
            // mongo export shape: { $date: { $numberLong: '...' } } or { $date: 12345 }
            const d = e.Start_Date.$date;

            if (typeof d === "object" && d.$numberLong)
              start = new Date(Number(d.$numberLong));
            else start = new Date(d as any);
          } else {
            start = new Date(e.Start_Date as any);
          }
        } catch (err) {
          start = null;
        }
      }

      const startTime = start
        ? start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "";
      // End time (if provided)
      let end: Date | null = null;

      if (e.End_Date) {
        try {
          if (typeof e.End_Date === "object" && e.End_Date.$date) {
            const d = e.End_Date.$date;

            if (typeof d === "object" && d.$numberLong)
              end = new Date(Number(d.$numberLong));
            else end = new Date(d as any);
          } else {
            end = new Date(e.End_Date as any);
          }
        } catch (err) {
          end = null;
        }
      }
      const endTime = end
        ? end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "";

      // Coordinator / stakeholder name — prioritize stakeholder over coordinator
      const coordinatorName =
        detailedEvent?.stakeholder?.Stakeholder_Name ||
        detailedEvent?.stakeholder?.name ||
        detailedEvent?.Stakeholder_Name ||
        detailedEvent?.createdByName ||
        detailedEvent?.raw?.createdByName ||
        e.StakeholderName ||
        e.stakeholder?.name ||
        detailedEvent?.coordinator?.Coordinator_Name ||
        detailedEvent?.coordinator?.name ||
        detailedEvent?.Coordinator_Name ||
        e.coordinator?.name ||
        e.MadeByCoordinatorName ||
        e.coordinatorName ||
        e.Email ||
        "Coordinator";

      // District number — prefer detailed event coordinator district, then fall back to basic event data
      const districtNumber =
        detailedEvent?.coordinator?.district_number ??
        detailedEvent?.coordinator?.District_Number ??
        (detailedEvent?.coordinator?.district?.name ? extractDistrictNumber(detailedEvent.coordinator.district.name) : null) ??
        e.coordinator?.district_number ??
        e.district_number ??
        e.DistrictNumber ??
        e.district ??
        (e.coordinator?.district?.name ? extractDistrictNumber(e.coordinator.district.name) : null);
      const districtDisplay = districtNumber
        ? `${makeOrdinal(districtNumber)} District`
        : "District TBD";

      // Determine category (case-insensitive, check both Category and category)
      const rawCat = (e.Category ?? e.category ?? "").toString().toLowerCase();
      let typeKey: string = "event";

      if (rawCat.includes("blood")) typeKey = "blood-drive";
      else if (rawCat.includes("train")) typeKey = "training";
      else if (rawCat.includes("advoc")) typeKey = "advocacy";

      // Helper to find count values across shapes (main event or categoryData)
      const getVal = (keys: string[]) => {
        // First check detailed event data
        for (const k of keys) {
          if (detailedEvent && detailedEvent[k] !== undefined && detailedEvent[k] !== null) return detailedEvent[k];
          if (detailedEvent?.categoryData && detailedEvent.categoryData[k] !== undefined && detailedEvent.categoryData[k] !== null) return detailedEvent.categoryData[k];
        }
        // Then check basic event data
        for (const k of keys) {
          if (e[k] !== undefined && e[k] !== null) return e[k];
          if (e.categoryData && e.categoryData[k] !== undefined && e.categoryData[k] !== null) return e.categoryData[k];
        }

        return undefined;
      };

      let countType = "";
      let count = "";
      const targetDonation = getVal([
        "Target_Donation",
        "TargetDonation",
        "Target_Donations",
      ]);
      const maxParticipants = getVal([
        "MaxParticipants",
        "Max_Participants",
        "MaxParticipant",
      ]);
      const expectedAudience = getVal([
        "ExpectedAudienceSize",
        "Expected_AudienceSize",
        "ExpectedAudience",
      ]);

      if (typeKey === "blood-drive" && targetDonation !== undefined) {
        countType = "Goal Count";
        count = `${targetDonation} u.`;
      } else if (typeKey === "training" && maxParticipants !== undefined) {
        countType = "Participant Count";
        count = `${maxParticipants} no.`;
      } else if (typeKey === "advocacy" && expectedAudience !== undefined) {
        countType = "Audience Count";
        count = `${expectedAudience} no.`;
      } else {
        countType = "Details";
        count = "View event";
      }

      const baseTitle = e.Title || e.Event_Title || e.title || "Event Title";
      // For month view we keep the title as the event title only; tooltip will show times
      const displayTitle = baseTitle;
      // color codes: blood-drive -> red, advocacy -> yellow, training -> blue
      let color = "#3b82f6"; // default blue (training)

      if (typeKey === "blood-drive") color = "#ef4444";
      else if (typeKey === "advocacy") color = "#f59e0b";

      return {
        title: displayTitle,
        startTime,
        endTime,
        time: startTime,
        type: typeKey,
        district: districtDisplay,
        location:
          detailedEvent?.Location ||
          detailedEvent?.location ||
          e.Location ||
          e.location ||
          "Location to be determined",
        countType,
        count,
        coordinatorName,
        raw: e,
        color,
      };
    });
  };

  // Handlers for toolbar actions
  const handleExport = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const publicUrl = `${API_BASE}/api/public/events`;
      const res = await fetch(publicUrl, { credentials: "include" });
      const body = await res.json();
      
      if (res.ok && Array.isArray(body.data)) {
        // Filter for events in the current month (public events are already approved)
        const monthEvents = body.data.filter((event: any) => {
          // Check if event is in current month
          const startDate = parseServerDate(event.Start_Date);
          if (!startDate) return false;
          return startDate.getFullYear() === year && startDate.getMonth() === month;
        });
        
        const blob = new Blob([JSON.stringify(monthEvents, null, 2)], {
          type: "application/json",
        });
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = href;
        a.download = `calendar-${year}-${month + 1}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      }
    } catch (e) {
      // ignore export failures silently
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

      const publicUrl = `${API_BASE}/api/public/events?date_from=${encodeURIComponent(monthStart.toISOString())}&date_to=${encodeURIComponent(monthEnd.toISOString())}`;
      const publicResp = await fetch(publicUrl, { credentials: 'include' });
      const publicJson = await publicResp.json();

      if (publicResp.ok && Array.isArray(publicJson.data)) {
        const monthEvents = publicJson.data;

        // Batch fetch detailed information for all events in the month
        const eventIds = monthEvents.map((e: any) => e.Event_ID || e.EventId).filter(Boolean);
        if (eventIds.length > 0) {
          await fetchEventDetails(eventIds);
        }

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

        const weekEvents: Record<string, any[]> = {};

        Object.keys(normalizedMonth).forEach((dateKey) => {
          const events = normalizedMonth[dateKey] || [];
          const eventDate = new Date(dateKey + 'T00:00:00');

          if (eventDate >= wkStart && eventDate <= wkEnd) {
            weekEvents[dateKey] = events;
          }
        });

        setWeekEventsByDate(weekEvents);
      }
    } catch (e) {
      // ignore
    }
  };

  // Perform an admin action (Accepted/Rejected/Rescheduled) given an Event_ID.
  // This will fetch the event to determine the linked request id, then call
  // the admin-action endpoint on the request.
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

    const body: any = { action, note: note ? note.trim() : undefined };

    if (rescheduledDate) body.rescheduledDate = rescheduledDate;

    let res;

    if (token) {
      res = await fetchWithAuth(
        `${API_BASE}/api/requests/${encodeURIComponent(requestId)}/admin-action`,
        { method: "POST", body: JSON.stringify(body) },
      );
    } else {
      const legacyBody = {
        adminId: user?.id || user?.Admin_ID || null,
        ...body,
      };

      res = await fetch(
        `${API_BASE}/api/requests/${encodeURIComponent(requestId)}/admin-action`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(legacyBody),
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

        const res = await fetch(`${API_BASE}/api/events/direct`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const resp = await res.json();

        if (!res.ok) throw new Error(resp.message || "Failed to create event");

        // refresh requests list to show the newly created event
        await refreshCalendarData();

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

        const res = await fetch(`${API_BASE}/api/requests`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const resp = await res.json();

        if (!res.ok)
          throw new Error(resp.message || "Failed to create request");

        await refreshCalendarData();

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

  // Build dropdown menus matching campaign design
  const getMenuByStatus = (event: any) => {
    // Calendar events are from public API; assume Approved for action availability
    const status = 'Approved';

    // Unauthenticated users: view-only
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')
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

    // Parse current user
    const rawUserStr = typeof window !== 'undefined' ? localStorage.getItem('unite_user') : null;
    let parsedUser: any = null;
    try {
      parsedUser = rawUserStr ? JSON.parse(rawUserStr) : null;
    } catch (e) {
      parsedUser = null;
    }

    const info = getUserInfo();
    const userIsAdmin = !!info.isAdmin;
    const userCoordinatorId = parsedUser?.Coordinator_ID || parsedUser?.CoordinatorId || parsedUser?.CoordinatorId || parsedUser?.Coordinator || parsedUser?.Coordinator_ID;
    const userStakeholderId = parsedUser?.Stakeholder_ID || parsedUser?.StakeholderId || parsedUser?.StakeholderId || parsedUser?.Stakeholder || parsedUser?.Stakeholder_ID;

    // Helpers to extract district/province objects from various shapes
    const extractDistrictProvince = (obj: any) => {
      if (!obj) return { district_number: null, district_name: null, province: null };
      return {
        district_number: obj.District_Number || obj.district_number || obj.District_ID || obj.DistrictId || null,
        district_name: obj.District_Name || obj.district_name || obj.district || null,
        province: obj.Province || obj.province || obj.Province_Name || null
      };
    };

    // Determine event ownership and related metadata (use detailedEvents when available)
    const evRaw = event.raw || {};
    const evId = evRaw.Event_ID || evRaw.EventId || evRaw.id;
    const detailed = evId ? detailedEvents[evId] : null;

    const eventCoordinatorId = evRaw.MadeByCoordinatorID || evRaw.MadeByCoordinatorId || evRaw.coordinatorId || (detailed?.coordinator?.id || detailed?.coordinator?.Coordinator_ID);
    const eventStakeholderId = evRaw.MadeByStakeholderID || evRaw.MadeByStakeholderId || evRaw.stakeholder || (detailed?.stakeholder?.id || detailed?.stakeholder?.Stakeholder_ID);

    const eventStakeholderMeta = detailed?.stakeholder || evRaw.stakeholder || evRaw.MadeByStakeholder || evRaw.MadeByStakeholderMeta || null;
    const stakeholderDP = extractDistrictProvince(eventStakeholderMeta);

    const userDP = extractDistrictProvince(parsedUser || {});

    const coordinatorOwns = userCoordinatorId && eventCoordinatorId && String(userCoordinatorId) === String(eventCoordinatorId);
    const stakeholderOwns = userStakeholderId && eventStakeholderId && String(userStakeholderId) === String(eventStakeholderId);

    // Coordinator may act if they own the event OR the event is owned by a stakeholder in the same district/province
    const sameDistrictForCoordinator = (userDP.district_number && stakeholderDP.district_number && String(userDP.district_number) === String(stakeholderDP.district_number)) || (userDP.district_name && stakeholderDP.district_name && String(userDP.district_name).toLowerCase() === String(stakeholderDP.district_name).toLowerCase());
    const sameProvinceForCoordinator = userDP.province && stakeholderDP.province && String(userDP.province).toLowerCase() === String(stakeholderDP.province).toLowerCase();

    const userIsCoordinator = !!(userCoordinatorId || String(info.role || '').toLowerCase().includes('coordinator'));

    const coordinatorHasFull = userIsCoordinator && (coordinatorOwns || (eventStakeholderId && (sameDistrictForCoordinator || sameProvinceForCoordinator)) || stakeholderOwns);

    const userIsStakeholder = !!(userStakeholderId || String(info.role || '').toLowerCase().includes('stakeholder'));
    const stakeholderHasFull = userIsStakeholder && stakeholderOwns;

    // Build allowed action flags
    const allowView = true;
    const allowEdit = userIsAdmin || coordinatorHasFull || stakeholderHasFull;
    const allowManageStaff = userIsAdmin || coordinatorHasFull || stakeholderHasFull;
    const allowResched = userIsAdmin || coordinatorHasFull || stakeholderHasFull;
    const allowCancel = userIsAdmin || coordinatorHasFull || stakeholderHasFull;

    const approvedMenu = (
      <DropdownMenu aria-label="Event actions menu" variant="faded">
        <DropdownSection showDivider title="Actions">
          {allowView ? (
            <DropdownItem
              key="view"
              description="View this event"
              startContent={<Eye />}
              onPress={() => handleOpenViewEvent(event.raw)}
            >
              View Event
            </DropdownItem>
          ) : null}
          {allowEdit ? (
            <DropdownItem
              key="edit"
              description="Edit an event"
              startContent={<Edit />}
              onPress={() => handleOpenEditEvent(event.raw)}
            >
              Edit Event
            </DropdownItem>
          ) : null}
          {allowManageStaff ? (
            <DropdownItem
              key="manage-staff"
              description="Manage staff for this event"
              startContent={<Users />}
              onPress={() => setManageStaffOpenId(event.raw.Event_ID)}
            >
              Manage Staff
            </DropdownItem>
          ) : null}
          {allowResched ? (
            <DropdownItem
              key="reschedule"
              description="Reschedule this event"
              startContent={<ClockIcon />}
              onPress={() => setRescheduleOpenId(event.raw.Event_ID)}
            >
              Reschedule Event
            </DropdownItem>
          ) : null}
        </DropdownSection>
        <DropdownSection title="Danger zone">
          {allowCancel ? (
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
          ) : null}
        </DropdownSection>
      </DropdownMenu>
    );

    const defaultMenu = (
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

    if (status === 'Approved') return approvedMenu;
    return defaultMenu;
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
      // Always fetch the full event details from backend. Log the raw response to help debugging.
      const res = await fetch(
        `${API_BASE}/api/events/${encodeURIComponent(eventId)}`,
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
      {/* Header */}
      <div className="px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Calendar</h1>

        {/* User Profile Section (use HeroUI User like campaign Topbar) */}
        <div className="flex items-center gap-3 mb-6">
          <User
            avatarProps={{
              src: "",
              size: "md",
              className: "bg-orange-400 text-white",
            }}
            classNames={{
              base: "cursor-pointer",
              name: "font-semibold text-gray-900 text-sm",
              description: "text-gray-500 text-xs",
            }}
            description={currentUserEmail}
            name={currentUserName}
            onClick={() => {}}
          />
          <button
            aria-label="User menu"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            onClick={() => {}}
          >
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          {/* Left side - View Toggle and Date Navigation */}
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden">
              <button
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                  activeView === "week"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => handleViewChange("week")}
              >
                <CalendarDays className="w-4 h-4" />
                Week
              </button>
              <div className="w-px h-6 bg-gray-300" />
              <button
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                  activeView === "month"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => handleViewChange("month")}
              >
                <Calendar className="w-4 h-4" />
                Month
              </button>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() =>
                  activeView === "week"
                    ? navigateWeek("prev")
                    : navigateMonth("prev")
                }
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-900 min-w-[200px] text-center">
                {activeView === "week"
                  ? formatWeekRange(currentDate)
                  : formatMonthYear(currentDate)}
              </span>
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() =>
                  activeView === "week"
                    ? navigateWeek("next")
                    : navigateMonth("next")
                }
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Right side - Action Buttons (calendar toolbar copied from campaign) */}
          <div>
            <CalendarToolbar
              showCreate={allowCreate}
              onAdvancedFilter={handleAdvancedFilter}
              onCreateEvent={allowCreate ? handleCreateEvent : undefined}
              onExport={handleExport}
              onQuickFilter={handleQuickFilter}
            />
          </div>
        </div>

        {/* Views Container */}
        <div className="relative min-h-[700px]">
          {/* Week View */}
          <div
            className={`transition-all duration-500 ease-in-out ${getViewTransitionStyle("week")}`}
          >
            <div>
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-4 mb-4">
                {days.map((day, index) => (
                  <div key={`day-${index}`} className="text-center">
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      {day.day}
                    </div>
                    <div className="flex justify-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold ${
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

              {/* Event Cards */}
              <div className="grid grid-cols-7 gap-4 mt-6">
                {days.map((day, index) => {
                  const dayEvents = getEventsForDate(day.fullDate);

                  return (
                    <div key={index} className="min-h-[500px]">
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
                        <div className="space-y-3">
                          {dayEvents.map((event, eventIndex) => (
                            <div
                              key={eventIndex}
                              className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow"
                            >
                              {/* Three-dot menu */}
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-gray-900 text-sm leading-tight pr-2">
                                  {event.title}
                                </h4>
                                <Dropdown>
                                  <DropdownTrigger>
                                    <Button
                                      isIconOnly
                                      aria-label="Event actions"
                                      className="hover:text-default-800"
                                      variant="light"
                                    >
                                      <MoreVertical className="w-5 h-5" />
                                    </Button>
                                  </DropdownTrigger>
                                  {getMenuByStatus(event)}
                                </Dropdown>
                              </div>

                              {/* Profile */}
                              <div className="flex items-center gap-2 mb-3">
                                <div
                                  className="h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold"
                                  style={{
                                    backgroundColor: getProfileColor(
                                      event.coordinatorName,
                                    ),
                                  }}
                                >
                                  <span className="text-white">
                                    {getProfileInitial(event.coordinatorName)}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-600">
                                  {event.coordinatorName}
                                </span>
                              </div>

                              {/* Time and Type Badges */}
                              <div className="flex gap-2 mb-3">
                                <div className="bg-gray-100 rounded px-2 py-1 flex items-center gap-1">
                                  <ClockIcon className="w-3 h-3 text-gray-500" />
                                  <span className="text-xs text-gray-700">
                                    {event.time}
                                  </span>
                                </div>
                                <div className="bg-gray-100 rounded px-2 py-1">
                                  <span className="text-xs text-gray-700">
                                    {eventLabelsMap[event.type as EventType]}
                                  </span>
                                </div>
                              </div>

                              {/* District */}
                              <div className="mb-2">
                                <div className="text-xs font-medium text-gray-700 mb-0.5">
                                  District
                                </div>
                                <div className="text-xs text-gray-600">
                                  {event.district}
                                </div>
                              </div>

                              {/* Location */}
                              <div className="mb-3">
                                <div className="text-xs font-medium text-gray-700 mb-0.5">
                                  Location
                                </div>
                                <div className="text-xs text-gray-600 line-clamp-2">
                                  {event.location}
                                </div>
                              </div>

                              {/* Count */}
                              <div className="border-t border-gray-200 pt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-600">
                                    {event.countType}
                                  </span>
                                  <span className="text-lg font-bold text-red-500">
                                    {event.count}
                                  </span>
                                </div>
                              </div>
                            </div>
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
            className={`transition-all duration-500 ease-in-out ${getViewTransitionStyle("month")}`}
          >
            <div>
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-4 mb-4">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div key={day} className="text-center">
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      {day}
                    </div>
                    <div className="h-10" />
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-7 gap-px bg-gray-200">
                  {generateMonthDays(currentDate).map((day, index) => (
                    <div
                      key={index}
                      className={`min-h-[100px] bg-white p-2 ${
                        !day.isCurrentMonth && "bg-gray-50 text-gray-400"
                      }`}
                    >
                      <div className="flex justify-center mb-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
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
                          {[...Array(Math.floor(Math.random() * 3) + 1)].map((_, i) => (
                            <div
                              key={i}
                              className="h-6 bg-gray-200 rounded animate-pulse"
                              style={{ width: `${Math.random() * 40 + 60}%` }}
                            ></div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {day.events.map((event, eventIndex) => (
                            <div
                              key={eventIndex}
                              className="text-xs p-1 rounded font-medium truncate cursor-pointer transition-colors hover:shadow-sm"
                              role="button"
                              style={{
                                backgroundColor: `${event.color}22`,
                                color: event.color,
                              }}
                              tabIndex={0}
                              title={`${eventLabelsMap[event.type as EventType]} : ${event.startTime || ""}${event.endTime ? ` - ${event.endTime}` : ""}`}
                              onClick={() => handleOpenViewEvent(event.raw)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  handleOpenViewEvent(event.raw);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="truncate block">
                                  {event.title}
                                </span>
                                {event.startTime ? (
                                  <span className="text-xs font-semibold ml-1">
                                    {event.startTime}
                                  </span>
                                ) : null}
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
      {/* Event View & Edit Modals (reuse campaign components) */}
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
    </div>
  );
}
