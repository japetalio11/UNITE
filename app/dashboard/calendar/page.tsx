"use client";
import BdriveModal, { BloodDriveData } from "@/components/bdrive-modal";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { 
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
} from "@heroui/dropdown";
import { Input } from "@heroui/input";
import { Kbd } from "@heroui/kbd";
import { 
    Search, 
    ChevronDown, 
    ChevronLeft,
    ChevronRight,
    LogOut, 
    Download, 
    Clock,
    Ticket,
    Calendar,
    CalendarDays,
    SlidersHorizontal,
    Filter
} from "lucide-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem
} from '@heroui/dropdown';
import { Button } from '@heroui/button';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal';
import { DatePicker } from '@heroui/date-picker';
import { User } from '@heroui/user';
import EventViewModal from '@/components/calendar/event-view-modal';
import EditEventModal from '@/components/calendar/event-edit-modal';
import EventManageStaffModal from '@/components/calendar/event-manage-staff-modal';
import EventRescheduleModal from '@/components/calendar/event-reschedule-modal';
import CalendarToolbar from '@/components/calendar/calendar-toolbar';
import { fetchWithAuth } from '@/utils/fetchWithAuth';
import { usePathname } from 'next/navigation';

export default function CalendarPage() {
  const pathname = usePathname();
  // Allow create on dashboard calendar, but not on public calendar route
  const allowCreate = pathname === '/calendar' ? false : true;
  const [activeView, setActiveView] = useState("week");
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [weekEventsByDate, setWeekEventsByDate] = useState<Record<string, any[]>>({});
  const [monthEventsByDate, setMonthEventsByDate] = useState<Record<string, any[]>>({});
  const [eventsLoading, setEventsLoading] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>('Bicol Medical Center');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('bmc@gmail.com');
  // Initialize displayed user name/email from localStorage (match campaign page logic)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('unite_user');
      if (raw) {
        const u = JSON.parse(raw);
        const first = u.First_Name || u.FirstName || u.first_name || u.firstName || u.First || '';
        const middle = u.Middle_Name || u.MiddleName || u.middle_name || u.middleName || u.Middle || '';
        const last = u.Last_Name || u.LastName || u.last_name || u.lastName || u.Last || '';
        const parts = [first, middle, last].map((p: any) => (p || '').toString().trim()).filter(Boolean);
        const full = parts.join(' ');
        const email = u.Email || u.email || u.Email_Address || u.emailAddress || '';
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
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isBdriveModalOpen, setIsBdriveModalOpen] = useState(false);

  // Manage staff simple state
  const [staffMap, setStaffMap] = useState<Record<string, Array<{ FullName: string; Role: string }>>>({});
  const [staffLoading, setStaffLoading] = useState(false);

  // Close create menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  // API base (allow override via NEXT_PUBLIC_API_URL)
  const API_BASE = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:3000';

  // Helpers to normalize date keys (use local date YYYY-MM-DD)
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateToLocalKey = (d: Date) => {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Parse server-provided dates robustly.
  // If backend sends a date-only string like '2025-11-17' treat it as local date
  // to avoid timezone shifts from UTC parsing.
  const parseServerDate = (raw: any): Date | null => {
    if (!raw && raw !== 0) return null;
    try {
      if (typeof raw === 'string') {
        const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
          const y = Number(m[1]);
          const mo = Number(m[2]) - 1;
          const d = Number(m[3]);
          return new Date(y, mo, d);
        }
        return new Date(raw);
      }
      if (typeof raw === 'object' && raw.$date) {
        const d = raw.$date;
        if (typeof d === 'object' && d.$numberLong) return new Date(Number(d.$numberLong));
        return new Date(d as any);
      }
      return new Date(raw as any);
    } catch (e) {
      return null;
    }
  };

  const normalizeEventsMap = (input: Record<string, any> | undefined): Record<string, any[]> => {
    const out: Record<string, any[]> = {};
    if (!input) return out;
    try {
      // Helper: recursively search an object for the first array of event-like objects
      const findArrayInObject = (val: any, depth = 0): any[] | null => {
        if (!val || depth > 6) return null; // limit depth
        if (Array.isArray(val)) return val;
        if (typeof val !== 'object') return null;
        const commonKeys = ['events', 'data', 'eventsByDate', 'weekDays'];
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
        else if (rawVal && typeof rawVal === 'object') vals = [rawVal];
        else if (rawVal !== undefined && rawVal !== null) vals = [rawVal];

        if (!out[localKey]) out[localKey] = [];
        out[localKey] = out[localKey].concat(vals);
      });

      // Deduplicate events per date (prefer Event_ID / EventId when available)
      Object.keys(out).forEach((k) => {
        const seen = new Set<string>();
        out[k] = out[k].filter((ev) => {
          const id = (ev && (ev.Event_ID || ev.EventId || ev.id)) ? String(ev.Event_ID ?? ev.EventId ?? ev.id) : JSON.stringify(ev);
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

  // Merge month multi-day events into a week map for the given currentDate
  const mergeWeekWithMonth = (normalizedWeek: Record<string, any[]>, normalizedMonth: Record<string, any[]>, currentDateParam: Date) => {
    try {
      const wkStart = new Date(currentDateParam);
      const dayOfWeek = wkStart.getDay();
      wkStart.setDate(wkStart.getDate() - dayOfWeek);
      wkStart.setHours(0,0,0,0);
      const wkEnd = new Date(wkStart);
      wkEnd.setDate(wkStart.getDate() + 6);

      const merged: Record<string, any[]> = {};
      Object.keys(normalizedWeek || {}).forEach(k => { merged[k] = Array.isArray(normalizedWeek[k]) ? [...normalizedWeek[k]] : []; });

      const addEventToDate = (localKey: string, ev: any) => {
        if (!merged[localKey]) merged[localKey] = [];
        const id = ev?.Event_ID ?? ev?.EventId ?? ev?._id ?? JSON.stringify(ev);
        if (!merged[localKey].some(x => (x?.Event_ID ?? x?.EventId ?? x?._id ?? JSON.stringify(x)) === id)) {
          merged[localKey].push(ev);
        }
      };

      Object.keys(normalizedMonth || {}).forEach(k => {
        const arr = normalizedMonth[k] || [];
        for (const ev of arr) {
          let start: Date | null = null;
          let end: Date | null = null;
          try { if (ev.Start_Date) start = parseServerDate(ev.Start_Date); } catch (e) { start = null; }
          try { if (ev.End_Date) end = parseServerDate(ev.End_Date); } catch (e) { end = null; }

          if (!start) continue;
          if (!end) end = start;

          const cur = new Date(start);
          cur.setHours(0,0,0,0);
          while (cur <= end) {
            if (cur >= wkStart && cur <= wkEnd) {
              const localKey = dateToLocalKey(new Date(cur));
              addEventToDate(localKey, ev);
            }
            cur.setDate(cur.getDate() + 1);
          }
        }
      });

      return merged;
    } catch (e) {
      return normalizedWeek || {};
    }
  };

  // Enhanced date navigation with transitions
  const navigateWeek = (direction: 'prev' | 'next') => {
    setIsDateTransitioning(true);
    setSlideDirection(direction === 'prev' ? 'right' : 'left');
    
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
    
    setTimeout(() => {
      setIsDateTransitioning(false);
    }, 300);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setIsDateTransitioning(true);
    
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    
    setTimeout(() => {
      setIsDateTransitioning(false);
    }, 300);
  };

  // Event type selection handler
  const handleSelectionChange = (keys: any) => {
    const newSelection = new Set<string>();
    if (keys === 'all') {
      // Handle 'all' selection if needed
    } else if (keys) {
      const key = typeof keys === 'string' ? keys : keys.currentKey;
      if (key) {
        newSelection.add(key);
      }
    }
    setSelectedEventType(newSelection);
  };

  // Get selected event type value
  const selectedEventTypeValue = selectedEventType ? Array.from(selectedEventType)[0] as string : undefined;

  // Handle create event button click - UPDATED
  const handleCreateEvent = () => {
    if (selectedEventTypeValue === "blood-drive") {
      setIsBdriveModalOpen(true);
    } else {
      console.log(`Creating event: ${selectedEventTypeValue}`);
      // Handle other event types here
    }
  };

  // Handle saving blood drive data - NEW FUNCTION
  const handleSaveBloodDrive = (data: BloodDriveData) => {
    console.log("Blood drive data:", data);
    // Here you would typically save the data to your backend
    setIsBdriveModalOpen(false);
    
    // Reset form or handle the created event
    // You might want to refresh the calendar events here
  };

  // Date formatting functions
  const formatWeekRange = (date: Date) => {
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek;
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    const startMonth = startOfWeek.toLocaleString('default', { month: 'long' });
    const endMonth = endOfWeek.toLocaleString('default', { month: 'long' });
    const year = startOfWeek.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${year}`;
    } else {
      return `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()} ${year}`;
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
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
        day: dayDate.toLocaleString('default', { weekday: 'short' }),
        fullDate: new Date(dayDate),
        isToday: isToday(dayDate),
        month: dayDate.toLocaleString('default', { month: 'short' })
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
        events: getEventsForDate(new Date(currentDate))
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const makeOrdinal = (n: number | string) => {
    const num = parseInt(String(n), 10);
    if (isNaN(num)) return String(n);
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    const suffix = (v >= 11 && v <= 13) ? 'th' : (suffixes[num % 10] || 'th');
    return `${num}${suffix}`;
  };

  const getEventsForDate = (date: Date) => {
    const key = dateToLocalKey(date);
    const source = activeView === 'month' ? monthEventsByDate : weekEventsByDate;
    // Prefer normalized local key; fallback to ISO UTC key or raw date string if present
    const isoKey = date.toISOString().split('T')[0];
    let raw: any = source[key] || source[isoKey] || source[date.toString()] || [];

    // If backend returned a container object for this date, try to extract the array
    if (raw && !Array.isArray(raw) && typeof raw === 'object') {
      if (Array.isArray(raw.events)) raw = raw.events;
      else if (Array.isArray(raw.data)) raw = raw.data;
      else raw = [raw];
    }

    raw = Array.isArray(raw) ? raw : [];

    // Only include events that are explicitly approved
    const approved = raw.filter((e: any) => {
      const status = (e && (e.Status ?? e.status ?? '')).toString ? (e.Status ?? e.status ?? '').toString() : '';
      return status.toLowerCase() === 'approved';
    });

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

    // For month view, avoid showing multi-day events on every day: only show on the event Start_Date
    const filterByStartDateForMonth = (ev: any) => {
      if (activeView !== 'month') return true;
      let start: Date | null = null;
      try { if (ev.Start_Date) start = parseServerDate(ev.Start_Date); } catch (err) { start = null; }
      if (!start) return false;
      return dateToLocalKey(start) === key;
    };

    const finalList = deduped.filter(filterByStartDateForMonth);

    // Apply quick / advanced filters
    const afterQuick = finalList.filter((ev: any) => {
      if (!quickFilterCategory) return true;
      const rawCat = ((ev.Category ?? ev.category ?? '')).toString().toLowerCase();
      let categoryLabel = 'Event';
      if (rawCat.includes('blood')) categoryLabel = 'Blood Drive';
      else if (rawCat.includes('training')) categoryLabel = 'Training';
      else if (rawCat.includes('advocacy')) categoryLabel = 'Advocacy';
      return quickFilterCategory === '' || quickFilterCategory === undefined || quickFilterCategory === categoryLabel;
    }).filter((ev: any) => {
      // advanced filter: start date (only events on or after)
      if (advancedFilter.start) {
        let start: Date | null = null;
        try {
          if (ev.Start_Date) start = (typeof ev.Start_Date === 'string') ? new Date(ev.Start_Date) : (ev.Start_Date.$date ? new Date(ev.Start_Date.$date) : new Date(ev.Start_Date));
        } catch (err) { start = null; }
        if (start) {
          const s = new Date(advancedFilter.start);
          if (start < s) return false;
        }
      }
      if (advancedFilter.coordinator && advancedFilter.coordinator.trim()) {
        const coordQ = advancedFilter.coordinator.trim().toLowerCase();
        const coordinatorName = (ev.coordinator?.name || ev.StakeholderName || ev.MadeByCoordinatorName || ev.coordinatorName || ev.Email || '').toString().toLowerCase();
        if (!coordinatorName.includes(coordQ)) return false;
      }
      if (advancedFilter.title && advancedFilter.title.trim()) {
        const titleQ = advancedFilter.title.trim().toLowerCase();
        const evtTitle = (ev.Event_Title || ev.title || ev.EventTitle || ev.eventTitle || '').toString().toLowerCase();
        if (!evtTitle.includes(titleQ)) return false;
      }
      if (advancedFilter.requester && advancedFilter.requester.trim()) {
        const reqQ = advancedFilter.requester.trim().toLowerCase();
        const requesterName = (ev.createdByName || ev.raw?.createdByName || ev.MadeByStakeholderName || ev.StakeholderName || ev.coordinator?.name || ev.coordinatorName || ev.Email || '').toString().toLowerCase();
        if (!requesterName.includes(reqQ)) return false;
      }
      return true;
    });

    return afterQuick.map((e: any) => {
      // Start date may come in different shapes (ISO, number, or mongo export object)
      let start: Date | null = null;
      if (e.Start_Date) {
        try {
          if (typeof e.Start_Date === 'object' && e.Start_Date.$date) {
            // mongo export shape: { $date: { $numberLong: '...' } } or { $date: 12345 }
            const d = e.Start_Date.$date;
            if (typeof d === 'object' && d.$numberLong) start = new Date(Number(d.$numberLong));
            else start = new Date(d as any);
          } else {
            start = new Date(e.Start_Date as any);
          }
        } catch (err) {
          start = null;
        }
      }

  const startTime = start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
  // End time (if provided)
  let end: Date | null = null;
  if (e.End_Date) {
    try {
      if (typeof e.End_Date === 'object' && e.End_Date.$date) {
        const d = e.End_Date.$date;
        if (typeof d === 'object' && d.$numberLong) end = new Date(Number(d.$numberLong));
        else end = new Date(d as any);
      } else {
        end = new Date(e.End_Date as any);
      }
    } catch (err) {
      end = null;
    }
  }
  const endTime = end ? end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

      // Coordinator / stakeholder name — prefer createdByName from backend (stakeholder),
      // then fall back to other fields used previously.
      const coordinatorName = (e.createdByName || e.raw?.createdByName) || e.coordinator?.name || e.StakeholderName || e.MadeByCoordinatorName || e.coordinatorName || e.Email || 'Local Government Unit';

      // District number — prefer coordinator nested value but accept other shapes
      const districtNumber = e.coordinator?.district_number ?? e.district_number ?? e.DistrictNumber ?? e.district;
      const districtDisplay = districtNumber ? `${makeOrdinal(districtNumber)} District` : '1st District';

      // Determine category (case-insensitive, check both Category and category)
      const rawCat = ((e.Category ?? e.category ?? '')).toString().toLowerCase();
      let typeKey: string = 'event';
      if (rawCat.includes('blood')) typeKey = 'blood-drive';
      else if (rawCat.includes('train')) typeKey = 'training';
      else if (rawCat.includes('advoc')) typeKey = 'advocacy';

      // Helper to find count values across shapes (main event or categoryData)
      const getVal = (keys: string[]) => {
        for (const k of keys) {
          if (e[k] !== undefined && e[k] !== null) return e[k];
          if (e.categoryData && (e.categoryData[k] !== undefined && e.categoryData[k] !== null)) return e.categoryData[k];
        }
        return undefined;
      };

      let countType = '';
      let count = '';
      const targetDonation = getVal(['Target_Donation', 'TargetDonation', 'Target_Donations']);
      const maxParticipants = getVal(['MaxParticipants', 'Max_Participants', 'MaxParticipant']);
      const expectedAudience = getVal(['ExpectedAudienceSize', 'Expected_AudienceSize', 'ExpectedAudience']);

      if (typeKey === 'blood-drive' && targetDonation !== undefined) {
        countType = 'Goal Count';
        count = `${targetDonation} u.`;
      } else if (typeKey === 'training' && maxParticipants !== undefined) {
        countType = 'Participant Count';
        count = `${maxParticipants} no.`;
      } else if (typeKey === 'advocacy' && expectedAudience !== undefined) {
        countType = 'Audience Count';
        count = `${expectedAudience} no.`;
      } else {
        countType = 'Audience Count';
        count = '205 no.';
      }

      const baseTitle = e.Event_Title || e.title || 'Lifesavers Blood Drive';
      // For month view we keep the title as the event title only; tooltip will show times
      const displayTitle = baseTitle;
      // color codes: blood-drive -> red, advocacy -> yellow, training -> blue
      let color = '#3b82f6'; // default blue (training)
      if (typeKey === 'blood-drive') color = '#ef4444';
      else if (typeKey === 'advocacy') color = '#f59e0b';

      return {
        title: displayTitle,
        startTime,
        endTime,
        time: startTime,
        type: typeKey,
        district: districtDisplay,
        location: e.Location || e.location || 'Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Camarines Sur, Philippine',
        countType,
        count,
        coordinatorName,
        raw: e,
        color
      };
    });
  };

  // Handlers for toolbar actions
  const handleExport = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const url = `${API_BASE}/api/calendar/month?year=${year}&month=${month}&status=Approved`;
      const res = await fetch(url, { credentials: 'include' });
      const body = await res.json();
      const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `calendar-${year}-${month}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      // ignore export failures silently
    }
  };

  const handleQuickFilter = (f?: any) => {
    if (f && Object.prototype.hasOwnProperty.call(f, 'category')) setQuickFilterCategory(f.category);
    else setQuickFilterCategory(undefined);
  };

  const handleAdvancedFilter = (f?: { start?: string; end?: string; coordinator?: string; title?: string; requester?: string }) => {
    if (f) setAdvancedFilter({ start: f.start, coordinator: f.coordinator, title: f.title, requester: f.requester });
    else setAdvancedFilter({});
  };

  const refreshCalendarData = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    try {
      const weekUrl = `${API_BASE}/api/calendar/week?date=${encodeURIComponent(currentDate.toISOString())}&status=Approved`;
      const w = await fetch(weekUrl, { credentials: 'include' });
      const wj = await w.json();
      const normalizedWeek = normalizeEventsMap(wj?.data?.weekDays || {});

      const monthUrl = `${API_BASE}/api/calendar/month?year=${year}&month=${month}&status=Approved`;
      const m = await fetch(monthUrl, { credentials: 'include' });
      const mj = await m.json();
      const normalizedMonth = normalizeEventsMap(mj?.data?.eventsByDate || {});

      setMonthEventsByDate(normalizedMonth);
      setWeekEventsByDate(mergeWeekWithMonth(normalizedWeek, normalizedMonth, currentDate));
    } catch (e) {
      // ignore
    }
  };

  // Perform an admin action (Accepted/Rejected/Rescheduled) given an Event_ID.
  // This will fetch the event to determine the linked request id, then call
  // the admin-action endpoint on the request.
  const performAdminActionByEventId = async (eventId: string, action: string, note?: string, rescheduledDate?: string) => {
    if (!eventId) throw new Error('Missing event id');
    // fetch event details to find request id
    const headers: any = { 'Content-Type': 'application/json' };
    const rawUser = typeof window !== 'undefined' ? localStorage.getItem('unite_user') : null;
    const user = rawUser ? JSON.parse(rawUser as string) : null;
    const token = typeof window !== 'undefined' ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // load event to resolve request id
    const evRes = await fetch(`${API_BASE}/api/events/${encodeURIComponent(eventId)}`, token ? { headers } : { headers, credentials: 'include' });
    const evBody = await evRes.json();
    if (!evRes.ok) throw new Error(evBody.message || 'Failed to fetch event details');
    const evData = evBody.data || evBody.event || evBody;
    const requestId = evData?.request?.Request_ID || evData?.Request_ID || evData?.requestId || evData?.request?.RequestId || null;
    if (!requestId) throw new Error('Unable to determine request id for action');

    const body: any = { action, note: note ? note.trim() : undefined };
    if (rescheduledDate) body.rescheduledDate = rescheduledDate;

    let res;
    if (token) {
      res = await fetchWithAuth(`${API_BASE}/api/requests/${encodeURIComponent(requestId)}/admin-action`, { method: 'POST', body: JSON.stringify(body) });
    } else {
      const legacyBody = { adminId: user?.id || user?.Admin_ID || null, ...body };
      res = await fetch(`${API_BASE}/api/requests/${encodeURIComponent(requestId)}/admin-action`, { method: 'POST', headers, body: JSON.stringify(legacyBody), credentials: 'include' });
    }
    const resp = await res.json();
    if (!res.ok) throw new Error(resp.message || 'Failed to perform admin action');
    return resp;
  };

  const handleCreateEvent = async (eventType: string, data: any) => {
    try {
      // Build the normalized event payload (no actor ids here)
      const eventPayload: any = {
        Event_Title: data.eventTitle || data.eventDescription || `${eventType} event`,
        Location: data.location || '',
        Event_Description: data.eventDescription || data.Event_Description || undefined,
        Start_Date: data.startTime || (data.date ? new Date(data.date).toISOString() : undefined),
        End_Date: data.endTime || undefined,
        Email: data.email || undefined,
        Phone_Number: data.contactNumber || undefined,
        categoryType: eventType === 'blood-drive' ? 'BloodDrive' : (eventType === 'training' ? 'Training' : 'Advocacy')
      };

      if (eventPayload.categoryType === 'Training') {
        eventPayload.MaxParticipants = data.numberOfParticipants ? parseInt(data.numberOfParticipants, 10) : undefined;
        eventPayload.TrainingType = data.trainingType || undefined;
      } else if (eventPayload.categoryType === 'BloodDrive') {
        eventPayload.Target_Donation = data.goalCount ? parseInt(data.goalCount, 10) : undefined;
        eventPayload.VenueType = data.venueType || undefined;
      } else if (eventPayload.categoryType === 'Advocacy') {
        eventPayload.TargetAudience = data.audienceType || data.targetAudience || undefined;
        eventPayload.Topic = data.topic || undefined;
        eventPayload.ExpectedAudienceSize = data.numberOfParticipants ? parseInt(data.numberOfParticipants, 10) : undefined;
      }

      if (data.coordinator) eventPayload.MadeByCoordinatorID = data.coordinator;

      // If an auth token exists, prefer server-side identity resolution and
      // omit client-supplied actor ids. If no token is present (legacy), keep
      // sending the provided actor identifiers for backwards compatibility.
      const rawUser = typeof window !== 'undefined' ? localStorage.getItem('unite_user') : null;
      const user = rawUser ? JSON.parse(rawUser) : null;
      const token = typeof window !== 'undefined' ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null;

      if (token) {
        // Token present: send only the event payload (server derives user/role)
        if (user && (user.staff_type === 'Admin' || user.staff_type === 'Coordinator')) {
          const res = await fetchWithAuth(`${API_BASE}/api/events/direct`, { method: 'POST', body: JSON.stringify(eventPayload) });
          const resp = await res.json();
          if (!res.ok) throw new Error(resp.message || 'Failed to create event');
          await refreshCalendarData();
          return resp;
        } else {
          if (!data.coordinator) throw new Error('Coordinator is required for requests');
          const body = { coordinatorId: data.coordinator, ...eventPayload };
          const res = await fetchWithAuth(`${API_BASE}/api/requests`, { method: 'POST', body: JSON.stringify(body) });
          const resp = await res.json();
          if (!res.ok) throw new Error(resp.message || 'Failed to create request');
          await refreshCalendarData();
          return resp;
        }
      } else {
        // No token: legacy behavior - include actor ids if available
        const headers: any = { 'Content-Type': 'application/json' };
        if (user && (user.staff_type === 'Admin' || user.staff_type === 'Coordinator')) {
          const body = { creatorId: user.id, creatorRole: user.staff_type, ...eventPayload };
          const res = await fetch(`${API_BASE}/api/events/direct`, { method: 'POST', headers, body: JSON.stringify(body) });
          const resp = await res.json();
          if (!res.ok) throw new Error(resp.message || 'Failed to create event');
          await refreshCalendarData();
          return resp;
        } else {
          if (!data.coordinator) throw new Error('Coordinator is required for requests');
          const stakeholderId = user?.Stakeholder_ID || user?.StakeholderId || user?.id || null;
          const body = { coordinatorId: data.coordinator, MadeByStakeholderID: stakeholderId, ...eventPayload };
          const res = await fetch(`${API_BASE}/api/requests`, { method: 'POST', headers, body: JSON.stringify(body) });
          const resp = await res.json();
          if (!res.ok) throw new Error(resp.message || 'Failed to create request');
          await refreshCalendarData();
          return resp;
        }
      }
    } catch (err: any) {
      // Do not log to console; propagate error to caller so the toolbar
      // can set the modal error and render it without producing console warnings.
      throw err;
    }
  };

  // Profile helpers: initial and deterministic color per user
  const getProfileInitial = (name?: string) => {
    if (!name) return 'U';
    const trimmed = String(name).trim();
    return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : 'U';
  };

  const getProfileColor = (name?: string) => {
    const s = (name || 'unknown').toString();
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
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const days = getDaysForWeek(currentDate);

  // Event type labels and descriptions
  const eventLabelsMap: Record<string, string> = {
    "blood-drive": "Blood Drive",
    "training": "Training",
    "advocacy": "Advocacy"
  };

  const eventDescriptionsMap: Record<string, string> = {
    "blood-drive": "Organize a blood donation event",
    "training": "Schedule a training session",
    "advocacy": "Create an advocacy campaign"
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
      return 'opacity-100 scale-100 translate-y-0';
    } else if (isActive && isTransitioning) {
      return 'opacity-100 scale-100 translate-y-0';
    } else if (!isActive && isTransitioning) {
      return view === 'week' 
        ? 'opacity-0 scale-95 -translate-y-4 absolute inset-0 pointer-events-none'
        : 'opacity-0 scale-95 translate-y-4 absolute inset-0 pointer-events-none';
    } else {
      return 'opacity-0 scale-95 absolute inset-0 pointer-events-none';
    }
  };

  const slideVariants = {
    enter: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? -100 : 100,
      opacity: 0
    })
  };

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    // Add search functionality here
  };

  // Handle keyboard shortcuts (Win+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('calendar-search')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-visible bg-white">
      {/* Header */}
      <header className="relative z-10">
        <div className="px-8 py-7">
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          
          {/* Profile and Search Bar Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center mt-12">
              {/* Profile Info with Dropdown */}
              <div className="relative" ref={dropdownRef} style={{ minHeight: '52px' }}>
                <div 
                  className="flex items-center cursor-pointer group"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <div className="h-10 w-10 rounded-full overflow-hidden mr-3">
                    <img 
                      src="/Avatar.png" 
                      alt="Profile" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="pl-3 pr-3 flex-1">
                    <p className="text-[15px] font-medium text-gray-900 leading-none">Bicol Medical Center</p>
                    <p className="text-[13px] text-gray-500">bmc@gmail.com</p>
                  </div>
                  <ChevronDown 
                    className={`h-5 w-5 text-gray-500 transition-all duration-200 ${
                      isDropdownOpen ? 'transform rotate-180' : ''
                    } group-hover:text-gray-700`} 
                  />
                </div>
                
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute right-0 top-[calc(100%+4px)] bg-white rounded-md shadow-lg z-50 border border-gray-200 overflow-hidden"
                    >
                      <motion.button
                        whileHover={{ backgroundColor: '#f9fafb' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 flex items-center whitespace-nowrap"
                      >
                        <motion.span 
                          className="flex items-center"
                          whileHover={{ x: 2 }}
                          transition={{ duration: 0.2 }}
                        >
                          <LogOut className="h-4 w-4 mr-2.5 text-gray-500" />
                          <span>Log out</span>
                        </motion.span>
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Search Bar */}
              <div className="flex-1 max-w-md ml-auto">
                <Input
                  id="calendar-search"
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  startContent={
                    <Search className="w-4 h-4 text-gray-400" />
                  }
                  endContent={
                    <div className="flex items-center gap-1">
                      <Kbd keys={["command"]} className="hidden sm:inline-flex">
                        K
                      </Kbd>
                    </div>
                  }
                  radius="md"
                  size="sm"
                  classNames={{
                    inputWrapper: "bg-gray-100 border-gray-300 hover:bg-gray-100",
                    input: "text-sm"
                  }}
                />
              </div>
            </div>

            {/* Calendar Toolbar with View Toggle and Actions */}
            <div className="w-full bg-white">
              <div className="flex items-center justify-between px-6 py-3">
                {/* Left side - View Toggle */}
                <div className="flex items-center gap-4">
                  {/* View Toggle with Icons */}
                  <div className="relative bg-gray-100 rounded-lg p-1 border border-gray-300">
                    <div
                      className={`absolute top-1 bottom-1 bg-white rounded-md shadow-sm transition-all duration-300 ease-in-out ${
                        activeView === "week" 
                          ? "left-1 right-1/2" 
                          : "left-1/2 right-1"
                      }`}
                    />
                    <div className="relative flex">
                      <button 
                        onClick={() => handleViewChange("week")}
                        className={`relative px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors duration-300 z-10 ${
                          activeView === "week" ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <CalendarDays className="w-4 h-4" />
                        Week
                      </button>
                      <button 
                        onClick={() => handleViewChange("month")}
                        className={`relative px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors duration-300 z-10 ${
                          activeView === "month" ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <Calendar className="w-4 h-4" />
                        Month
                      </button>
                    </div>
                  </div>

                  {/* Date Navigation */}
                  <div className="flex items-center bg-gray-100 rounded-lg border border-gray-300 px-3 py-2 h-12">
                    <button 
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors duration-200 flex items-center justify-center w-8 h-8"
                      onClick={() => activeView === "week" ? navigateWeek('prev') : navigateMonth('prev')}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-gray-900 font-medium px-4 text-base min-w-[180px] text-center">
                      {activeView === "week" ? formatWeekRange(currentDate) : formatMonthYear(currentDate)}
                    </span>
                    <button 
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors duration-200 flex items-center justify-center w-8 h-8"
                      onClick={() => activeView === "week" ? navigateWeek('next') : navigateMonth('next')}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Right side - Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Export Button */}
                  <Button
                    variant="faded"
                    startContent={<Download className="w-4 h-4" />}
                    radius="md"
                    size="sm"
                  >
                    Export
                  </Button>

                  {/* Quick Filter Button */}
                  <Button
                    variant="faded"
                    startContent={<Filter className="w-4 h-4" />}
                    endContent={<ChevronDown className="w-4 h-4"/>}
                    radius="md"
                    size="sm"
                  >
                    Quick Filter
                  </Button>

                  {/* Advanced Filter Button */}
                  <Button
                    variant="faded"
                    startContent={<SlidersHorizontal className="w-4 h-4" />}
                    endContent={<ChevronDown className="w-4 h-4"/>}
                    radius="md"
                    size="sm"
                  >
                    Advanced Filter
                  </Button>

                  {/* Create Event Button Group with Dropdown */}
                  <ButtonGroup 
                    variant="solid"
                    radius="md"
                    size="sm"
                  >
                    <Button
                      onPress={handleCreateEvent}
                      color="primary"
                      startContent={<Ticket className="w-4 h-4" />}
                    >
                      {selectedEventTypeValue ? eventLabelsMap[selectedEventTypeValue] : 'Create Event'}
                    </Button>
                    <Dropdown placement="bottom-end">
                      <DropdownTrigger>
                        <Button isIconOnly color="primary">
                          <ChevronDown className="w-4 h-4"/>
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        disallowEmptySelection
                        aria-label="Event type options"
                        className="max-w-2xl"
                        selectedKeys={selectedEventType || new Set()}
                        selectionMode="single"
                        onSelectionChange={handleSelectionChange}
                      >
                        <DropdownItem key="blood-drive" description={eventDescriptionsMap["blood-drive"]}>
                          {eventLabelsMap["blood-drive"]}
                        </DropdownItem>
                        <DropdownItem key="training" description={eventDescriptionsMap["training"]}>
                          {eventLabelsMap["training"]}
                        </DropdownItem>
                        <DropdownItem key="advocacy" description={eventDescriptionsMap["advocacy"]}>
                          {eventLabelsMap["advocacy"]}
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </ButtonGroup>
                </div>
              </div>

            {/* Views Container - Both views remain in DOM during transitions */}
            <div className="mt-8 relative min-h-[900px] flex flex-col">
              {/* Week View */}
              <div className={`transition-all duration-500 ease-in-out ${getViewTransitionStyle('week')}`}>
                <div className="mt-8">
                  {/* Days Grid with sliding animation */}
                  <div className="mb-8">
                    {/* Days of Week Header - Fixed position */}
                    <div className="grid grid-cols-7 gap-6 mb-4">
                      {days.map((day, index) => (
                        <div key={`day-${index}`} className="flex justify-center">
                          <div className="w-20 text-center">
                            <span className="text-xl font-semibold text-gray-500">
                              {day.day}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Dates with animation */}
                    <div className="relative h-24">
                      <AnimatePresence mode="wait" custom={slideDirection}>
                        <motion.div
                          key={`week-${currentDate.getTime()}`}
                          custom={slideDirection}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="absolute inset-0 grid grid-cols-7 gap-6"
                        >
                          {days.map((day, index) => (
                            <div key={index} className="flex justify-center">
                              <div className="w-20 h-20 flex items-center justify-center">
                                <div className="relative">
                                  {day.isToday && (
                                    <div className="absolute inset-0 bg-red-500 rounded-full transform scale-100" />
                                  )}
                                  <div className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold z-10 ${
                                    day.isToday
                                      ? 'text-white'
                                      : 'text-gray-900 hover:bg-gray-100'
                                  }`}>
                                    {day.date}
                                  </div>
                                </div>
                                <span className="text-xs text-gray-600">{event.coordinatorName}</span>
                              </div>

                  {/* Event Cards with fade transition */}
                  <div className={`transition-all duration-500 ease-in-out flex-1 ${
                    isViewTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                  } ${
                    isDateTransitioning ? 'translate-y-8' : 'translate-y-0'
                  }`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 lg:gap-6 px-2 sm:px-4 lg:px-0">
                      {days.map((day, index) => {
                        const dayEvents = getEventsForDate(day.fullDate);
                        return (
                          <div 
                            key={index} 
                            className={`relative ${index < 6 ? 'lg:border-r lg:border-gray-200' : ''} px-1 sm:px-2 lg:px-3`}
                          >
                            {/* Day header for mobile */}
                            <div className="lg:hidden mb-3 pb-2 border-b border-gray-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className={`text-lg font-semibold ${day.isToday ? 'text-red-500' : 'text-gray-700'}`}>
                                    {day.day}, {day.month} {day.date}
                                  </span>
                                </div>
                                {day.isToday && (
                                  <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                                    Today
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Column separator */}
                            {index > 0 && (
                              <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-gray-200"></div>
                            )}
                            
                            {/* Events container with scroll */}
                            <div 
                              className={`min-h-[200px] lg:min-h-[600px] space-y-3 lg:space-y-4 py-1 w-full ${
                                dayEvents.length > 2 ? 'overflow-y-auto pr-1 sm:pr-2' : ''
                              }`}
                              style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#9ca3af #f3f4f6',
                                maxWidth: '100%',
                                overflowX: 'hidden'
                              }}
                            >
                              {dayEvents.length === 0 ? (
                                <div className="h-16 flex items-center justify-center text-gray-400 text-sm">
                                  No events
                                </div>
                              ) : (
                                dayEvents.map((event, eventIndex) => (
                                  <div 
                                    key={eventIndex} 
                                    className="bg-white rounded-xl border border-gray-300 p-3 lg:p-4 transition-all duration-200 hover:shadow-md w-full max-w-full overflow-hidden"
                                    style={{ boxSizing: 'border-box' }}
                                  >
                                    {/* Event Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 w-full">
                                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg break-words max-w-[70%]">
                                        {event.title}
                                      </h4>
                                      <div className="flex-shrink-0">
                                        <div className="bg-gray-100 rounded-lg border border-gray-300 px-2 py-1 text-xs lg:text-sm whitespace-nowrap">
                                          <span className="text-gray-700">{event.time}</span>
                                          <Clock className="h-3 w-3 text-gray-500 inline-block ml-1" />
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Profile and Local Government Unit */}
                                    <div className="flex items-start gap-3 mb-3">
                                      <div className="h-7 w-7 lg:h-8 lg:w-8 rounded-full overflow-hidden flex-shrink-0">
                                        <img 
                                          src="/Avatar.png" 
                                          alt="Local Government Unit" 
                                          className="h-full w-full object-cover"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="text-xs lg:text-sm font-medium text-gray-700 truncate">Local Government Unit</h5>
                                        <div className="mt-1">
                                          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
                                            {eventLabelsMap[event.type]}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* District and Location */}
                                    <div className="space-y-2 mb-3">
                                      <div>
                                        <h5 className="text-xs font-medium text-gray-700 mb-0.5">District</h5>
                                        <p className="text-xs lg:text-sm text-gray-600 break-words">{event.district}</p>
                                      </div>
                                      <div>
                                        <h5 className="text-xs font-medium text-gray-700 mb-0.5">Location</h5>
                                        <p className="text-xs lg:text-sm text-gray-600 line-clamp-2 break-words">{event.location}</p>
                                      </div>
                                    </div>

                                    {/* Count Section */}
                                    <div className="border-t border-gray-200 pt-2 mt-3">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs lg:text-sm font-medium text-gray-700">{event.countType}</span>
                                        <span className="text-lg lg:text-xl font-bold text-red-500">{event.count}</span>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex space-x-2 mt-3">
                                      <button className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-1.5 lg:py-2 text-xs lg:text-sm font-medium border border-gray-300 hover:bg-gray-200 transition-all duration-200">
                                        Edit
                                      </button>
                                      <button className="flex-1 bg-gray-900 text-white rounded-lg py-1.5 lg:py-2 text-xs lg:text-sm font-medium hover:bg-gray-800 transition-all duration-200">
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
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
          <div className={`transition-all duration-500 ease-in-out ${getViewTransitionStyle('month')}`}>
            <div>
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-4 mb-4">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div key={day} className="text-center">
                    <div className="text-sm font-medium text-gray-500 mb-2">{day}</div>
                    <div className="h-10"></div>
                  </div>
                ))}
              </div>

              {/* Month View */}
              <div className={`transition-all duration-500 ease-in-out mt-8 ${getViewTransitionStyle('month')}`}>
                <div className="sticky top-0 bg-white z-10 pt-4 pb-1">
                  {/* Days of Week Header - Fixed width containers */}
                  <div className="grid grid-cols-7 gap-6">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="flex flex-col items-center">
                        <div className="w-20 text-center">
                          <span className="text-xl font-semibold text-gray-500">
                            {day}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calendar Grid with fade transition */}
                <div className={`transition-all duration-500 ease-in-out mt-1 ${
                  isViewTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                } ${
                  isDateTransitioning ? 'translate-y-8' : 'translate-y-0'
                }`}>
                  <div className="bg-gray-100 rounded-xl border border-gray-300 overflow-hidden">
                    <div className="grid grid-cols-7 gap-px bg-gray-200 min-h-[600px]">
                      {generateMonthDays(currentDate).map((day, index) => (
                        <div
                          key={index}
                          className={`h-[200px] bg-white p-2.5 transition-all duration-200 flex flex-col ${
                            day.isCurrentMonth 
                              ? 'hover:bg-gray-50' 
                              : 'bg-gray-50 text-gray-400'
                          } ${
                            day.isToday ? 'ring-1 ring-red-200' : ''
                          }`}
                        >
                          {/* Date Number - Fixed height container */}
                          <div className="h-8 flex items-center justify-center mb-1.5">
                            <div className={`transition-all duration-500 ease-in-out ${
                              isViewTransitioning ? 'opacity-0' : 'opacity-100'
                            }`}>
                              <div className="flex flex-col items-center">
                                <div className="relative">
                                  {day.isToday && (
                                    <div className="absolute inset-0 bg-red-500 rounded-full transform scale-150" />
                                  )}
                                  <span className={`relative text-base font-semibold z-10 ${
                                    day.isCurrentMonth 
                                      ? day.isToday
                                        ? 'text-white'
                                        : 'text-gray-900'
                                      : 'text-gray-400'
                                  }`}>
                                    {day.date.getDate()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Events - Positioned below the date number */}
                          <div className="space-y-2 mt-1">
                            {day.events.map((event, eventIndex) => (
                              <div
                                key={eventIndex}
                                className="h-[100px] flex flex-col p-2.5 rounded-lg bg-white border border-gray-200 hover:shadow-sm transition-all duration-200 cursor-pointer group relative"
                                title={`${event.time} - ${event.title}`}
                              >
                                {/* Time at top right */}
                                <div className="absolute top-2 right-2">
                                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                    {event.time}
                                  </span>
                                </div>
                                
                                <div className="flex items-start h-full pt-1">
                                  <div className="flex items-start gap-2.5 h-full">
                                    <div className="bg-red-50 p-2 rounded-md flex-shrink-0">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col h-full">
                                      <div className="pr-8">
                                        <span className="text-sm font-semibold text-gray-800 leading-tight line-clamp-1">{event.title}</span>
                                      </div>
                                      <div className="flex items-center text-xs text-gray-500 mt-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="truncate">{event.district}</span>
                                      </div>
                                      <div className="mt-auto w-full">
                                        <div className="flex items-center justify-end gap-2 absolute bottom-2 right-2">
                                          <span className="text-xs font-medium text-gray-600">{event.countType}</span>
                                          <span className="text-sm font-bold text-red-500">{event.count}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Blood Drive Modal */}
      <BdriveModal
        isOpen={isBdriveModalOpen}
        onClose={() => setIsBdriveModalOpen(false)}
        onSave={handleSaveBloodDrive}
      />
    </div>
  );
}