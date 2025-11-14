"use client";

import React, { useState, useEffect, useMemo } from "react";
import Topbar from "@/components/topbar";
import { getUserInfo } from '../../../utils/getUserInfo'
import { debug } from '@/utils/devLogger'
import CampaignToolbar from "@/components/campaign/campaign-toolbar";
import CampaignCalendar from "@/components/campaign/campaign-calendar";
import EventCard from "@/components/campaign/event-card";
import EventViewModal from "@/components/campaign/event-view-modal";
import EditEventModal from "@/components/campaign/event-edit-modal";
import { Modal } from "@heroui/modal";

/**
 * Campaign Page Component
 * Main campaign management page with topbar, toolbar, and content area.
 */

export default function CampaignPage() {
  // Defer initializing selectedDate to after hydration to avoid any
  // server/client time differences during initial render.
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (!selectedDate) setSelectedDate(new Date());
  }, []);
    
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    debug('Selected date:', date.toLocaleDateString());
  };
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6; // show max 6 requests per page
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [quickFilterCategory, setQuickFilterCategory] = useState<string | undefined>(undefined);
  const [advancedFilter, setAdvancedFilter] = useState<{ start?: string; end?: string; coordinator?: string }>({});
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [publicEvents, setPublicEvents] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Extracted fetchRequests so we can reuse after creating events
  const fetchRequests = async () => {
    setIsLoadingRequests(true);
    setRequestsError("");

    try {
      const token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Build query params for server-side filtering
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(pageSize));
      if (searchQuery && searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedTab && selectedTab !== 'all') {
        // map UI tabs to server status values
        if (selectedTab === 'approved') params.set('status', 'Completed');
        else if (selectedTab === 'pending') params.set('status', 'Pending_Admin_Review');
        else if (selectedTab === 'rejected') params.set('status', 'Rejected');
      }
      if (advancedFilter && advancedFilter.start) params.set('date_from', advancedFilter.start);
      if (advancedFilter && advancedFilter.end) params.set('date_to', advancedFilter.end);
      if (advancedFilter && advancedFilter.coordinator) params.set('coordinator', advancedFilter.coordinator);
      if (quickFilterCategory) params.set('category', quickFilterCategory);

      const url = `${API_URL}/api/requests/me?${params.toString()}`;
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Failed to fetch requests');

      // body.data is array of requests (controllers return { success, data, pagination })
      const data = body.data || [];
      setRequests(Array.isArray(data) ? data : []);
      // if server returned pagination, update UI page data (optional)
      // You can store pagination in state if needed (not implemented here)
    } catch (err: any) {
      console.error('Fetch requests error', err);
      setRequestsError(err.message || 'Failed to fetch requests');
      setErrorModalMessage(err.message || 'Failed to fetch requests');
      setErrorModalOpen(true);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    // load requests and also initialize the displayed user name/email for the topbar
    fetchRequests();
    // fetch published events for the calendar
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/events`);
        const body = await res.json();
        if (res.ok && Array.isArray(body.data)) {
          // map to calendar format used by CampaignCalendar
          const list = body.data.map((e: any) => ({
            Event_ID: e.Event_ID,
            Title: e.Title,
            Start_Date: e.Start_Date,
            Category: e.Category
          }));
          // setRequests already used for cards; keep approved events in a separate state
          // Store public events in React state for the calendar
          setPublicEvents(list);
        }
      } catch (e) {
        // ignore calendar load failures
      }
    })();
    try {
      const info = getUserInfo()
      try { debug('[Campaign] getUserInfo:', info) } catch (e) {}
      if (info?.displayName) setCurrentUserName(info.displayName)
      else if (info?.raw?.name) setCurrentUserName(info.raw.name)
      if (info?.email) setCurrentUserEmail(info.email)
    } catch (err) {
      // ignore malformed localStorage entry
    }
  }, []);

  // reset to first page whenever filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTab, quickFilterCategory, JSON.stringify(advancedFilter)]);

  // Re-fetch requests whenever filters or pagination change
  useEffect(() => {
    // fetchRequests is defined above in the component scope
    (async () => {
      try {
        await fetchRequests();
      } catch (e) {
        // errors handled inside fetchRequests
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedTab, searchQuery, quickFilterCategory, JSON.stringify(advancedFilter)]);
  
  // Sample event data
  const events = [
    {
      title: "Lifesavers Blood Drive",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Blood Drive",
      status: "Rejected" as const,
      location: "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Camarines Sur, Philippines",
      date: "Nov 12, 2025 08:00 - 05:00 AM"
    },
    {
      title: "Lifesavers Training",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Training",
      status: "Pending" as const,
      location: "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Camarines Sur, Philippines",
      date: "Nov 12, 2025 08:00 AM"
    },
    {
      title: "Lifesavers Advocacy",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Advocacy",
      status: "Approved" as const,
      location: "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Sur, Philippines",
      date: "Nov 12, 2025 08:00 AM"
    },
    {
      title: "Lifesavers Advocacy",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Advocacy",
      status: "Approved" as const,
      location: "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Sur, Philippines",
      date: "Nov 12, 2025 08:00 AM"
    },
    {
      title: "Lifesavers Advocacy",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Advocacy",
      status: "Approved" as const,
      location: "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Sur, Philippines",
      date: "Nov 12, 2025 08:00 AM"
    },
  ];
  
  // Handler for search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    debug("Searching for:", query);
  };
  
  // Handler for user profile click
  const handleUserClick = () => {
    debug("User profile clicked");
  };
  
  // Handler for tab changes
  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    debug("Tab changed to:", tab);
  };
  
  // Handler for export action
  const handleExport = () => {
    debug("Exporting data...");
  };
  
  // Handler for quick filter
  const handleQuickFilter = (filter?: { category?: string | undefined }) => {
    // called from toolbar dropdown with selected filters
    if (filter && Object.prototype.hasOwnProperty.call(filter, 'category')) {
      setQuickFilterCategory(filter.category);
    } else {
      // clear
      setQuickFilterCategory(undefined);
    }
  };
  
  // Handler for advanced filter
  const handleAdvancedFilter = (filter?: { start?: string; end?: string; coordinator?: string }) => {
    if (filter) setAdvancedFilter(filter);
    else setAdvancedFilter({});
  };
  
  // Handler for create event - maps modal data to backend payloads and posts
  const handleCreateEvent = async (eventType: string, data: any) => {
    try {
  const rawUser = localStorage.getItem("unite_user");
  const user = rawUser ? JSON.parse(rawUser) : null;
  const token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Normalize event payload to match backend expectation
      const eventPayload: any = {
        Event_Title: data.eventTitle || data.eventDescription || `${eventType} event`,
        Location: data.location || '',
        Start_Date: data.startTime || (data.date ? new Date(data.date).toISOString() : undefined),
        End_Date: data.endTime || undefined,
        // Include description when provided (frontend modals use eventDescription)
        Event_Description: data.eventDescription || data.Event_Description || data.description || undefined,
        Email: data.email || undefined,
        Phone_Number: data.contactNumber || undefined,
        categoryType: eventType === 'blood-drive' ? 'BloodDrive' : (eventType === 'training' ? 'Training' : 'Advocacy')
      };

      // Category-specific mappings
      if (eventPayload.categoryType === 'Training') {
        eventPayload.MaxParticipants = data.numberOfParticipants ? parseInt(data.numberOfParticipants, 10) : undefined;
        eventPayload.TrainingType = data.trainingType || undefined;
      } else if (eventPayload.categoryType === 'BloodDrive') {
        eventPayload.Target_Donation = data.goalCount ? parseInt(data.goalCount, 10) : undefined;
        eventPayload.VenueType = data.venueType || undefined;
      } else if (eventPayload.categoryType === 'Advocacy') {
          eventPayload.TargetAudience = data.audienceType || data.targetAudience || undefined;
          eventPayload.Topic = data.topic || undefined;
          // send expected audience size when provided from the advocacy modal
          eventPayload.ExpectedAudienceSize = data.numberOfParticipants ? parseInt(data.numberOfParticipants, 10) : undefined;
      }

      // If a coordinator was selected (admin or stakeholder flow), include it
      if (data.coordinator) {
        // For createEventRequest controller we need coordinatorId in body (coordinatorId param)
        eventPayload.MadeByCoordinatorID = data.coordinator;
      }

      // Decide endpoint based on user role. Use getUserInfo helper for robust detection.
      const info = getUserInfo();
      const roleStr = String(info.role || user?.staff_type || user?.role || '').toLowerCase();
      const isAdmin = !!(info.isAdmin || roleStr.includes('admin'));
      const isCoordinator = !!roleStr.includes('coordinator');

      if (isAdmin || isCoordinator) {
        // Admin/Coordinator -> immediate publish endpoint
        const creatorId = user?.Admin_ID || user?.Coordinator_ID || user?.id || user?.ID || null;
        const creatorRole = info.role || user?.staff_type || user?.role || (isAdmin ? 'Admin' : (isCoordinator ? 'Coordinator' : null));

        const body = {
          creatorId,
          creatorRole,
          ...eventPayload
        };

        const res = await fetch(`${API_URL}/api/events/direct`, { method: 'POST', headers, body: JSON.stringify(body) });
        const resp = await res.json();
        if (!res.ok) throw new Error(resp.message || 'Failed to create event');

        // refresh requests list to show the newly created event
        await fetchRequests();
        return resp;
      } else {
        // Stakeholder -> create request (needs coordinatorId)
        if (!data.coordinator) throw new Error('Coordinator is required for requests');
        const stakeholderId = user?.Stakeholder_ID || user?.StakeholderId || user?.id || null;
        const body = {
          coordinatorId: data.coordinator,
          MadeByStakeholderID: stakeholderId,
          ...eventPayload
        };

        const res = await fetch(`${API_URL}/api/requests`, { method: 'POST', headers, body: JSON.stringify(body) });
        const resp = await res.json();
        if (!res.ok) throw new Error(resp.message || 'Failed to create request');

        await fetchRequests();
        return resp;
      }
    } catch (err: any) {
      // Errors are already thrown with the API response message from lines 308 and 325
      // Re-throw the error so it can be caught by the toolbar handler and displayed in modal
      throw err;
    }
  };

  // Open view modal by fetching full request details from the API
  const handleOpenView = async (r: any) => {
    if (!r) return;
  // debug: log the incoming request object received from the card click
  debug('[Campaign] handleOpenView called with request (card-level):', r);
    const requestId = r.Request_ID || r.RequestId || r._id || r.RequestId;
    if (!requestId) {
      // fallback: if the request object is already enriched, open it
  debug('[Campaign] No explicit requestId found on card object, opening with provided object:', r);
      setViewRequest(r);
      setViewModalOpen(true);
      return;
    }

    setViewLoading(true);
    try {
  debug('[Campaign] fetching request details for id:', requestId);
      const token = localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/requests/${requestId}`, { headers });
      const body = await res.json();
  // debug: log raw response body from the API
  debug('[Campaign] GET /api/requests/%s response body:', requestId, body);
      if (!res.ok) throw new Error(body.message || 'Failed to fetch request details');

      // controller returns { success, data: request }
      const data = body.data || body.request || null;
  debug('[Campaign] parsed view request data:', data);
      setViewRequest(data || body);
      setViewModalOpen(true);
    } catch (err: any) {
      console.error('Failed to load request details', err);
      setErrorModalMessage(err?.message || 'Failed to load request details');
      setErrorModalOpen(true);
    } finally {
      setViewLoading(false);
    }
  };

  // Open edit modal: fetch full request details then open edit modal
  const handleOpenEdit = async (r: any) => {
    if (!r) return;
    const requestId = r.Request_ID || r.RequestId || r._id || r.RequestId;
    if (!requestId) {
      setEditRequest(r);
      setEditModalOpen(true);
      return;
    }

    try {
      setViewLoading(true);
      const token = localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/requests/${requestId}`, { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Failed to fetch request details');
      const data = body.data || body.request || null;
      setEditRequest(data || body);
      setEditModalOpen(true);
    } catch (err: any) {
      console.error('Failed to load request details for edit', err);
      setErrorModalMessage(err?.message || 'Failed to load request details');
      setErrorModalOpen(true);
    } finally {
      setViewLoading(false);
    }
  };

  // Handle reschedule action coming from EventCard
  const handleRescheduleEvent = async (reqObj: any, currentDate: string, rescheduledDateISO: string, note: string) => {
    if (!reqObj) return;
    const requestId = reqObj.Request_ID || reqObj.RequestId || reqObj._id || reqObj.RequestId;
    if (!requestId) {
      setErrorModalMessage('Unable to determine request id for reschedule');
      setErrorModalOpen(true);
      return;
    }

    try {
      const rawUser = localStorage.getItem('unite_user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      const token = localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body: any = {
        action: 'Rescheduled',
        rescheduledDate: rescheduledDateISO,
        note: note
      };

      // include admin/coordinator identity if available (server should derive from token ideally)
      if (user && user.id) body.adminId = user.id;
      if (user && user.staff_type) body.adminRole = user.staff_type;

      const res = await fetch(`${API_URL}/api/requests/${requestId}/admin-action`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const resp = await res.json();
      if (!res.ok) throw new Error(resp.message || 'Failed to reschedule request');

      // refresh requests list to reflect updated date/status
      await fetchRequests();
      return resp;
    } catch (err: any) {
      console.error('Reschedule error', err);
      setErrorModalMessage(err?.message || 'Failed to reschedule request');
      setErrorModalOpen(true);
      throw err;
    }
  };

  // Since filtering/pagination is moved server-side, `requests` is already filtered
  const filteredRequests = requests;

  // derive approved events for the calendar (only events with Approved status)
  // approved events are loaded from public API into React state by fetch effect above
  const approvedEvents = publicEvents || [];
  
  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Campaign</h1>
      </div>
  
      {/* Topbar Component */}
      <Topbar
        userName={currentUserName || "Bicol Medical Center"}
        userEmail={currentUserEmail || "bmc@gmail.com"}
        onSearch={handleSearch}
        onUserClick={handleUserClick}
      />
  
      {/* Campaign Toolbar Component */}
      <CampaignToolbar
        onExport={handleExport}
        onQuickFilter={handleQuickFilter}
        onAdvancedFilter={handleAdvancedFilter}
        onCreateEvent={handleCreateEvent}
        onTabChange={handleTabChange}
        defaultTab={selectedTab}
      />
  
      {/* Main Content Area */}
      <div className="px-6 py-6 flex gap-4">
        {/* Calendar Section */}
        <CampaignCalendar
          events={approvedEvents}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />

        {/* Event / Request Cards Section - Scrollable */}
        <div className="flex-1 h-[calc(106vh-300px)] pr-2 relative">
          {/* Scrollable content is nested so overlay can be absolutely positioned and centered
              relative to this wrapper (keeps overlay fixed in the visible viewport while
              the inner content scrolls). */}
          <div className="overflow-y-auto h-full">
            <div className="grid grid-cols-2 gap-4 h-full">
                {requestsError && <div className="col-span-2 text-sm text-danger">{requestsError}</div>}

                {/* Quick/Advanced filters are shown via toolbar dropdowns */}

            {(() => {
              const total = filteredRequests.length;
              const totalPages = Math.max(1, Math.ceil(total / pageSize));
              const startIndex = (currentPage - 1) * pageSize;
              const paginatedRequests = filteredRequests.slice(startIndex, startIndex + pageSize);

              return paginatedRequests.map((req, index) => {
              const event = req.event || {};
              const title = event.Event_Title || event.title || 'Untitled';
              // Requestee name: prefer coordinator staff name, else stakeholder id
              let requestee = 'Unknown';
              if (req.coordinator && req.coordinator.staff) {
                const s = req.coordinator.staff;
                requestee = `${s.First_Name || ''} ${s.Last_Name || ''}`.trim();
              } else if (req.MadeByStakeholderID || event.MadeByStakeholderID) {
                requestee = (req.MadeByStakeholderID || event.MadeByStakeholderID).toString();
              }

              const rawCategory = (event.Category || event.categoryType || event.category || 'Event');
              // Normalize backend category values to human-friendly labels
              const catKey = String(rawCategory || '').toLowerCase();
              let category = 'Event';
              if (catKey.includes('blood')) category = 'Blood Drive';
              else if (catKey.includes('training')) category = 'Training';
              else if (catKey.includes('advocacy')) category = 'Advocacy';
              else if (rawCategory && rawCategory !== 'Event') {
                // Fallback: title-case the rawCategory string
                category = String(rawCategory)
                  .replace(/([a-z])([A-Z])/g, '$1 $2')
                  .split(/[_\- ]+/)
                  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ');
              }
              // Map status to Approved/Pending/Rejected
              const statusRaw = event.Status || req.Status || 'Pending';
              const status = statusRaw.includes('Reject') ? 'Rejected' : (statusRaw.includes('Approved') ? 'Approved' : 'Pending');

              const location = event.Location || event.location || '';

              // Format date - prefer Start_Date and End_Date
              const start: Date | undefined = event.Start_Date ? new Date(event.Start_Date) : undefined;
              const end: Date | undefined = event.End_Date ? new Date(event.End_Date) : undefined;

              const formatDateRange = (s?: Date, e?: Date) => {
                if (!s) return '';
                const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
                const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
                const fmtDate = (d: Date) => new Intl.DateTimeFormat('en-US', dateOpts).format(d);
                const fmtTime = (d: Date) => d.toLocaleTimeString([], timeOpts);

                if (!e) return `${fmtDate(s)} ${fmtTime(s)}`;

                const sameDay = s.toDateString() === e.toDateString();
                if (sameDay) {
                  return `${fmtDate(s)} ${fmtTime(s)} - ${fmtTime(e)}`;
                }
                return `${fmtDate(s)} ${fmtTime(s)} - ${fmtDate(e)} ${fmtTime(e)}`;
              };

              const dateStr = start ? formatDateRange(start, end) : (event.date || '');

              // Compute district display: prefer coordinator District_Number/Name and convert number to ordinal (1 -> 1st District)
                const makeOrdinal = (n: number | string) => {
                const num = parseInt(String(n), 10);
                if (isNaN(num)) return String(n);
                const suffixes = ['th', 'st', 'nd', 'rd'];
                const v = num % 100;
                const suffix = (v >= 11 && v <= 13) ? 'th' : (suffixes[num % 10] || 'th');
                return `${num}${suffix}`;
              };

              let displayDistrict = '';
              if (req.coordinator && (req.coordinator.District_Number || req.coordinator.District_Name)) {
                const dn = req.coordinator.District_Number || req.coordinator.District_Name;
                // If district number looks numeric, convert to ordinal + ' District'
                const parsed = parseInt(String(dn).replace(/[^0-9]/g, ''), 10);
                if (!isNaN(parsed)) {
                  displayDistrict = `${makeOrdinal(parsed)} District`;
                } else if (typeof dn === 'string') {
                  displayDistrict = dn.includes('District') ? dn : `${dn} District`;
                } else {
                  displayDistrict = String(dn);
                }
              } else if (event.District || req.district) {
                displayDistrict = event.District || req.district || '';
              }

              return (
                <EventCard
                  key={index}
                  title={title}
                      organization={requestee}
                  organizationType={req.coordinator ? req.coordinator.District_Name || req.coordinator.District_Number || '' : ''}
                  district={displayDistrict}
                  category={category}
                  status={status as any}
                  location={location}
                  date={dateStr}
                  request={req}
                  onViewEvent={() => handleOpenView(req)}
                  onEditEvent={() => handleOpenEdit(req)}
                  onRescheduleEvent={(currentDate: string, newDateISO: string, note: string) => handleRescheduleEvent(req, currentDate, newDateISO, note)}
                />
              );
            });
          })()}
            </div>
          </div>

          {/* Overlay area positioned relative to wrapper. This keeps spinner / no-results
              centered in the visible viewport regardless of inner scroll position. */}
          {isLoadingRequests && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-20 pointer-events-none">
              <svg className="animate-spin h-12 w-12 text-default-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            </div>
          )}

          {!isLoadingRequests && requests.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="text-sm text-default-600">No request found</div>
            </div>
          )}
        </div>
      </div>
      {/* Error Modal for user-friendly messages */}
      <Modal isOpen={errorModalOpen} onClose={() => setErrorModalOpen(false)} size="md" placement="center">
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p className="text-sm text-default-600 mb-4">{errorModalMessage || 'An unexpected error occurred.'}</p>
          <div className="flex justify-end">
            <button className="px-3 py-1 border rounded mr-2" onClick={() => setErrorModalOpen(false)}>Close</button>
          </div>
        </div>
      </Modal>
      {/* Event View Modal (read-only) */}
      <EventViewModal isOpen={viewModalOpen} onClose={() => { setViewModalOpen(false); setViewRequest(null); }} request={viewRequest} />
  {/* Event Edit Modal */}
  <EditEventModal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); setEditRequest(null); }} request={editRequest} onSaved={async () => { await fetchRequests(); }} />
      </div>
    );
  }