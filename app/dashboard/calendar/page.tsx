"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, Tab } from "@heroui/tabs";
import { Button, ButtonGroup } from "@heroui/button";
import { 
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
} from "@heroui/dropdown";
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
import Topbar from "@/components/topbar";
import CampaignToolbar from "@/components/campaign/campaign-toolbar";

export default function CalendarPage() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeView, setActiveView] = useState("week");
  // Default to today so the week view starts on the current week
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [selectedEventType, setSelectedEventType] = useState<Set<string> | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [weekEventsByDate, setWeekEventsByDate] = useState<Record<string, any[]>>({});
  const [monthEventsByDate, setMonthEventsByDate] = useState<Record<string, any[]>>({});
  const [eventsLoading, setEventsLoading] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [isDateTransitioning, setIsDateTransitioning] = useState(false);
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Set initial event type in useEffect to ensure it only runs on the client
  useEffect(() => {
    setSelectedEventType(new Set(["blood-drive"]));
  }, []);

  // Load current user display name/email for topbar
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
      // ignore malformed localStorage
    }
  }, []);

  const handleLogout = () => {
    console.log('User logged out');
    setIsDropdownOpen(false);
  };

  // Enhanced date navigation with transitions
  const navigateWeek = async (direction: 'prev' | 'next') => {
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

  const navigateMonth = async (direction: 'prev' | 'next') => {
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
      return `${startMonth} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${year}`;
    } else {
      return `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${year}`;
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Generate days for the current week
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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  // Fetch week events from API and populate weekEventsByDate
  const fetchWeekEvents = async (date: Date) => {
    try {
      setEventsLoading(true);
      const token = localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_URL}/api/calendar/week?date=${encodeURIComponent(date.toISOString())}`, { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Failed to fetch calendar week');
      const week = body.data || body.week || {};
      const weekDays = week.weekDays || {};
      setWeekEventsByDate(weekDays);
    } catch (e: any) {
      console.error('Failed to load week events', e);
      setWeekEventsByDate({});
    } finally {
      setEventsLoading(false);
    }
  };

  // Fetch month events from API and populate monthEventsByDate
  const fetchMonthEvents = async (date: Date) => {
    try {
      setEventsLoading(true);
      const token = localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // API expects 1-12
      const res = await fetch(`${API_URL}/api/calendar/month?year=${year}&month=${month}`, { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Failed to fetch calendar month');
      const monthData = body.data || body.month || {};
      // month.eventsByDate is expected (keys yyyy-mm-dd -> events[])
      const eventsByDate = monthData.eventsByDate || {};
      setMonthEventsByDate(eventsByDate);
    } catch (e: any) {
      console.error('Failed to load month events', e);
      setMonthEventsByDate({});
    } finally {
      setEventsLoading(false);
    }
  };

  // Fetch events when currentDate or activeView changes
  useEffect(() => {
    if (activeView === 'week') {
      fetchWeekEvents(currentDate);
    } else if (activeView === 'month') {
      fetchMonthEvents(currentDate);
    }
  }, [currentDate, activeView]);

  // Helper functions for month view
  const generateMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first Sunday of the week that contains the first day
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    // End at the last Saturday of the week that contains the last day
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

  // Helper to convert numeric district to ordinal string (1 -> 1st)
  const makeOrdinal = (n: number | string) => {
    const num = parseInt(String(n), 10);
    if (isNaN(num)) return String(n);
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    const suffix = (v >= 11 && v <= 13) ? 'th' : (suffixes[num % 10] || 'th');
    return `${num}${suffix}`;
  };

  const getEventsForDate = (date: Date) => {
    const key = date.toISOString().split('T')[0];
  // choose source depending on the active view (month or week)
  const source = activeView === 'month' ? monthEventsByDate : weekEventsByDate;
  const raw = source[key] || [];
    // Normalize each event to the shape expected by the UI
    return raw.map((e: any) => {
      const start = e.Start_Date ? new Date(e.Start_Date) : null;
      const time = start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
      // coordinator name or fallback to event coordinator data
      const coordinatorName = (e.coordinator && e.coordinator.name) ? e.coordinator.name : (e.coordinator_id || '');
      // district display
      const districtNumber = e.coordinator && e.coordinator.district_number ? e.coordinator.district_number : null;
      const districtDisplay = districtNumber ? `${makeOrdinal(districtNumber)} District` : (e.coordinator && e.coordinator.district_name ? e.coordinator.district_name : '');
      // count based on category
      let countType = '';
      let count = '';
      if (e.category === 'BloodDrive' && e.categoryData && e.categoryData.Target_Donation !== undefined) {
        countType = 'Goal Count';
        count = `${e.categoryData.Target_Donation} u.`;
      } else if (e.category === 'Training' && e.categoryData && e.categoryData.MaxParticipants !== undefined) {
        countType = 'Participant Count';
        count = `${e.categoryData.MaxParticipants} no.`;
      } else if (e.category === 'Advocacy' && e.categoryData && e.categoryData.ExpectedAudienceSize !== undefined) {
        countType = 'Audience Count';
        count = `${e.categoryData.ExpectedAudienceSize} no.`;
      }

      // normalize type key for UI labels (backend uses BloodDrive, Training, Advocacy)
      const rawCat = (e.category || '').toString().toLowerCase();
      let typeKey: string = 'event';
      if (rawCat.includes('blood')) typeKey = 'blood-drive';
      else if (rawCat.includes('train')) typeKey = 'training';
      else if (rawCat.includes('advoc')) typeKey = 'advocacy';

      return {
        title: e.Event_Title || e.title || '',
        time,
        type: typeKey,
        district: districtDisplay,
        location: e.Location || '',
        countType,
        count,
        coordinatorName,
        raw: e
      };
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const days = getDaysForWeek(currentDate);

  // Event type labels and descriptions
  type EventType = keyof {
    "blood-drive": string;
    training: string;
    advocacy: string;
  };

  const eventLabelsMap: Record<EventType, string> = {
    "blood-drive": "Blood Drive",
    "training": "Training",
    "advocacy": "Advocacy"
  };

  const eventDescriptionsMap: Record<EventType, string> = {
    "blood-drive": "Organize a blood donation event",
    "training": "Schedule a training session",
    "advocacy": "Create an advocacy campaign"
  };

  // Get selected event type value
  const selectedEventTypeValue = selectedEventType ? Array.from(selectedEventType)[0] as EventType : undefined;

  // Handle create event button click
  const handleCreateEvent = () => {
    if (selectedEventTypeValue) {
      console.log(`Creating event: ${selectedEventTypeValue}`);
    }
  };

  const handleViewChange = (view: string) => {
    setIsViewTransitioning(true);
    setTimeout(() => {
      setActiveView(view);
      setIsViewTransitioning(false);
    }, 500); // Slower transition (500ms)
  };

  // View transition styles
  const getViewTransitionStyle = (view: string) => {
    const isActive = activeView === view;
    const isTransitioning = isViewTransitioning;
    
    if (isActive && !isTransitioning) {
      return 'opacity-100 scale-100 translate-y-0';
    } else if (isActive && isTransitioning) {
      return view === 'week' 
        ? 'opacity-100 scale-100 translate-y-0' // Current view stays visible during transition
        : 'opacity-100 scale-100 translate-y-0'; // Current view stays visible during transition
    } else if (!isActive && isTransitioning) {
      return view === 'week' 
        ? 'opacity-0 scale-95 -translate-y-4 absolute inset-0 pointer-events-none' // Week fades out and moves up
        : 'opacity-0 scale-95 translate-y-4 absolute inset-0 pointer-events-none'; // Month fades out and moves down
    } else {
      return 'opacity-0 scale-95 absolute inset-0 pointer-events-none'; // Hidden state
    }
  };

  // Slide animation variants for week navigation
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

  return (
    <div className="flex-1 flex flex-col overflow-visible bg-white relative">
      {/* Header */}
      <header className="relative z-10">
        <div className="px-8 py-7">
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          
          {/* Profile and Campaign Toolbar (reused from Campaign page) */}
          <div className="space-y-6">
            <div className="flex justify-between items-center mt-6">
              <Topbar
                userName={currentUserName || 'Bicol Medical Center'}
                userEmail={currentUserEmail || 'bmc@gmail.com'}
                onSearch={(q: string) => console.log('topbar search', q)}
                onUserClick={() => setIsDropdownOpen(prev => !prev)}
              />
            </div>

            {/* Campaign Toolbar provides Export / Quick Filter / Advanced Filter / Create Event UI */}
            <CampaignToolbar
              onExport={() => console.log('export')}
              onQuickFilter={(f: any) => console.log('quick filter', f)}
              onAdvancedFilter={(f: any) => console.log('advanced filter', f)}
              onCreateEvent={(type: string, data: any) => { handleCreateEvent(); }}
              onTabChange={() => {}}
              defaultTab="all"
            />
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

                  {/* Right side - Action Buttons are provided by CampaignToolbar above (keep empty here) */}
                  <div className="flex items-center gap-2" />
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
                            <span className={`text-xl font-semibold ${
                              selectedDate === day.date ? 'text-red-500' : 'text-gray-500'
                            }`}>
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
                                    <div className="absolute inset-0 bg-red-500 rounded-full" />
                                  )}
                                  <div className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold z-10 ${
                                    day.isToday
                                      ? 'text-white'
                                      : selectedDate === day.date
                                      ? 'text-white bg-red-500'
                                      : 'text-gray-900 hover:bg-gray-100'
                                  }`}>
                                    {day.date}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Event Cards with fade transition */}
                  <div className={`transition-all duration-500 ease-in-out flex-1 ${
                    isViewTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                  } ${
                    isDateTransitioning ? 'translate-y-8' : 'translate-y-0'
                  }`}>
                    <div className="grid grid-cols-7">
                      {days.map((day, index) => {
                        const dayEvents = getEventsForDate(day.fullDate);
                        return (
                          <div 
                            key={index} 
                            className={`relative ${index < 6 ? 'border-r border-gray-200' : ''} px-3`}
                          >
                            {/* Column separator with fixed height */}
                            {index > 0 && (
                              <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200"></div>
                            )}
                            
                            {/* Events container with scroll */}
                            <div 
                              className={`min-h-[600px] space-y-4 py-1 ${dayEvents.length > 2 ? 'overflow-y-auto pr-2' : ''}`}
                              style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#9ca3af #f3f4f6'
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
                                    className="bg-white rounded-xl border border-gray-300 p-4 transition-all duration-200 hover:shadow-md"
                                  >
                                    {/* Event Title */}
                                    <h4 className="font-semibold text-gray-900 text-lg mb-3">{event.title}</h4>
                                    
                                    {/* Profile and Local Government Unit */}
                                    <div className="flex items-start gap-3 mb-4">
                                      <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                                        <img 
                                          src="/Avatar.png" 
                                          alt="Local Government Unit" 
                                          className="h-full w-full object-cover"
                                        />
                                      </div>
                                      <div>
                                        <h5 className="text-sm font-medium text-gray-700">{event.coordinatorName || 'Local Government Unit'}</h5>
                                      </div>
                                    </div>

                                    {/* Time and Event Type Container */}
                                    <div className="flex gap-2 mb-4">
                                      {/* Time Badge */}
                                      <div className="bg-gray-100 rounded-lg border border-gray-300 px-3 py-1 inline-flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-700">{event.time}</span>
                                        <Clock className="h-3 w-3 text-gray-500" />
                                      </div>

                                      {/* Event Type Badge */}
                                      <div className="bg-gray-100 rounded-lg border border-gray-300 px-3 py-1 inline-flex items-center">
                                        <span className="text-sm font-medium text-gray-700">{eventLabelsMap[event.type as EventType]}</span>
                                      </div>
                                    </div>

                                    {/* District */}
                                    <div className="mb-3">
                                      <h5 className="text-sm font-medium text-gray-700 mb-1">District</h5>
                                      <p className="text-sm text-gray-600">{event.district}</p>
                                    </div>

                                    {/* Location */}
                                    <div className="mb-4">
                                      <h5 className="text-sm font-medium text-gray-700 mb-1">Location</h5>
                                      <p className="text-sm text-gray-600">{event.location}</p>
                                    </div>

                                    {/* Count Section */}
                                    <div className="border-t border-gray-200 pt-3">
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">{event.countType}</span>
                                        <span className="text-xl font-bold text-red-500">{event.count}</span>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex space-x-2 mt-4">
                                      <button className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium border border-gray-300 hover:bg-gray-200 transition-all duration-200">
                                        Edit
                                      </button>
                                      <button className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 transition-all duration-200">
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Month View */}
              <div className={`transition-all duration-500 ease-in-out ${getViewTransitionStyle('month')}`}>
                <div className="mt-8">
                  {/* Days of Week Header - Fixed width containers */}
                  <div className="grid grid-cols-7 gap-6 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="flex flex-col items-center">
                        <div className="w-20 text-center">
                          <span className="text-xl font-semibold text-gray-500 pb-4">
                            {day}
                          </span>
                        </div>
                        {/* Empty space to match week view layout */}
                        <div className="w-20 h-20 mt-4"></div>
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid with fade transition */}
                  <div className={`transition-all duration-500 ease-in-out ${
                    isViewTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                  } ${
                    isDateTransitioning ? 'translate-y-8' : 'translate-y-0'
                  }`}>
                    <div className="bg-gray-100 rounded-xl border border-gray-300 overflow-hidden">
                      <div className="grid grid-cols-7 gap-px bg-gray-200 min-h-[600px]">
                        {generateMonthDays(currentDate).map((day, index) => (
                          <div
                            key={index}
                            className={`min-h-[140px] bg-white p-3 transition-all duration-200 ${
                              day.isCurrentMonth 
                                ? 'hover:bg-gray-50' 
                                : 'bg-gray-50 text-gray-400'
                            }`}
                          >
                            {/* Date Number - Fixed height container */}
                            <div className="h-8 flex items-center justify-center mb-2">
                              <div className={`transition-all duration-500 ease-in-out ${
                                isViewTransitioning ? 'opacity-0' : 'opacity-100'
                              }`}>
                                <div className="flex flex-col items-center">
                                  <div className="relative">
                                    {day.isToday && (
                                      <div className="absolute inset-0 bg-red-500 rounded-full" />
                                    )}
                                    <span className={`relative text-xl font-semibold z-10 ${
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
                            <div className="space-y-1">
                              {day.events.map((event, eventIndex) => (
                                <div
                                  key={eventIndex}
                                  className="text-xs p-1.5 rounded bg-red-100 text-red-800 font-medium truncate cursor-pointer hover:bg-red-200 transition-all duration-200 flex items-center"
                                  title={`${event.time} - ${event.title}`}
                                >
                                  <span className="font-semibold">{event.title}</span>
                                  <span className="text-red-600 ml-2 text-xs opacity-80">{event.time}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}