"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Ticket, Calendar as CalIcon, PersonPlanetEarth, Persons, Bell, Gear } from "@gravity-ui/icons";
import { Modal } from "@heroui/modal";
import { Spinner } from "@heroui/spinner";

import { getUserInfo } from "../../../utils/getUserInfo";
import { useCurrentUser } from "@/hooks/useCurrentUser";
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
import { fetchWithRetry, cancelRequests } from "@/utils/fetchWithRetry";
import { getCachedResponse, cacheResponse, invalidateCache, DEFAULT_TTL } from "@/utils/requestCache";

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
  
  // Fetch current user from API
  const { user: currentUser } = useCurrentUser();
  
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const isRefreshingRef = useRef(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const hasRefreshedRef = useRef(false);

  // Update provinces when locations data changes
  // Only depend on the actual data, not the callbacks (which are stable but change reference)
  useEffect(() => {
    const provincesList = Object.values(locations.provinces || {});
    // Ensure provinces have _id and name fields
    const normalizedProvinces = provincesList
      .filter(p => p && p._id && p.name)
      .map(p => ({
        _id: String(p._id),
        name: String(p.name),
        ...p
      }));
    
    if (normalizedProvinces.length > 0) {
      setProvinces(normalizedProvinces);
      hasRefreshedRef.current = false; // Reset when we have data
    }
    // Remove auto-refresh logic - trust LocationsProvider to handle loading
    // The provider will fetch on mount and refresh every 30 minutes
  }, [locations.provinces]);

  // Municipalities are fetched dynamically when district is selected, not from global cache
  // This useEffect is kept for backward compatibility but municipalities should be fetched via API

  const fetchDistricts = async (provinceId: number | string) => {
    if (!provinceId) {
      setDistricts([]);
      return;
    }

    try {
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Fetch districts from API for the selected province
      const res = await fetch(`${API_URL}/api/locations/provinces/${provinceId}/districts`, {
        headers,
        credentials: "include",
      });
      const body = await res.json();

      if (res.ok && body.data) {
        const districtsList = Array.isArray(body.data) ? body.data : [];
        setDistricts(districtsList);
      } else {
        // Fallback: use provider's cached districts
        const districtsForProvince = getDistrictsForProvince(provinceId.toString());
        setDistricts(districtsForProvince);
      }
    } catch (err) {
      console.error("Error fetching districts:", err);
      // Fallback: use provider's cached districts
      const districtsForProvince = getDistrictsForProvince(provinceId.toString());
      setDistricts(districtsForProvince);
    }
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
    // Backend expects "pending" (not "pending-review") to map to status group
    // The backend's _mapStatusFilterToStatusGroup maps "pending" to [PENDING_REVIEW, REVIEW_RESCHEDULED]
    if (normalizedTab === "approved") return "approved";
    if (normalizedTab === "pending") return "pending";
    if (normalizedTab === "rejected") return "rejected";

    return normalizedTab;
  };

  // Note: fetchGlobalCounts removed - counts are now included in fetchRequests response

  // Optimized fetchRequests with caching, retry, and deduplication
  const fetchRequests = async (): Promise<void> => {
    setIsLoadingRequests(true);
    setRequestsError("");

    try {
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Build query params for server-side filtering
      const params = new URLSearchParams();
      const skip = (currentPage - 1) * pageSize;
      params.set("skip", String(skip));
      params.set("limit", String(pageSize));

      const statusParam = mapTabToStatusParam(selectedTab);
      if (statusParam) {
        params.set("status", statusParam);
        debug("[Campaign] Fetching requests with status filter:", statusParam, "for tab:", selectedTab);
      } else {
        debug("[Campaign] Fetching all requests (no status filter)");
      }

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

      const url = `${API_URL}/api/event-requests?${params.toString()}`;
      const fetchOptions: RequestInit = { 
        headers, 
        cache: "no-store"
      };

      // Check cache first - show cached data immediately if available
      const cachedData = getCachedResponse(url, fetchOptions);
      if (cachedData) {
        debug("[Campaign] Using cached response");
        const responseData = cachedData.data || {};
        const list = Array.isArray(responseData.requests) ? responseData.requests : [];
        const totalCount = responseData.count ?? list.length;
        
        setRequests(list);
        setTotalRequestsCount(totalCount);
        setIsServerPaged(totalCount > list.length);
        setRequestsError("");
        
        if (responseData.statusCounts) {
          setRequestCounts({
            all: responseData.statusCounts.all ?? 0,
            approved: responseData.statusCounts.approved ?? 0,
            pending: responseData.statusCounts.pending ?? 0,
            rejected: responseData.statusCounts.rejected ?? 0,
          });
        }
        
        // Continue to fetch fresh data in background (don't set loading to false yet)
      }

      // Fetch with retry and exponential backoff
      const res = await fetchWithRetry(url, fetchOptions, {
        maxRetries: 3,
        timeout: 30000, // 30 seconds
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const errorMsg = body.message || `Failed to fetch requests (${res.status} ${res.statusText})`;
        throw new Error(errorMsg);
      }

      const body = await res.json().catch((parseError) => {
        console.error("[Campaign] Failed to parse response JSON:", parseError);
        throw new Error("Invalid response from server");
      });

      // Cache the response
      cacheResponse(url, body, fetchOptions, DEFAULT_TTL.list);

      // Process response
      const responseData = body.data || {};
      const list = Array.isArray(responseData.requests) ? responseData.requests : 
                   Array.isArray(body.data) ? body.data : 
                   Array.isArray(body) ? body : [];
      const totalCount = responseData.count ?? list.length;

      debug("[Campaign] Fetched requests:", {
        tab: selectedTab,
        statusParam,
        count: list.length,
        totalCount,
        firstItemStatus: list[0]?.status || list[0]?.Status || "N/A"
      });

      setRequests(list);
      setTotalRequestsCount(totalCount);
      setIsServerPaged(totalCount > list.length);
      setRequestsError("");

      if (responseData.statusCounts) {
        setRequestCounts({
          all: responseData.statusCounts.all ?? 0,
          approved: responseData.statusCounts.approved ?? 0,
          pending: responseData.statusCounts.pending ?? 0,
          rejected: responseData.statusCounts.rejected ?? 0,
        });
      }
    } catch (err: any) {
      // Extract error message properly
      let errorMessage = "Failed to fetch requests";
      
      if (err) {
        if (typeof err === "string") {
          errorMessage = err;
        } else if (err instanceof Error) {
          errorMessage = err.message || errorMessage;
        } else if (err.message) {
          errorMessage = String(err.message);
        } else {
          errorMessage = String(err);
        }
        
        // User-friendly error messages
        if (err.name === "AbortError" || errorMessage.includes("aborted") || errorMessage.includes("timeout")) {
          errorMessage = "Request timed out. Please check your connection and try again.";
        } else if (errorMessage.includes("Failed to fetch") || errorMessage.includes("network")) {
          errorMessage = "Network error. Please check your connection and try again.";
        }
      }
      
      console.error("[Campaign] Fetch requests error:", {
        error: errorMessage,
        errorType: err?.name || typeof err,
        fullError: err,
      });
      
      setRequestsError(errorMessage);
      setErrorModalMessage(errorMessage);
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

    // load requests on initial mount (counts are included in response)
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
    // Mark initial load as done after setting states
    setInitialLoadDone(true);
  }, []);

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

  // reset to first page whenever filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedTab,
    JSON.stringify(quickFilter),
    JSON.stringify(advancedFilter),
  ]);

  // Note: Counts are now included in fetchRequests response, so no separate fetch needed

  // Re-fetch requests whenever filters, pagination, or tab change
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

  // Debounce timer ref for refresh operations
  const refreshDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);

  // Listen for cross-component request updates and refresh the list
  // Includes debouncing to prevent multiple simultaneous refresh calls
  useEffect(() => {
    const handler = async (evt: any) => {
      try {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
        const minRefreshInterval = 500; // Minimum 500ms between refreshes
        const forceRefresh = evt?.detail?.forceRefresh || evt?.detail?.shouldRefresh;

        debug(
          "[Campaign] unite:requests-changed received, refreshing requests",
          evt?.detail,
          { timeSinceLastRefresh, forceRefresh }
        );

        // Clear any pending refresh
        if (refreshDebounceTimerRef.current) {
          clearTimeout(refreshDebounceTimerRef.current);
          refreshDebounceTimerRef.current = null;
        }

        // If force refresh is requested (from backend UI flags), skip debounce
        const debounceDelay = forceRefresh ? 0 : Math.max(0, minRefreshInterval - timeSinceLastRefresh);
        
        // Cancel any pending requests for this endpoint
        cancelRequests(/event-requests/);
        
        // Invalidate cache immediately if cache keys provided
        if (evt?.detail?.cacheKeysToInvalidate && Array.isArray(evt.detail.cacheKeysToInvalidate)) {
          evt.detail.cacheKeysToInvalidate.forEach((key: string) => {
            const cachePattern = new RegExp(key.replace(/^\/api\//, '').replace(/\//g, '.*'));
            invalidateCache(cachePattern);
            debug(`[Campaign] Invalidated cache for: ${key}`);
          });
        } else {
          // Fallback: invalidate all event-requests cache
          invalidateCache(/event-requests/);
        }
        
        refreshDebounceTimerRef.current = setTimeout(async () => {
          try {
            lastRefreshTimeRef.current = Date.now();
            debug("[Campaign] Executing refresh after request change", { forceRefresh });
            
            // Fetch fresh requests (cache already invalidated above)
            await fetchRequests().catch(err => {
              console.error("[Campaign] Error refreshing requests:", err);
            });
            
            debug("[Campaign] Refresh completed successfully");
          } catch (e) {
            console.error("[Campaign] Error in refresh handler:", e);
          } finally {
            refreshDebounceTimerRef.current = null;
          }
        }, debounceDelay);
      } catch (e) {
        console.error("[Campaign] Error in event handler:", e);
      }
    };

    // Handler for force-refresh events (bypasses debounce completely)
    const forceRefreshHandler = async (evt: any) => {
      try {
        debug("[Campaign] unite:force-refresh-requests received, forcing immediate refresh", evt?.detail);
        
        // Clear any pending debounced refresh
        if (refreshDebounceTimerRef.current) {
          clearTimeout(refreshDebounceTimerRef.current);
          refreshDebounceTimerRef.current = null;
        }
        
        // Cancel any pending requests
        cancelRequests(/event-requests/);
        
        // Invalidate cache immediately
        if (evt?.detail?.cacheKeysToInvalidate && Array.isArray(evt.detail.cacheKeysToInvalidate)) {
          evt.detail.cacheKeysToInvalidate.forEach((key: string) => {
            const cachePattern = new RegExp(key.replace(/^\/api\//, '').replace(/\//g, '.*'));
            invalidateCache(cachePattern);
          });
        } else {
          invalidateCache(/event-requests/);
        }
        
        // Force immediate refresh (no debounce)
        lastRefreshTimeRef.current = Date.now();
        await fetchRequests().catch(err => {
          console.error("[Campaign] Error in force refresh:", err);
        });
        
        debug("[Campaign] Force refresh completed");
      } catch (e) {
        console.error("[Campaign] Error in force refresh handler:", e);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "unite:requests-changed",
        handler as EventListener,
      );
      window.addEventListener(
        "unite:force-refresh-requests",
        forceRefreshHandler as EventListener,
      );
    }

    return () => {
      // Clear any pending refresh on unmount
      if (refreshDebounceTimerRef.current) {
        clearTimeout(refreshDebounceTimerRef.current);
        refreshDebounceTimerRef.current = null;
      }
      
      try {
        window.removeEventListener(
          "unite:requests-changed",
          handler as EventListener,
        );
        window.removeEventListener(
          "unite:force-refresh-requests",
          forceRefreshHandler as EventListener,
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

  // Handler for refresh requests
  const handleRefreshRequests = async () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshingRef.current) {
      return;
    }
    
    try {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      
      debug("[Campaign] Manual refresh triggered");
      
      // Invalidate cache for event-requests
      invalidateCache(/event-requests/);
      
      // Cancel any pending requests
      cancelRequests(/event-requests/);
      
      // Fetch fresh data (will use current filters/pagination from state)
      await fetchRequests();
      
      debug("[Campaign] Manual refresh completed");
    } catch (error) {
      console.error("[Campaign] Error refreshing requests:", error);
      // Error is already handled in fetchRequests
    } finally {
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
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

        // Invalidate cache and refresh requests list
        invalidateCache(/event-requests/);
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

        // Invalidate cache and refresh requests list
        invalidateCache(/event-requests/);
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
      
      // Invalidate cache and refresh requests list
      invalidateCache(/event-requests/);
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

  // Handle accept event action coming from EventCard
  const handleAcceptEvent = async (reqObj: any, note?: string) => {
    const startTime = Date.now();
    console.log("[CampaignPage] ====== handleAcceptEvent START ======", {
      timestamp: new Date().toISOString(),
      reqObj: reqObj ? "present" : "null",
      reqObjKeys: reqObj ? Object.keys(reqObj) : [],
      note,
    });

    if (!reqObj) {
      console.error("[CampaignPage] ❌ ERROR: reqObj is null");
      return;
    }

    // Check if request is already approved before attempting to accept
    const currentStatus = reqObj?.status || reqObj?.Status;
    const normalizedStatus = currentStatus ? String(currentStatus).toLowerCase().trim() : '';
    const isAlreadyApproved = normalizedStatus === 'approved' || normalizedStatus.includes('approv');
    
    if (isAlreadyApproved) {
      console.warn("[CampaignPage] ⚠️ Request is already approved, skipping accept action", {
        currentStatus,
        normalizedStatus,
      });
      // Return success without making API call
      return {
        success: true,
        message: 'Request is already approved',
        data: { request: reqObj }
      };
    }

    const requestId =
      reqObj.Request_ID || reqObj.RequestId || reqObj._id || reqObj.requestId;

    console.log("[CampaignPage] ✅ Step 1: Resolved requestId for accept:", requestId);

    if (!requestId) {
      console.error("[CampaignPage] ❌ ERROR: Unable to determine request id for accept");
      setErrorModalMessage("Unable to determine request id for accept");
      setErrorModalOpen(true);
      return;
    }

    try {
      console.log("[CampaignPage] ✅ Step 2: Getting authentication token");
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const hasToken = !!token;
      console.log("[CampaignPage] ✅ Step 2 COMPLETE: Token", hasToken ? "found" : "not found");

      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const body: any = {
        action: "accept",
      };
      // Note: Backend validator doesn't allow note for accept action, so we don't include it

      const url = `${API_URL}/api/event-requests/${requestId}/actions`;
      console.log("[CampaignPage] ✅ Step 3: Preparing fetch request:", {
        url,
        method: "POST",
        body: JSON.stringify(body),
        hasToken,
        headers: { ...headers, Authorization: hasToken ? "Bearer ***" : undefined },
      });

      console.log("[CampaignPage] 📡 Step 4: Sending fetch request (starting now)...");
      const fetchStartTime = Date.now();
      
      // Add timeout to fetch - shorter timeout to trigger recovery faster
      const timeoutMs = 10000; // 10 seconds (reduced from 30s to trigger recovery sooner)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const fetchPromise = fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      let res: Response;
      let fetchTimedOut = false;
      try {
        res = await Promise.race([fetchPromise, timeoutPromise]);
        const fetchElapsed = Date.now() - fetchStartTime;
        console.log("[CampaignPage] ✅ Step 4 COMPLETE: Fetch completed", {
          status: res.status,
          statusText: res.statusText,
          elapsed: `${fetchElapsed}ms`,
        });
      } catch (fetchError: any) {
        const fetchElapsed = Date.now() - fetchStartTime;
        const isTimeout = fetchError?.message?.includes("timeout");
        fetchTimedOut = isTimeout;
        
        // If timeout, check if backend actually succeeded before logging error
        if (isTimeout) {
          console.log("[CampaignPage] ⚠️ Step 4: Request timeout detected, checking if backend succeeded...", {
            elapsed: `${fetchElapsed}ms`,
          });
          
          try {
            // Poll the request status to see if it was updated
            const maxRetries = 5;
            const retryDelay = 2000; // 2 seconds between checks
            
            for (let retry = 0; retry < maxRetries; retry++) {
              if (retry > 0) {
                console.log(`[CampaignPage] 🔍 Step 4a-${retry}: Retry ${retry}/${maxRetries - 1} checking request status...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              }
              
              try {
                const checkToken = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token");
                const checkHeaders: any = { "Content-Type": "application/json" };
                if (checkToken) checkHeaders["Authorization"] = `Bearer ${checkToken}`;
                
                const checkUrl = `${API_URL}/api/event-requests/${requestId}`;
                console.log(`[CampaignPage] 🔍 Step 4a-${retry}: Fetching request status from: ${checkUrl}`);
                
                const checkRes = await fetch(checkUrl, {
                  headers: checkHeaders,
                  credentials: "include",
                });
                
                if (checkRes.ok) {
                  const checkBody = await checkRes.json();
                  const updatedRequest = checkBody?.data?.request || checkBody?.data || checkBody?.request || checkBody;
                  const updatedStatus = updatedRequest?.status || updatedRequest?.Status;
                  const originalStatus = reqObj?.status || reqObj?.Status;
                  
                  console.log(`[CampaignPage] 🔍 Step 4a-${retry}: Request status check`, {
                    originalStatus,
                    updatedStatus,
                    statusChanged: originalStatus !== updatedStatus,
                    isApproved: updatedStatus === 'approved' || updatedStatus === 'APPROVED',
                  });
                  
                  // If status changed to approved, backend succeeded!
                  if (updatedStatus === 'approved' || updatedStatus === 'APPROVED' || 
                      (originalStatus !== updatedStatus && (updatedStatus?.includes('approv') || updatedStatus?.includes('Approv')))) {
                    console.log(`[CampaignPage] ✅ Step 4a-${retry}: Backend succeeded despite timeout! Status updated to: ${updatedStatus}`);
                    // Treat as success - continue to refresh
                    fetchTimedOut = false;
                    // Create a mock successful response
                    res = {
                      ok: true,
                      status: 200,
                      statusText: 'OK',
                      json: async () => ({
                        success: true,
                        message: 'Request accepted successfully (recovered from timeout)',
                        data: { request: updatedRequest }
                      }),
                    } as Response;
                    break;
                  }
                }
              } catch (checkError: any) {
                console.log(`[CampaignPage] ⚠️ Step 4a-${retry}: Status check failed, will retry:`, checkError?.message);
                // Continue to next retry
              }
            }
            
            if (fetchTimedOut) {
              // Only log as error if recovery failed
              console.error("[CampaignPage] ❌ Step 4 FAILED: Fetch timeout and recovery failed", {
                error: fetchError,
                message: fetchError?.message,
                elapsed: `${fetchElapsed}ms`,
              });
              throw fetchError; // Re-throw original timeout error
            } else {
              console.log("[CampaignPage] ✅ Step 4a: Backend succeeded, continuing with success path (no error)");
            }
          } catch (recoveryError: any) {
            // Only log as error if recovery attempt itself failed
            console.error("[CampaignPage] ❌ Step 4 FAILED: Fetch timeout and recovery attempt failed", {
              fetchError: fetchError?.message,
              recoveryError: recoveryError?.message,
              elapsed: `${fetchElapsed}ms`,
            });
            throw fetchError; // Re-throw original timeout error
          }
        } else {
          // Non-timeout errors are always logged
          console.error("[CampaignPage] ❌ Step 4 FAILED: Fetch error", {
            error: fetchError,
            message: fetchError?.message,
            elapsed: `${fetchElapsed}ms`,
          });
          throw fetchError;
        }
      }

      console.log("[CampaignPage] ✅ Step 5: Parsing response JSON");
      let resp: any;
      try {
        resp = await res.json();
        console.log("[CampaignPage] ✅ Step 5 COMPLETE: Response parsed", {
          success: resp?.success,
          hasData: !!resp?.data,
          message: resp?.message,
        });
      } catch (parseError: any) {
        console.error("[CampaignPage] ❌ Step 5 FAILED: JSON parse error", {
          error: parseError,
          status: res.status,
          statusText: res.statusText,
        });
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }

      if (!res.ok) {
        const errorMsg = resp.message || resp.errors?.join(", ") || "Failed to accept request";
        console.error("[CampaignPage] ❌ Step 6: Response not OK", {
          status: res.status,
          statusText: res.statusText,
          errorMsg,
          response: resp,
        });
        throw new Error(errorMsg);
      }

      console.log("[CampaignPage] ✅ Step 6: Response OK, accept succeeded");
      console.log("[CampaignPage] ✅ Step 7: Starting cache invalidation and refresh");
      
      // Invalidate cache and refresh requests list
      console.log("[CampaignPage] 🔄 Step 7a: Invalidating cache");
      invalidateCache(/event-requests/);
      console.log("[CampaignPage] ✅ Step 7a COMPLETE: Cache invalidated");
      
      console.log("[CampaignPage] 🔄 Step 7b: Calling fetchRequests()");
      const refreshStartTime = Date.now();
      try {
        await fetchRequests();
        const refreshElapsed = Date.now() - refreshStartTime;
        console.log("[CampaignPage] ✅ Step 7b COMPLETE: fetchRequests() completed", {
          elapsed: `${refreshElapsed}ms`,
        });
        
        // Dispatch custom event to force EventCard components to check for updates
        // Wait a bit for fetchRequests to fully update the state
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log("[CampaignPage] 📢 Step 7b-event: Dispatching refresh event for request:", requestId);
        try {
          window.dispatchEvent(
            new CustomEvent("unite:force-refresh-requests", { 
              detail: { 
                requestId,
                expectedStatus: 'approved',
                originalStatus: reqObj?.status || reqObj?.Status,
              } 
            })
          );
          console.log("[CampaignPage] ✅ Step 7b-event COMPLETE: Refresh event dispatched");
          
          // Dispatch a second event after a delay to ensure cards get the update
          setTimeout(() => {
            console.log("[CampaignPage] 📢 Step 7b-event-2: Dispatching second refresh event");
            window.dispatchEvent(
              new CustomEvent("unite:force-refresh-requests", { 
                detail: { 
                  requestId,
                  expectedStatus: 'approved',
                  originalStatus: reqObj?.status || reqObj?.Status,
                } 
              })
            );
          }, 300);
        } catch (eventError: any) {
          console.warn("[CampaignPage] ⚠️ Step 7b-event: Failed to dispatch event:", eventError?.message);
        }
      } catch (refreshError: any) {
        console.error("[CampaignPage] ❌ Step 7b FAILED: fetchRequests() error", {
          error: refreshError,
          message: refreshError?.message,
        });
        // Don't throw - we still want to return success even if refresh fails
      }
      
      console.log("[CampaignPage] 🔄 Step 7c: Waiting 500ms for React state propagation");
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("[CampaignPage] ✅ Step 7c COMPLETE: Delay completed");

      const totalElapsed = Date.now() - startTime;
      console.log("[CampaignPage] ====== handleAcceptEvent SUCCESS ======", {
        elapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return resp;
    } catch (err: any) {
      const totalElapsed = Date.now() - startTime;
      console.error("[CampaignPage] ❌ ====== handleAcceptEvent ERROR ======", {
        error: err,
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        elapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      const errorMessage = err?.message || err?.errors?.join(", ") || "Failed to accept request";
      console.error("[CampaignPage] Setting error modal:", errorMessage);
      setErrorModalMessage(errorMessage);
      setErrorModalOpen(true);
      throw err;
    }
  };

  // Handle confirm event action coming from EventCard
  const handleConfirmEvent = async (reqObj: any) => {
    const startTime = Date.now();
    console.log("[CampaignPage] ====== handleConfirmEvent START ======", {
      timestamp: new Date().toISOString(),
      reqObj: reqObj ? "present" : "null",
      reqObjKeys: reqObj ? Object.keys(reqObj) : [],
    });

    if (!reqObj) {
      console.error("[CampaignPage] ❌ ERROR: reqObj is null");
      return;
    }

    const requestId =
      reqObj.Request_ID || reqObj.RequestId || reqObj._id || reqObj.requestId;

    console.log("[CampaignPage] ✅ Step 1: Resolved requestId for confirm:", requestId);

    if (!requestId) {
      console.error("[CampaignPage] ❌ ERROR: Unable to determine request id for confirm");
      setErrorModalMessage("Unable to determine request id for confirm");
      setErrorModalOpen(true);
      return;
    }

    try {
      console.log("[CampaignPage] ✅ Step 2: Getting authentication token");
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const hasToken = !!token;
      console.log("[CampaignPage] ✅ Step 2 COMPLETE: Token", hasToken ? "found" : "not found");

      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const body: any = {
        action: "confirm",
      };
      // Note: Backend validator doesn't allow note for confirm action

      const url = `${API_URL}/api/event-requests/${requestId}/actions`;
      console.log("[CampaignPage] ✅ Step 3: Preparing fetch request:", {
        url,
        method: "POST",
        body: JSON.stringify(body),
        hasToken,
        headers: { ...headers, Authorization: hasToken ? "Bearer ***" : undefined },
      });

      console.log("[CampaignPage] 📡 Step 4: Sending fetch request (starting now)...");
      const fetchStartTime = Date.now();
      
      // Add timeout to fetch - shorter timeout to trigger recovery faster
      const timeoutMs = 10000; // 10 seconds (reduced from 30s to trigger recovery sooner)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const fetchPromise = fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      let res: Response;
      let fetchTimedOut = false;
      try {
        res = await Promise.race([fetchPromise, timeoutPromise]);
        const fetchElapsed = Date.now() - fetchStartTime;
        console.log("[CampaignPage] ✅ Step 4 COMPLETE: Fetch completed", {
          status: res.status,
          statusText: res.statusText,
          elapsed: `${fetchElapsed}ms`,
        });
      } catch (fetchError: any) {
        const fetchElapsed = Date.now() - fetchStartTime;
        const isTimeout = fetchError?.message?.includes("timeout");
        fetchTimedOut = isTimeout;
        
        // If timeout, check if backend actually succeeded before logging error
        if (isTimeout) {
          console.log("[CampaignPage] ⚠️ Step 4: Request timeout detected, checking if backend succeeded...", {
            elapsed: `${fetchElapsed}ms`,
          });
          
          try {
            // Poll the request status to see if it was updated
            const maxRetries = 5;
            const retryDelay = 2000; // 2 seconds between checks
            
            for (let retry = 0; retry < maxRetries; retry++) {
              if (retry > 0) {
                console.log(`[CampaignPage] 🔍 Step 4a-${retry}: Retry ${retry}/${maxRetries - 1} checking request status...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              }
              
              try {
                const checkToken = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token");
                const checkHeaders: any = { "Content-Type": "application/json" };
                if (checkToken) checkHeaders["Authorization"] = `Bearer ${checkToken}`;
                
                const checkUrl = `${API_URL}/api/event-requests/${requestId}`;
                console.log(`[CampaignPage] 🔍 Step 4a-${retry}: Fetching request status from: ${checkUrl}`);
                
                const checkRes = await fetch(checkUrl, {
                  headers: checkHeaders,
                  credentials: "include",
                });
                
                if (checkRes.ok) {
                  const checkBody = await checkRes.json();
                  const updatedRequest = checkBody?.data?.request || checkBody?.data || checkBody?.request || checkBody;
                  const updatedStatus = updatedRequest?.status || updatedRequest?.Status;
                  const originalStatus = reqObj?.status || reqObj?.Status;
                  
                  console.log(`[CampaignPage] 🔍 Step 4a-${retry}: Request status check`, {
                    originalStatus,
                    updatedStatus,
                    statusChanged: originalStatus !== updatedStatus,
                    isApproved: updatedStatus === 'approved' || updatedStatus === 'APPROVED',
                  });
                  
                  // For confirm action: check if status changed from review-rescheduled to approved
                  // or any status change that indicates success
                  const isApproved = updatedStatus === 'approved' || updatedStatus === 'APPROVED';
                  const wasReviewRescheduled = originalStatus === 'review-rescheduled' || originalStatus === 'REVIEW_RESCHEDULED' || 
                                               (originalStatus?.includes('rescheduled') && originalStatus?.includes('review'));
                  const statusChanged = originalStatus !== updatedStatus;
                  
                  // If status changed to approved, or changed from review-rescheduled to approved, backend succeeded!
                  if (isApproved || 
                      (wasReviewRescheduled && isApproved) ||
                      (statusChanged && (updatedStatus?.includes('approv') || updatedStatus?.includes('Approv')))) {
                    console.log(`[CampaignPage] ✅ Step 4a-${retry}: Backend succeeded despite timeout! Status updated from "${originalStatus}" to "${updatedStatus}"`);
                    // Treat as success - continue to refresh
                    fetchTimedOut = false;
                    // Create a mock successful response
                    res = {
                      ok: true,
                      status: 200,
                      statusText: 'OK',
                      json: async () => ({
                        success: true,
                        message: 'Request confirmed successfully (recovered from timeout)',
                        data: { request: updatedRequest }
                      }),
                    } as Response;
                    break;
                  }
                }
              } catch (checkError: any) {
                console.log(`[CampaignPage] ⚠️ Step 4a-${retry}: Status check failed, will retry:`, checkError?.message);
                // Continue to next retry
              }
            }
            
            if (fetchTimedOut) {
              // Only log as error if recovery failed
              console.error("[CampaignPage] ❌ Step 4 FAILED: Fetch timeout and recovery failed", {
                error: fetchError,
                message: fetchError?.message,
                elapsed: `${fetchElapsed}ms`,
              });
              throw fetchError; // Re-throw original timeout error
            } else {
              console.log("[CampaignPage] ✅ Step 4a: Backend succeeded, continuing with success path (no error)");
            }
          } catch (recoveryError: any) {
            // Only log as error if recovery attempt itself failed
            console.error("[CampaignPage] ❌ Step 4 FAILED: Fetch timeout and recovery attempt failed", {
              fetchError: fetchError?.message,
              recoveryError: recoveryError?.message,
              elapsed: `${fetchElapsed}ms`,
            });
            throw fetchError; // Re-throw original timeout error
          }
        } else {
          // Non-timeout errors are always logged
          console.error("[CampaignPage] ❌ Step 4 FAILED: Fetch error", {
            error: fetchError,
            message: fetchError?.message,
            elapsed: `${fetchElapsed}ms`,
          });
          throw fetchError;
        }
      }

      console.log("[CampaignPage] ✅ Step 5: Parsing response JSON");
      let resp: any;
      try {
        resp = await res.json();
        console.log("[CampaignPage] ✅ Step 5 COMPLETE: Response parsed", {
          success: resp?.success,
          hasData: !!resp?.data,
          message: resp?.message,
        });
      } catch (parseError: any) {
        console.error("[CampaignPage] ❌ Step 5 FAILED: JSON parse error", {
          error: parseError,
          status: res.status,
          statusText: res.statusText,
        });
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }

      if (!res.ok) {
        const errorMsg = resp.message || resp.errors?.join(", ") || "Failed to confirm request";
        console.error("[CampaignPage] ❌ Step 6: Response not OK", {
          status: res.status,
          statusText: res.statusText,
          errorMsg,
          response: resp,
        });
        throw new Error(errorMsg);
      }

      console.log("[CampaignPage] ✅ Step 6: Response OK, confirm succeeded");
      
      // Extract updated request from response if available
      const responseRequest = resp?.data?.request || resp?.data || resp?.request;
      const responseStatus = responseRequest?.status || responseRequest?.Status;
      const originalStatus = reqObj?.status || reqObj?.Status;
      
      console.log("[CampaignPage] 📊 Step 6a: Status comparison", {
        originalStatus,
        responseStatus,
        statusChanged: originalStatus !== responseStatus,
        hasResponseRequest: !!responseRequest,
      });
      
      console.log("[CampaignPage] ✅ Step 7: Starting cache invalidation and refresh");
      
      // Invalidate cache and refresh requests list
      console.log("[CampaignPage] 🔄 Step 7a: Invalidating cache");
      invalidateCache(/event-requests/);
      console.log("[CampaignPage] ✅ Step 7a COMPLETE: Cache invalidated");
      
      console.log("[CampaignPage] 🔄 Step 7b: Calling fetchRequests()");
      const refreshStartTime = Date.now();
      try {
        await fetchRequests();
        const refreshElapsed = Date.now() - refreshStartTime;
        console.log("[CampaignPage] ✅ Step 7b COMPLETE: fetchRequests() completed", {
          elapsed: `${refreshElapsed}ms`,
        });
        
        // Dispatch custom event to force EventCard components to check for updates
        // Wait a bit for fetchRequests to fully update the state
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log("[CampaignPage] 📢 Step 7b-event: Dispatching refresh event for request:", requestId);
        try {
          window.dispatchEvent(
            new CustomEvent("unite:force-refresh-requests", { 
              detail: { 
                requestId,
                expectedStatus: 'approved',
                originalStatus: reqObj?.status || reqObj?.Status,
              } 
            })
          );
          console.log("[CampaignPage] ✅ Step 7b-event COMPLETE: Refresh event dispatched");
          
          // Dispatch a second event after a delay to ensure cards get the update
          setTimeout(() => {
            console.log("[CampaignPage] 📢 Step 7b-event-2: Dispatching second refresh event");
            window.dispatchEvent(
              new CustomEvent("unite:force-refresh-requests", { 
                detail: { 
                  requestId,
                  expectedStatus: 'approved',
                  originalStatus: reqObj?.status || reqObj?.Status,
                } 
              })
            );
          }, 300);
        } catch (eventError: any) {
          console.warn("[CampaignPage] ⚠️ Step 7b-event: Failed to dispatch event:", eventError?.message);
        }
      } catch (refreshError: any) {
        console.error("[CampaignPage] ❌ Step 7b FAILED: fetchRequests() error", {
          error: refreshError,
          message: refreshError?.message,
        });
        // Don't throw - we still want to return success even if refresh fails
      }
      
      console.log("[CampaignPage] 🔄 Step 7c: Waiting 500ms for React state propagation");
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("[CampaignPage] ✅ Step 7c COMPLETE: Delay completed");

      const totalElapsed = Date.now() - startTime;
      console.log("[CampaignPage] ====== handleConfirmEvent SUCCESS ======", {
        elapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return resp;
    } catch (err: any) {
      const totalElapsed = Date.now() - startTime;
      console.error("[CampaignPage] ❌ ====== handleConfirmEvent ERROR ======", {
        error: err,
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        elapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      const errorMessage = err?.message || err?.errors?.join(", ") || "Failed to confirm request";
      console.error("[CampaignPage] Setting error modal:", errorMessage);
      setErrorModalMessage(errorMessage);
      setErrorModalOpen(true);
      throw err;
    }
  };

  // Handle reject event action coming from EventCard
  const handleRejectEvent = async (reqObj: any, note?: string) => {
    const startTime = Date.now();
    console.log("[CampaignPage] ====== handleRejectEvent START ======", {
      timestamp: new Date().toISOString(),
      reqObj: reqObj ? "present" : "null",
      reqObjKeys: reqObj ? Object.keys(reqObj) : [],
      note,
    });

    if (!reqObj) {
      console.error("[CampaignPage] ❌ ERROR: reqObj is null");
      return;
    }

    const requestId =
      reqObj.Request_ID || reqObj.RequestId || reqObj._id || reqObj.requestId;

    console.log("[CampaignPage] ✅ Step 1: Resolved requestId for reject:", requestId);

    if (!requestId) {
      console.error("[CampaignPage] ❌ ERROR: Unable to determine request id for reject");
      setErrorModalMessage("Unable to determine request id for reject");
      setErrorModalOpen(true);
      return;
    }

    try {
      console.log("[CampaignPage] ✅ Step 2: Getting authentication token");
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const hasToken = !!token;
      console.log("[CampaignPage] ✅ Step 2 COMPLETE: Token", hasToken ? "found" : "not found");

      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const body: any = {
        action: "reject",
        note: note || "",
      };

      const url = `${API_URL}/api/event-requests/${requestId}/actions`;
      console.log("[CampaignPage] ✅ Step 3: Preparing fetch request:", {
        url,
        method: "POST",
        body: JSON.stringify(body),
        hasToken,
        headers: { ...headers, Authorization: hasToken ? "Bearer ***" : undefined },
      });

      console.log("[CampaignPage] 📡 Step 4: Sending fetch request (starting now)...");
      const fetchStartTime = Date.now();
      
      // Add timeout to fetch - shorter timeout to trigger recovery faster
      const timeoutMs = 10000; // 10 seconds (reduced from 30s to trigger recovery sooner)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const fetchPromise = fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      let res: Response;
      let fetchTimedOut = false;
      try {
        res = await Promise.race([fetchPromise, timeoutPromise]);
        const fetchElapsed = Date.now() - fetchStartTime;
        console.log("[CampaignPage] ✅ Step 4 COMPLETE: Fetch completed", {
          status: res.status,
          statusText: res.statusText,
          elapsed: `${fetchElapsed}ms`,
        });
      } catch (fetchError: any) {
        const fetchElapsed = Date.now() - fetchStartTime;
        const isTimeout = fetchError?.message?.includes("timeout");
        fetchTimedOut = isTimeout;
        
        // If timeout, check if backend actually succeeded before logging error
        if (isTimeout) {
          console.log("[CampaignPage] ⚠️ Step 4: Request timeout detected, checking if backend succeeded...", {
            elapsed: `${fetchElapsed}ms`,
          });
          
          try {
            // Poll the request status to see if it was updated
            const maxRetries = 5;
            const retryDelay = 2000; // 2 seconds between checks
            
            for (let retry = 0; retry < maxRetries; retry++) {
              if (retry > 0) {
                console.log(`[CampaignPage] 🔍 Step 4a-${retry}: Retry ${retry}/${maxRetries - 1} checking request status...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              }
              
              try {
                const checkToken = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token");
                const checkHeaders: any = { "Content-Type": "application/json" };
                if (checkToken) checkHeaders["Authorization"] = `Bearer ${checkToken}`;
                
                const checkUrl = `${API_URL}/api/event-requests/${requestId}`;
                console.log(`[CampaignPage] 🔍 Step 4a-${retry}: Fetching request status from: ${checkUrl}`);
                
                const checkRes = await fetch(checkUrl, {
                  headers: checkHeaders,
                  credentials: "include",
                });
                
                if (checkRes.ok) {
                  const checkBody = await checkRes.json();
                  const updatedRequest = checkBody?.data?.request || checkBody?.data || checkBody?.request || checkBody;
                  const updatedStatus = updatedRequest?.status || updatedRequest?.Status;
                  const originalStatus = reqObj?.status || reqObj?.Status;
                  
                  console.log(`[CampaignPage] 🔍 Step 4a-${retry}: Request status check`, {
                    originalStatus,
                    updatedStatus,
                    statusChanged: originalStatus !== updatedStatus,
                    isRejected: updatedStatus === 'rejected' || updatedStatus === 'REJECTED',
                  });
                  
                  // If status changed to rejected, backend succeeded!
                  if (updatedStatus === 'rejected' || updatedStatus === 'REJECTED' || 
                      (originalStatus !== updatedStatus && (updatedStatus?.includes('reject') || updatedStatus?.includes('Reject')))) {
                    console.log(`[CampaignPage] ✅ Step 4a-${retry}: Backend succeeded despite timeout! Status updated to: ${updatedStatus}`);
                    // Treat as success - continue to refresh
                    fetchTimedOut = false;
                    // Create a mock successful response
                    res = {
                      ok: true,
                      status: 200,
                      statusText: 'OK',
                      json: async () => ({
                        success: true,
                        message: 'Request rejected successfully (recovered from timeout)',
                        data: { request: updatedRequest }
                      }),
                    } as Response;
                    break;
                  }
                }
              } catch (checkError: any) {
                console.log(`[CampaignPage] ⚠️ Step 4a-${retry}: Status check failed, will retry:`, checkError?.message);
                // Continue to next retry
              }
            }
            
            if (fetchTimedOut) {
              // Only log as error if recovery failed
              console.error("[CampaignPage] ❌ Step 4 FAILED: Fetch timeout and recovery failed", {
                error: fetchError,
                message: fetchError?.message,
                elapsed: `${fetchElapsed}ms`,
              });
              throw fetchError; // Re-throw original timeout error
            } else {
              console.log("[CampaignPage] ✅ Step 4a: Backend succeeded, continuing with success path (no error)");
            }
          } catch (recoveryError: any) {
            // Only log as error if recovery attempt itself failed
            console.error("[CampaignPage] ❌ Step 4 FAILED: Fetch timeout and recovery attempt failed", {
              fetchError: fetchError?.message,
              recoveryError: recoveryError?.message,
              elapsed: `${fetchElapsed}ms`,
            });
            throw fetchError; // Re-throw original timeout error
          }
        } else {
          // Non-timeout errors are always logged
          console.error("[CampaignPage] ❌ Step 4 FAILED: Fetch error", {
            error: fetchError,
            message: fetchError?.message,
            elapsed: `${fetchElapsed}ms`,
          });
          throw fetchError;
        }
      }

      console.log("[CampaignPage] ✅ Step 5: Parsing response JSON");
      let resp: any;
      try {
        resp = await res.json();
        console.log("[CampaignPage] ✅ Step 5 COMPLETE: Response parsed", {
          success: resp?.success,
          hasData: !!resp?.data,
          message: resp?.message,
        });
      } catch (parseError: any) {
        console.error("[CampaignPage] ❌ Step 5 FAILED: JSON parse error", {
          error: parseError,
          status: res.status,
          statusText: res.statusText,
        });
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }

      if (!res.ok) {
        const errorMsg = resp.message || resp.errors?.join(", ") || "Failed to reject request";
        console.error("[CampaignPage] ❌ Step 6: Response not OK", {
          status: res.status,
          statusText: res.statusText,
          errorMsg,
          response: resp,
        });
        throw new Error(errorMsg);
      }

      console.log("[CampaignPage] ✅ Step 6: Response OK, reject succeeded");
      console.log("[CampaignPage] ✅ Step 7: Starting cache invalidation and refresh");
      
      // Invalidate cache and refresh requests list
      console.log("[CampaignPage] 🔄 Step 7a: Invalidating cache");
      invalidateCache(/event-requests/);
      console.log("[CampaignPage] ✅ Step 7a COMPLETE: Cache invalidated");
      
      console.log("[CampaignPage] 🔄 Step 7b: Calling fetchRequests()");
      const refreshStartTime = Date.now();
      try {
        await fetchRequests();
        const refreshElapsed = Date.now() - refreshStartTime;
        console.log("[CampaignPage] ✅ Step 7b COMPLETE: fetchRequests() completed", {
          elapsed: `${refreshElapsed}ms`,
        });
        
        // Dispatch custom event to force EventCard components to check for updates
        // Wait a bit for fetchRequests to fully update the state
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log("[CampaignPage] 📢 Step 7b-event: Dispatching refresh event for request:", requestId);
        try {
          window.dispatchEvent(
            new CustomEvent("unite:force-refresh-requests", { 
              detail: { 
                requestId,
                expectedStatus: 'rejected',
                originalStatus: reqObj?.status || reqObj?.Status,
              } 
            })
          );
          console.log("[CampaignPage] ✅ Step 7b-event COMPLETE: Refresh event dispatched");
          
          // Dispatch a second event after a delay to ensure cards get the update
          setTimeout(() => {
            console.log("[CampaignPage] 📢 Step 7b-event-2: Dispatching second refresh event");
            window.dispatchEvent(
              new CustomEvent("unite:force-refresh-requests", { 
                detail: { 
                  requestId,
                  expectedStatus: 'rejected',
                  originalStatus: reqObj?.status || reqObj?.Status,
                } 
              })
            );
          }, 300);
        } catch (eventError: any) {
          console.warn("[CampaignPage] ⚠️ Step 7b-event: Failed to dispatch event:", eventError?.message);
        }
      } catch (refreshError: any) {
        console.error("[CampaignPage] ❌ Step 7b FAILED: fetchRequests() error", {
          error: refreshError,
          message: refreshError?.message,
        });
        // Don't throw - we still want to return success even if refresh fails
      }
      
      console.log("[CampaignPage] 🔄 Step 7c: Waiting 500ms for React state propagation");
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("[CampaignPage] ✅ Step 7c COMPLETE: Delay completed");

      const totalElapsed = Date.now() - startTime;
      console.log("[CampaignPage] ====== handleRejectEvent SUCCESS ======", {
        elapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });

      return resp;
    } catch (err: any) {
      const totalElapsed = Date.now() - startTime;
      console.error("[CampaignPage] ❌ ====== handleRejectEvent ERROR ======", {
        error: err,
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        elapsed: `${totalElapsed}ms`,
        timestamp: new Date().toISOString(),
      });
      const errorMessage = err?.message || err?.errors?.join(", ") || "Failed to reject request";
      console.error("[CampaignPage] Setting error modal:", errorMessage);
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

      // Invalidate cache and refresh requests list
      invalidateCache(/event-requests/);
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
        userEmail={currentUserEmail || "unite@health.tech"}
        userName={currentUserName || "unite user"}
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
        onRefresh={handleRefreshRequests}
        isRefreshing={isRefreshing}
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

                // Use request ID as key to ensure React tracks updates properly
                const requestKey = req.Request_ID || req.RequestId || req._id || req.requestId || `request-${index}`;
                
                return (
                  <EventCard
                    key={requestKey}
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
                    onAcceptEvent={(note?: string) => handleAcceptEvent(req, note)}
                    onConfirmEvent={() => handleConfirmEvent(req)}
                    onRejectEvent={(reqObj: any, note?: string) => handleRejectEvent(reqObj, note)}
                    onViewEvent={() => handleOpenView(req)}
                  />
                );
              })}
            </div>
            {/* Pagination controls (render after cards inside the scroll area) */}
          </div>

          {/* Overlay area positioned relative to wrapper. This keeps spinner / no-results
              centered in the visible viewport regardless of inner scroll position. */}
          {isLoadingRequests && requests.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-20 pointer-events-none">
              <div className="flex items-center justify-center gap-2">
                <Spinner size="sm" />
                <span className="text-sm text-default-600">Loading requests...</span>
              </div>
            </div>
          )}

          {/* Show loading indicator at bottom when loading more (pagination) */}
          {isLoadingRequests && requests.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center justify-center gap-2">
                <Spinner size="sm" />
                <span className="text-sm text-default-600">Loading more...</span>
              </div>
            </div>
          )}

          {!isLoadingRequests && requests.length === 0 && !requestsError && (
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
          invalidateCache(/event-requests/);
          await fetchRequests();
        }}
      />

      {/* Notifications Modal (mobile bell) */}
      {/* Mobile notification modal moved into `MobileNav` component */}

      
    </div>
  );
}
