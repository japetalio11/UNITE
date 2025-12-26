"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Ticket, Calendar as CalIcon, PersonPlanetEarth, Persons, Bell, Gear } from "@gravity-ui/icons";
import { Modal } from "@heroui/modal";

import { getUserInfo } from "../../../utils/getUserInfo";
import MobileNav from "@/components/tools/mobile-nav";

import Topbar from "@/components/layout/topbar";
import { debug } from "@/utils/devLogger";
import CampaignToolbar from "@/components/campaign/campaign-toolbar";
import CampaignCalendar from "@/components/campaign/campaign-calendar";
import EventCard from "@/components/campaign/event-card";
import EventViewModal from "@/components/campaign/event-view-modal";
import EditEventModal from "@/components/campaign/event-edit-modal";
// Notification UI handled by `MobileNav` for mobile

import { useLoading } from "@/components/ui/loading-overlay";
import { useLocations } from "../../../components/providers/locations-provider";

/**
 * Campaign Page Component
 * Main campaign management page with topbar, toolbar, and content area.
 */

export default function CampaignPage() {
  // Defer initializing selectedDate to after hydration to avoid any
  // server/client time differences during initial render.
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const { setIsLoading } = useLoading();

  const { locations, loading: locationsLoading, getDistrictsForProvince, getMunicipalitiesForDistrict, getAllProvinces, getAllMunicipalities, refreshAll: refreshLocations } = useLocations();

  useEffect(() => {
    if (!selectedDate) setSelectedDate(new Date());
  }, []);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    debug("Selected date:", date.toLocaleDateString());
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6; // show max 6 requests per page
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [quickFilter, setQuickFilter] = useState<{
    category?: string;
    startDate?: string;
    endDate?: string;
    province?: string;
    district?: string;
    municipality?: string;
  } | null>(null);
  const [advancedFilter, setAdvancedFilter] = useState<{
    start?: string;
    end?: string;
    title?: string;
    requester?: string;
    municipality?: string;
    coordinator?: string;
    stakeholder?: string;
  }>({});
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [totalRequestsCount, setTotalRequestsCount] = useState<number>(0);
  const [isServerPaged, setIsServerPaged] = useState<boolean>(false);
  const [requestCounts, setRequestCounts] = useState({
    all: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });
  const [publicEvents, setPublicEvents] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<any>(null);

  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);

  // Update provinces when locations data changes
  useEffect(() => {
    const provincesList = getAllProvinces();
    if (provincesList.length > 0) {
      setProvinces(provincesList);
    } else if (!locationsLoading && Object.keys(locations.provinces || {}).length === 0) {
      // If no provinces and not loading, try to refresh
      console.warn("[Campaign Page] No provinces found, attempting to refresh locations");
      refreshLocations();
    }
  }, [getAllProvinces, locations.provinces, locationsLoading, refreshLocations]);

  useEffect(() => {
    const municipalitiesList = getAllMunicipalities();
    setMunicipalities(municipalitiesList);
  }, [getAllMunicipalities, locations.municipalities]);

  const fetchDistricts = async (provinceId: number | string) => {
    const districtsForProvince = getDistrictsForProvince(provinceId.toString());
    setDistricts(districtsForProvince);
  };

  // Helper to parse a variety of date shapes (ISO string, ms timestamp,
  // and Mongo Extended JSON like { $date: { $numberLong: '...' } }).
  const parseDate = (v: any): Date | null => {
    if (!v && v !== 0) return null;
    try {
      if (typeof v === "string" || typeof v === "number") {
        const d = new Date(v);

        if (!isNaN(d.getTime())) return d;
      }
      if (typeof v === "object") {
        // handle { $date: { $numberLong: '...' } } or { $date: '2025-..' }
        if (v.$date) {
          const inner = v.$date.$numberLong || v.$date;
          const n = typeof inner === "string" ? Number(inner) : inner;
          const d = new Date(Number(n));

          if (!isNaN(d.getTime())) return d;
        }
        // handle { $numberLong: '...' }
        if (v.$numberLong) {
          const d = new Date(Number(v.$numberLong));

          if (!isNaN(d.getTime())) return d;
        }
        // handle plain number-like objects
        const maybeNum = Number(v);

        if (!isNaN(maybeNum)) {
          const d = new Date(maybeNum);

          if (!isNaN(d.getTime())) return d;
        }
      }
    } catch (e) {
      // fall through
    }

    return null;
  };

  const mapTabToStatusParam = (tab: string) => {
    if (!tab || tab === "all") return undefined;
    // Normalize to lowercase for case-insensitive matching
    const normalizedTab = tab.toLowerCase().trim();
    if (normalizedTab === "approved") return "approved";
    if (normalizedTab === "pending") return "pending-review";
    if (normalizedTab === "rejected") return "rejected";

    return normalizedTab;
  };

  // Extracted fetchRequests so we can reuse after creating events. Relies on backend filtering instead of client-side filtering.
  const fetchRequests = async () => {
    setIsLoadingRequests(true);
    setRequestsError("");

    try {
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Build query params for server-side filtering
      // New API uses skip/limit instead of page/limit
      const params = new URLSearchParams();
      const skip = (currentPage - 1) * pageSize;
      params.set("skip", String(skip));
      params.set("limit", String(pageSize));

      const statusParam = mapTabToStatusParam(selectedTab);
      if (statusParam) params.set("status", statusParam);

      // Note: New API may not support all these filters yet, but we'll pass them for backward compatibility
      if (searchQuery && searchQuery.trim())
        params.set("search", searchQuery.trim());

      if (quickFilter?.category && quickFilter.category !== "all")
        params.set("category", quickFilter.category);
      if (quickFilter?.startDate) params.set("date_from", quickFilter.startDate);
      if (quickFilter?.endDate) params.set("date_to", quickFilter.endDate);
      if (quickFilter?.province) params.set("province", String(quickFilter.province));
      if (quickFilter?.district)
        params.set("district", String(quickFilter.district));
      if (quickFilter?.municipality)
        params.set("municipalityId", String(quickFilter.municipality));

      if (advancedFilter.title)
        params.set("title", String(advancedFilter.title));
      if (advancedFilter.coordinator)
        params.set("coordinator", String(advancedFilter.coordinator));
      if (advancedFilter.stakeholder)
        params.set("stakeholder", String(advancedFilter.stakeholder));
      if (advancedFilter.start)
        params.set("date_from", String(advancedFilter.start));
      if (advancedFilter.end)
        params.set("date_to", String(advancedFilter.end));

      // Use new unified endpoint
      const url = `${API_URL}/api/event-requests?${params.toString()}`;
      // Request fresh data (avoid cached 304 responses) so client-side filters
      // are applied to a current payload.
      const res = await fetch(url, { headers, cache: "no-store" });
      const body = await res.json();

      if (!res.ok) throw new Error(body.message || "Failed to fetch requests");

      // New response format: { success, data: { requests, count, statusCounts } }
      const responseData = body.data || {};
      const list = Array.isArray(responseData.requests) ? responseData.requests : 
                   Array.isArray(body.data) ? body.data : 
                   Array.isArray(body) ? body : [];
      const totalCount = responseData.count ?? list.length;

      setRequests(list);
      setTotalRequestsCount(totalCount);
      setIsServerPaged(totalCount > list.length);
      
      // Use server-side status counts if available, otherwise calculate from current page
      if (responseData.statusCounts) {
        setRequestCounts({
          all: responseData.statusCounts.all ?? totalCount,
          approved: responseData.statusCounts.approved ?? 0,
          pending: responseData.statusCounts.pending ?? 0,
          rejected: responseData.statusCounts.rejected ?? 0,
        });
      } else {
        // Fallback: calculate from current page (less accurate but better than nothing)
        const statusCounts = {
          approved: list.filter((r: any) => {
            const status = r.status || r.Status || "";
            return status.toLowerCase().includes("approv") || status.toLowerCase().includes("complete");
          }).length,
          pending: list.filter((r: any) => {
            const status = r.status || r.Status || "";
            return status.toLowerCase().includes("pending") || status.toLowerCase().includes("review");
          }).length,
          rejected: list.filter((r: any) => {
            const status = r.status || r.Status || "";
            return status.toLowerCase().includes("reject");
          }).length,
        };

        setRequestCounts({
          all: totalCount,
          approved: statusCounts.approved,
          pending: statusCounts.pending,
          rejected: statusCounts.rejected,
        });
      }
    } catch (err: any) {
      console.error("Fetch requests error", err);
      setRequestsError(err.message || "Failed to fetch requests");
      setErrorModalMessage(err.message || "Failed to fetch requests");
      setErrorModalOpen(true);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    // Check if we should show loading overlay from login
    if (
      typeof window !== "undefined" &&
      sessionStorage.getItem("showLoadingOverlay") === "true"
    ) {
      sessionStorage.removeItem("showLoadingOverlay");
      setIsLoading(true);
    }

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
            Category: e.Category,
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
      const raw = localStorage.getItem("unite_user");

      if (raw) {
        const u = JSON.parse(raw);
        const first =
          u.First_Name ||
          u.First_Name ||
          u.first_name ||
          u.FirstName ||
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

    // Mark initial load as done after setting states
    setInitialLoadDone(true);
  }, []);

  // reset to first page whenever filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedTab,
    JSON.stringify(quickFilter),
    JSON.stringify(advancedFilter),
  ]);

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
  }, [
    currentPage,
    selectedTab,
    searchQuery,
    JSON.stringify(quickFilter),
    JSON.stringify(advancedFilter),
  ]);

  // Listen for cross-component request updates and refresh the list
  useEffect(() => {
    const handler = (evt: any) => {
      try {
        debug(
          "[Campaign] unite:requests-changed received, refreshing requests",
          evt?.detail,
        );
      } catch (e) {}
      // Re-fetch current list to reflect updates made elsewhere
      try {
        fetchRequests();
      } catch (e) {}
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "unite:requests-changed",
        handler as EventListener,
      );
    }

    return () => {
      try {
        window.removeEventListener(
          "unite:requests-changed",
          handler as EventListener,
        );
      } catch (e) {}
    };
    // Intentionally run once on mount to register the listener
  }, []);

  // Hide global loading overlay after initial data loads
  useEffect(() => {
    if (initialLoadDone) {
      setIsLoading(false);
    }
  }, [initialLoadDone, setIsLoading]);

  

  // Sample event data
  const events = [
    {
      title: "Lifesavers Blood Drive",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Blood Drive",
      status: "Rejected" as const,
      location:
        "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Camarines Sur, Philippines",
      date: "Nov 12, 2025 08:00 - 05:00 AM",
    },
    {
      title: "Lifesavers Training",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Training",
      status: "Pending" as const,
      location:
        "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Camarines Sur, Philippines",
      date: "Nov 12, 2025 08:00 AM",
    },
    {
      title: "Lifesavers Advocacy",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Advocacy",
      status: "Approved" as const,
      location:
        "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Sur, Philippines",
      date: "Nov 12, 2025 08:00 AM",
    },
    {
      title: "Lifesavers Advocacy",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Advocacy",
      status: "Approved" as const,
      location:
        "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Sur, Philippines",
      date: "Nov 12, 2025 08:00 AM",
    },
    {
      title: "Lifesavers Advocacy",
      organization: "Local Government Unit",
      organizationType: "Local Government Unit",
      district: "1st District",
      category: "Advocacy",
      status: "Approved" as const,
      location:
        "Ateneo Avenue, Bagumbayan Sur, Naga City, 4400 Sur, Philippines",
      date: "Nov 12, 2025 08:00 AM",
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
  const handleQuickFilter = (filter: any) => {
    setQuickFilter(filter);
  };

  // Handler for advanced filter (expects { start?, end?, title?, coordinator?, stakeholder? })
  const handleAdvancedFilter = (filter?: {
    start?: string;
    end?: string;
    title?: string;
    coordinator?: string;
    stakeholder?: string;
  }) => {
    if (filter) setAdvancedFilter(filter);
    else setAdvancedFilter({});
  };

  // Handler for create event - maps modal data to backend payloads and posts
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
        Category:
          eventType === "blood-drive"
            ? "BloodDrive"
            : eventType === "training"
              ? "Training"
              : "Advocacy",
      };

      // Category-specific mappings
      if (eventPayload.Category === "Training") {
        eventPayload.MaxParticipants = data.numberOfParticipants
          ? parseInt(data.numberOfParticipants, 10)
          : undefined;
        eventPayload.TrainingType = data.trainingType || undefined;
      } else if (eventPayload.Category === "BloodDrive") {
        eventPayload.Target_Donation = data.goalCount
          ? parseInt(data.goalCount, 10)
          : undefined;
        eventPayload.VenueType = data.venueType || undefined;
      } else if (eventPayload.Category === "Advocacy") {
        eventPayload.TargetAudience =
          data.audienceType || data.targetAudience || undefined;
        eventPayload.Topic = data.topic || undefined;
        // send expected audience size when provided from the advocacy modal
        eventPayload.ExpectedAudienceSize = data.numberOfParticipants
          ? parseInt(data.numberOfParticipants, 10)
          : undefined;
      }

      // If a coordinator was selected, include it for request assignment
      if (data.coordinator) {
        eventPayload.coordinatorId = data.coordinator;
      }

      // If a stakeholder was selected, include it so server can assign and notify accordingly
      if (data.stakeholder) {
        eventPayload.stakeholderId = data.stakeholder;
      }

      // Check user permissions to decide if we should create a direct event or a request
      // Users with event.create permission can create direct events
      // Others should create requests that go through approval workflow
      const info = getUserInfo();
      const userAuthority = user?.authority || info.authority || 20;
      const isSystemAdmin = userAuthority >= 80;

      // For system admins or users creating with coordinator assignment, try direct event creation
      // Otherwise, create a request that goes through approval workflow
      if (isSystemAdmin && !data.coordinator) {
        // System admin creating direct event (no coordinator needed)
        const res = await fetch(`${API_URL}/api/events`, {
          method: "POST",
          headers,
          body: JSON.stringify(eventPayload),
        });
        const resp = await res.json();

        if (!res.ok) throw new Error(resp.message || "Failed to create event");

        // refresh requests list to show the newly created event
        await fetchRequests();

        return resp;
      } else {
        // Create request (goes through approval workflow)
        // Coordinator assignment is required for stakeholders, optional for others
        if (!data.coordinator && userAuthority < 60) {
          throw new Error("Coordinator is required for requests");
        }

        const res = await fetch(`${API_URL}/api/event-requests`, {
          method: "POST",
          headers,
          body: JSON.stringify(eventPayload),
        });
        const resp = await res.json();

        if (!res.ok)
          throw new Error(resp.message || "Failed to create request");

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
    debug("[Campaign] handleOpenView called with request (card-level):", r);
    const requestId = r.Request_ID || r.RequestId || r._id || r.RequestId;

    if (!requestId) {
      // fallback: if the request object is already enriched, open it
      debug(
        "[Campaign] No explicit requestId found on card object, opening with provided object:",
        r,
      );
      setViewRequest(r);
      setViewModalOpen(true);

      return;
    }

    setViewLoading(true);
    try {
      debug("[Campaign] fetching request details for id:", requestId);
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/event-requests/${requestId}`, {
        headers,
      });
      const body = await res.json();

      // debug: log raw response body from the API
      debug("[Campaign] GET /api/event-requests/%s response body:", requestId, body);
      if (!res.ok)
        throw new Error(body.message || "Failed to fetch request details");

      // New API returns { success, data: { request } }
      const data = body.data?.request || body.data || body.request || null;

      debug("[Campaign] parsed view request data:", data);
      setViewRequest(data || body);
      setViewModalOpen(true);
    } catch (err: any) {
      console.error("Failed to load request details", err);
      setErrorModalMessage(err?.message || "Failed to load request details");
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
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/event-requests/${requestId}`, {
        headers,
      });
      const body = await res.json();

      if (!res.ok)
        throw new Error(body.message || "Failed to fetch request details");
      // New API returns { success, data: { request } }
      const data = body.data?.request || body.data || body.request || null;

      setEditRequest(data || body);
      setEditModalOpen(true);
    } catch (err: any) {
      console.error("Failed to load request details for edit", err);
      setErrorModalMessage(err?.message || "Failed to load request details");
      setErrorModalOpen(true);
    } finally {
      setViewLoading(false);
    }
  };

  // Handle reschedule action coming from EventCard
  const handleRescheduleEvent = async (
    reqObj: any,
    currentDate: string,
    rescheduledDateISO: string,
    note: string,
  ) => {
    console.log("[CampaignPage] handleRescheduleEvent called with:", {
      reqObj,
      currentDate,
      rescheduledDateISO,
      note,
    });

    if (!reqObj) {
      console.error("[CampaignPage] handleRescheduleEvent: reqObj is null");
      return;
    }

    const requestId =
      reqObj.Request_ID || reqObj.RequestId || reqObj._id || reqObj.requestId;

    console.log("[CampaignPage] Resolved requestId:", requestId);

    if (!requestId) {
      console.error("[CampaignPage] Unable to determine request id for reschedule");
      setErrorModalMessage("Unable to determine request id for reschedule");
      setErrorModalOpen(true);
      return;
    }

    try {
      const rawUser = localStorage.getItem("unite_user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      const body: any = {
        action: "reschedule",
        proposedDate: rescheduledDateISO,
        note: note,
      };

      console.log("[CampaignPage] Sending reschedule request:", {
        url: `${API_URL}/api/event-requests/${requestId}/actions`,
        body,
        headers: { ...headers, Authorization: token ? "Bearer ***" : undefined },
      });

      const res = await fetch(
        `${API_URL}/api/event-requests/${requestId}/actions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        },
      );

      console.log("[CampaignPage] Reschedule response status:", res.status, res.statusText);

      const resp = await res.json();
      console.log("[CampaignPage] Reschedule response body:", resp);

      if (!res.ok) {
        const errorMsg = resp.message || resp.errors?.join(", ") || "Failed to reschedule request";
        console.error("[CampaignPage] Reschedule failed:", errorMsg, resp);
        throw new Error(errorMsg);
      }

      console.log("[CampaignPage] Reschedule succeeded, refreshing requests list");
      
      // refresh requests list to reflect updated date/status
      await fetchRequests();

      console.log("[CampaignPage] Requests list refreshed");

      return resp;
    } catch (err: any) {
      console.error("[CampaignPage] Reschedule error caught:", err);
      const errorMessage = err?.message || err?.errors?.join(", ") || "Failed to reschedule request";
      console.error("[CampaignPage] Error message:", errorMessage);
      setErrorModalMessage(errorMessage);
      setErrorModalOpen(true);
      throw err;
    }
  };

  // Handle cancel event action coming from EventCard
  const handleCancelEvent = async (reqObj: any) => {
    if (!reqObj) return;
    const requestId =
      reqObj.Request_ID || reqObj.RequestId || reqObj._id || reqObj.requestId;

    if (!requestId) {
      setErrorModalMessage("Unable to determine request id for cancellation");
      setErrorModalOpen(true);

      return;
    }

    try {
      const rawUser = localStorage.getItem("unite_user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Cancel request - no need for coordinator ID, backend validates permissions
      const res = await fetch(`${API_URL}/api/event-requests/${requestId}`, {
        method: "DELETE",
        headers,
      });
      const resp = await res.json();

      if (!res.ok) throw new Error(resp.message || "Failed to cancel request");

      // refresh requests list to reflect cancellation
      await fetchRequests();

      return resp;
    } catch (err: any) {
      console.error("Cancel error", err);
      setErrorModalMessage(err?.message || "Failed to cancel request");
      setErrorModalOpen(true);
      throw err;
    }
  };

  // Normalize status for a request and filter client-side to ensure tab
  // selection reliably matches regardless of backend inconsistencies.
  // Normalize status, preferring the event-level Status field when present.
  // Many backend shapes place the canonical status on `event.Status` so rely on
  // that first to make tab filtering deterministic.
  const normalizeStatus = (r: any) => {
    try {
      const ev = r.event || {};
      const evStatusRaw = ev.Status || ev.status || "";
      const evStatus = String(evStatusRaw || "").toLowerCase();

      if (evStatus) {
        if (evStatus.includes("reject")) return "Rejected";
        if (
          evStatus.includes("approve") ||
          evStatus.includes("complete") ||
          evStatus.includes("completed")
        )
          return "Approved";
        if (
          evStatus.includes("pending") ||
          evStatus.includes("waiting") ||
          evStatus.includes("awaiting")
        )
          return "Pending";
        if (evStatus.includes("cancel")) return "Cancelled";
        // If event.Status exists but is an unfamiliar token, map common aliases
        if (evStatus === "completed" || evStatus === "done") return "Approved";
      }
    } catch (e) {
      // ignore and fall through to other fields
    }

    // Fallback: inspect request-level fields when event.Status is absent
    const candidates: string[] = [];

    try {
      if (r.Status) candidates.push(String(r.Status));
      if (r.status) candidates.push(String(r.status));
      if (r.AdminAction) candidates.push(String(r.AdminAction));
      if (r.CoordinatorFinalAction)
        candidates.push(String(r.CoordinatorFinalAction));
    } catch (e) {}
    const joined = candidates.join(" ").toLowerCase();

    if (joined.includes("reject")) return "Rejected";
    if (
      joined.includes("approve") ||
      joined.includes("complete") ||
      joined.includes("completed")
    )
      return "Approved";
    if (
      joined.includes("pending") ||
      joined.includes("waiting") ||
      joined.includes("awaiting")
    )
      return "Pending";
    if (joined.includes("cancel")) return "Cancelled";

    return "Pending";
  };

  const filteredRequests = requests;

  // Client-side pagination calculations
  // When server returns paged results, use server's total count; otherwise
  // base totals on the client-filtered list.
  const totalRequests = isServerPaged
    ? totalRequestsCount
    : filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalRequests / pageSize));
  const paginatedRequests = useMemo(() => {
    if (isServerPaged) return filteredRequests; // server provided a page (we still apply the client filter to be safe)
    const startIndex = (currentPage - 1) * pageSize;

    return filteredRequests.slice(startIndex, startIndex + pageSize);
  }, [filteredRequests, currentPage, pageSize, isServerPaged]);

  // Developer overlay removed in production

  // derive approved events for the calendar (only events with Approved status)
  // approved events are loaded from public API into React state by fetch effect above
  const approvedEvents = publicEvents || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Campaign</h1>
          <MobileNav currentUserName={currentUserName} currentUserEmail={currentUserEmail} />
      </div>

      {/* Topbar Component */}
      <Topbar
        userEmail={currentUserEmail || "bmc@gmail.com"}
        userName={currentUserName || "Bicol Medical Center"}
        onSearch={handleSearch}
        onUserClick={handleUserClick}
      />

      {/* Campaign Toolbar Component */}
      <CampaignToolbar
        counts={requestCounts}
        currentPage={currentPage}
        defaultTab={selectedTab}
        onAdvancedFilter={handleAdvancedFilter}
        onCreateEvent={handleCreateEvent}
        onExport={handleExport}
        onPageChange={setCurrentPage}
        districts={districts}
        provinces={provinces}
        municipalities={municipalities}
        onDistrictFetch={fetchDistricts}
        onQuickFilter={handleQuickFilter}
        onTabChange={handleTabChange}
        totalPages={totalPages}
        totalRequests={totalRequests}
      />

      {/* Main Content Area */}
      <div className="px-6 py-6 flex flex-col md:flex-row gap-4">
        {/* Calendar Section (on mobile appears after cards) */}
        <div className="md:order-1 order-2 md:w-[480px] w-full">
          <CampaignCalendar
            events={approvedEvents}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>

        {/* Event / Request Cards Section - Scrollable (prioritized on mobile) */}
        <div className="flex-1 pr-2 relative md:order-2 order-1 h-auto md:h-[calc(106vh-300px)]">
          {/* Scrollable content is nested so overlay can be absolutely positioned and centered
              relative to this wrapper (keeps overlay fixed in the visible viewport while
              the inner content scrolls). */}
          <div className="overflow-y-auto h-full pb-12">
            <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
              {requestsError && (
                <div className="col-span-full text-sm text-danger">
                  {requestsError}
                </div>
              )}

              {/* Quick/Advanced filters are shown via toolbar dropdowns */}

              {paginatedRequests.map((req, index) => {
                // New API returns event fields directly on request, not nested in event object
                const event = req.event || {};
                const title = req.Event_Title || event.Event_Title || event.title || "Untitled";
                // Requestee name: check who actually created the request (from requester field)
                let requestee = req.requester?.name || req.createdByName || "Unknown";
                let creatorDistrict = null;

                // If creatorDistrict is still not set, try to get district based on stakeholder/coordinator presence
                if (!creatorDistrict) {
                  if (
                    req.stakeholder &&
                    (req.stakeholder.District_Number ||
                      req.stakeholder.District_Name)
                  ) {
                    creatorDistrict =
                      req.stakeholder.District_Number ||
                      req.stakeholder.District_Name;
                  } else if (
                    req.coordinator &&
                    (req.coordinator.District_Number ||
                      req.coordinator.District_Name)
                  ) {
                    creatorDistrict =
                      req.coordinator.District_Number ||
                      req.coordinator.District_Name;
                  }
                }

                const rawCategory =
                  req.Category ||
                  req.category ||
                  event.Category ||
                  event.categoryType ||
                  event.category ||
                  "Event";
                // Normalize backend category values to human-friendly labels
                const catKey = String(rawCategory || "").toLowerCase();
                let category = "Event";

                if (catKey.includes("blood")) category = "Blood Drive";
                else if (catKey.includes("training")) category = "Training";
                else if (catKey.includes("advocacy")) category = "Advocacy";
                else if (rawCategory && rawCategory !== "Event") {
                  // Fallback: title-case the rawCategory string
                  category = String(rawCategory)
                    .replace(/([a-z])([A-Z])/g, "$1 $2")
                    .split(/[_\- ]+/)
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ");
                }
                // Map status to Approved/Pending/Rejected/Cancelled
                // New API uses 'status' field (lowercase), old API used 'Status' (uppercase)
                const statusRaw = req.status || req.Status || event.Status || event.status || "pending-review";
                const status = statusRaw.includes("reject") || statusRaw.includes("Reject")
                  ? "Rejected"
                  : statusRaw.includes("approv") || statusRaw.includes("Approv") ||
                      statusRaw.includes("complete") || statusRaw.includes("Complete") ||
                      statusRaw.includes("completed") || statusRaw.includes("Completed")
                    ? "Approved"
                    : statusRaw.includes("cancel") || statusRaw.includes("Cancel") ||
                        statusRaw.includes("cancelled") || statusRaw.includes("Cancelled")
                      ? "Cancelled"
                      : "Pending";

                const location = req.Location || event.Location || event.location || "";

                // Format date - prefer Date or Start_Date from request, fallback to event
                const start: Date | undefined = req.Date
                  ? new Date(req.Date)
                  : req.Start_Date
                    ? new Date(req.Start_Date)
                    : event.Start_Date
                      ? new Date(event.Start_Date)
                      : undefined;
                const end: Date | undefined = req.End_Date
                  ? new Date(req.End_Date)
                  : event.End_Date
                    ? new Date(event.End_Date)
                    : undefined;

                const formatDateRange = (s?: Date, e?: Date) => {
                  if (!s) return "";
                  const dateOpts: Intl.DateTimeFormatOptions = {
                    month: "short",
                    day: "numeric",
                  };
                  const timeOpts: Intl.DateTimeFormatOptions = {
                    hour: "numeric",
                    minute: "2-digit",
                  };
                  const fmtDate = (d: Date) =>
                    new Intl.DateTimeFormat("en-US", dateOpts).format(d);
                  const fmtTime = (d: Date) =>
                    d.toLocaleTimeString([], timeOpts);

                  if (!e) return `${fmtDate(s)} ${fmtTime(s)}`;

                  const sameDay = s.toDateString() === e.toDateString();

                  if (sameDay) {
                    return `${fmtDate(s)} ${fmtTime(s)} - ${fmtTime(e)}`;
                  }

                  return `${fmtDate(s)} ${fmtTime(s)} - ${fmtDate(e)} ${fmtTime(e)}`;
                };

                const dateStr = start
                  ? formatDateRange(start, end)
                  : req.Date
                    ? new Date(req.Date).toLocaleString()
                    : event.date || "";

                // Compute district display: use the creator's district (stakeholder or coordinator)
                const makeOrdinal = (n: number | string) => {
                  const num = parseInt(String(n), 10);

                  if (isNaN(num)) return String(n);
                  const suffixes = ["th", "st", "nd", "rd"];
                  const v = num % 100;
                  const suffix =
                    v >= 11 && v <= 13 ? "th" : suffixes[num % 10] || "th";

                  return `${num}${suffix}`;
                };

                let displayDistrict = "";

                // Use creator's district first (now properly set above)
                if (creatorDistrict) {
                  const dn = creatorDistrict;
                  // If district number looks numeric, convert to ordinal + ' District'
                  const parsed = parseInt(
                    String(dn).replace(/[^0-9]/g, ""),
                    10,
                  );

                  if (!isNaN(parsed)) {
                    displayDistrict = `${makeOrdinal(parsed)} District`;
                  } else if (typeof dn === "string") {
                    displayDistrict = dn.includes("District")
                      ? dn
                      : `${dn} District`;
                  } else {
                    displayDistrict = String(dn);
                  }
                } else if (req.district) {
                  // district is an ObjectId reference, we'll need to resolve it via locations provider
                  displayDistrict = req.district || "";
                } else if (event.District) {
                  displayDistrict = event.District || "";
                }

                return (
                  <EventCard
                    key={index}
                    category={category}
                    date={dateStr}
                    district={displayDistrict}
                    location={location}
                    organization={requestee}
                    organizationType={
                      req.coordinator
                        ? req.coordinator.District_Name ||
                          req.coordinator.District_Number ||
                          ""
                        : ""
                    }
                    request={req}
                    status={status as any}
                    title={title}
                    onCancelEvent={() => handleCancelEvent(req)}
                    onEditEvent={() => handleOpenEdit(req)}
                    onRescheduleEvent={(
                      currentDate: string,
                      newDateISO: string,
                      note: string,
                    ) =>
                      handleRescheduleEvent(req, currentDate, newDateISO, note)
                    }
                    onViewEvent={() => handleOpenView(req)}
                  />
                );
              })}
            </div>
            {/* Pagination controls (render after cards inside the scroll area) */}
          </div>

          {/* Overlay area positioned relative to wrapper. This keeps spinner / no-results
              centered in the visible viewport regardless of inner scroll position. */}
          {isLoadingRequests && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-20 pointer-events-none">
              <svg
                className="animate-spin h-12 w-12 text-default-600"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  fill="currentColor"
                />
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
      <Modal
        isOpen={errorModalOpen}
        placement="center"
        size="md"
        onClose={() => setErrorModalOpen(false)}
      >
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p className="text-sm text-default-600 mb-4">
            {errorModalMessage || "An unexpected error occurred."}
          </p>
          <div className="flex justify-end">
            <button
              className="px-3 py-1 border rounded mr-2"
              onClick={() => setErrorModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
      {/* Event View Modal (read-only) */}
      <EventViewModal
        isOpen={viewModalOpen}
        request={viewRequest}
        onClose={() => {
          setViewModalOpen(false);
          setViewRequest(null);
        }}
      />
      {/* Event Edit Modal */}
      <EditEventModal
        isOpen={editModalOpen}
        request={editRequest}
        onClose={() => {
          setEditModalOpen(false);
          setEditRequest(null);
        }}
        onSaved={async () => {
          await fetchRequests();
        }}
      />

      {/* Notifications Modal (mobile bell) */}
      {/* Mobile notification modal moved into `MobileNav` component */}

      
    </div>
  );
}
