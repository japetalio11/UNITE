"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@heroui/input";
import { DatePicker, DateRangePicker } from "@heroui/date-picker";
import { Tabs, Tab } from "@heroui/tabs";
import { Button, ButtonGroup } from "@heroui/button";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import { Select, SelectItem } from "@heroui/select";
import { Avatar } from "@heroui/avatar";
import { Tooltip } from "@heroui/tooltip";
import { ArrowDownToSquare, Funnel, Ticket, ChevronDown, Wrench } from "@gravity-ui/icons";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { RangeValue } from "@react-types/shared";
import { DateValue } from "@internationalized/date";
import { useLocations } from "../providers/locations-provider";
import { getUserInfo } from "../../utils/getUserInfo";
import { decodeJwt } from "../../utils/decodeJwt";
import { hasCapability } from "../../utils/permissionUtils";

import {
  CreateTrainingEventModal,
  CreateBloodDriveEventModal,
  CreateAdvocacyEventModal,
} from "./event-creation-modal";

interface CampaignToolbarProps {
  onExport?: () => void;
  onQuickFilter?: (filter: any) => void;
  onAdvancedFilter?: (filter: any) => void;
  onCreateEvent?: (eventType: string, eventData: any) => void;
  onTabChange?: (tab: string) => void;
  defaultTab?: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  // Location data
  provinces?: any[];
  districts?: any[];
  municipalities?: any[];
  onDistrictFetch?: (provinceId: string | number) => void;
  counts?: { all: number; approved: number; pending: number; rejected: number };
  totalRequests?: number;
}

export default function CampaignToolbar({
  onExport,
  onQuickFilter,
  onAdvancedFilter,
  onCreateEvent,
  onTabChange,
  defaultTab = "all",
  currentPage,
  totalPages,
  onPageChange,
  provinces = [],
  districts = [],
  municipalities = [],
  onDistrictFetch,
  counts = { all: 0, approved: 0, pending: 0, rejected: 0 },
}: CampaignToolbarProps) {
  const { getMunicipalitiesForDistrict } = useLocations();
  const [selectedTab, setSelectedTab] = useState(defaultTab);
  const [selectedEventType, setSelectedEventType] = useState(
    new Set(["blood-drive"]),
  );
  const [canCreateEvent, setCanCreateEvent] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Check if user has permission to create events/requests - PERMISSION-BASED ONLY
  useEffect(() => {
    console.log("[Campaign Toolbar] Permission check useEffect running");
    
    const checkCreatePermission = async () => {
      try {
        console.log("[Campaign Toolbar] Starting permission check...");
        const rawUser = localStorage.getItem("unite_user");
        console.log("[Campaign Toolbar] Raw user from localStorage:", rawUser ? "exists" : "not found");
        const user = rawUser ? JSON.parse(rawUser) : null;
        console.log("[Campaign Toolbar] Full user object:", user);
        console.log("[Campaign Toolbar] User keys:", user ? Object.keys(user) : []);
        console.log("[Campaign Toolbar] Parsed user summary:", user ? { 
          id: user._id || user.id || user.ID || user.userId,
          hasPermissions: !!user.permissions, 
          hasRoles: !!user.roles,
          permissions: user.permissions,
          roles: user.roles
        } : "null");
        const token =
          localStorage.getItem("unite_token") ||
          sessionStorage.getItem("unite_token");
        console.log("[Campaign Toolbar] Token:", token ? "exists" : "not found");
        console.log("[Campaign Toolbar] API_URL:", API_URL);
        
        let hasPermission = false;
        
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
          const result = hasExactMatch || hasWildcard || hasResourceWildcard;
          console.log(`[Campaign Toolbar] checkPermissionString: "${permString}" contains "${capability}"?`, {
            perms,
            hasExactMatch,
            hasWildcard,
            hasResourceWildcard,
            result
          });
          return result;
        };
        
        // Helper to check permissions array (handles both formats)
        const checkPermissionsArray = (permissions: any[]): boolean => {
          if (!Array.isArray(permissions) || permissions.length === 0) return false;
          
          return permissions.some((perm: any) => {
            if (typeof perm === 'string') {
              // Handle comma-separated string format: 'event.create,read,update'
              if (perm.includes(',')) {
                return checkPermissionString(perm, 'event.create') || 
                       checkPermissionString(perm, 'request.create');
              }
              // Handle single permission string
              return perm === 'event.create' || 
                     perm === 'request.create' ||
                     perm === '*.*' ||
                     perm === 'event.*' ||
                     perm === 'request.*';
            }
            // Handle structured permission objects (if any)
            if (perm && typeof perm === 'object') {
              const resource = perm.resource;
              const actions = Array.isArray(perm.actions) ? perm.actions : [];
              if (resource === '*' && (actions.includes('*') || actions.includes('create'))) return true;
              if ((resource === 'event' || resource === 'request') && actions.includes('create')) return true;
            }
            return false;
          });
        };
        
        if (!token || !API_URL) {
          console.log("[Campaign Toolbar] Missing token or API_URL");
          setCanCreateEvent(false);
          return;
        }
        
        // Extract user ID from multiple sources
        let userId = user?._id || user?.id || user?.ID || user?.userId || user?.user_id;
        
        // If user ID not found in user object, try to get it from JWT token
        if (!userId && token) {
          try {
            const payload = decodeJwt(token);
            console.log("[Campaign Toolbar] JWT payload:", payload);
            userId = payload?.id || payload?.userId || payload?.user_id || payload?._id || payload?.sub;
            console.log("[Campaign Toolbar] User ID from JWT:", userId);
          } catch (e) {
            console.warn("[Campaign Toolbar] Failed to decode JWT:", e);
          }
        }
        
        console.log("[Campaign Toolbar] Final User ID:", userId);
        
        // PRIORITY 1: Check localStorage permissions FIRST (faster, no API call needed)
        if (user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
          console.log("[Campaign Toolbar] Found permissions in user object:", user.permissions);
          hasPermission = checkPermissionsArray(user.permissions);
          console.log("[Campaign Toolbar] Permission check result (localStorage):", hasPermission);
          if (hasPermission) {
            console.log("[Campaign Toolbar] Setting canCreateEvent to TRUE (from localStorage)");
            setCanCreateEvent(true);
            return;
          }
        }
        
        // PRIORITY 2: ALWAYS try API for most accurate permission data (since localStorage often doesn't have permissions)
        // First try /api/auth/me (doesn't require user ID, returns current user with permissions)
        if (token && API_URL) {
          try {
            const headers: any = { "Content-Type": "application/json" };
            headers["Authorization"] = `Bearer ${token}`;
            
            // Try /api/auth/me first (doesn't require user ID)
            console.log("[Campaign Toolbar] Fetching current user from /api/auth/me");
            const meRes = await fetch(`${API_URL}/api/auth/me`, {
              headers,
              credentials: "include",
            });
            
            if (meRes.ok) {
              const meBody = await meRes.json();
              console.log("[Campaign Toolbar] /api/auth/me response:", meBody);
              
              const meUser = meBody.user || meBody.data || meBody;
              const permissions = meUser?.permissions || [];
              
              console.log("[Campaign Toolbar] Extracted permissions from /api/auth/me:", permissions);
              
              hasPermission = checkPermissionsArray(permissions);
              
              console.log("[Campaign Toolbar] Permission check result (/api/auth/me):", hasPermission);
              
              if (hasPermission) {
                console.log("[Campaign Toolbar] Setting canCreateEvent to TRUE (from /api/auth/me)");
                setCanCreateEvent(true);
                return; // Early return if permission found via /api/auth/me
              }
            } else {
              console.warn("[Campaign Toolbar] /api/auth/me failed:", meRes.status, meRes.statusText);
            }
          } catch (meErr) {
            console.warn("[Campaign Toolbar] Failed to fetch from /api/auth/me:", meErr);
          }
        }
        
        // Fallback: Try /api/users/:userId/capabilities if we have userId
        if (userId && token && API_URL) {
            try {
              const headers: any = { "Content-Type": "application/json" };
              headers["Authorization"] = `Bearer ${token}`;
              
              console.log("[Campaign Toolbar] Fetching capabilities from API:", `${API_URL}/api/users/${userId}/capabilities`);
              const res = await fetch(`${API_URL}/api/users/${userId}/capabilities`, {
                headers,
                credentials: "include",
              });
              
              console.log("[Campaign Toolbar] API response status:", res.status, res.statusText);
              
              if (res.ok) {
                const body = await res.json();
                console.log("[Campaign Toolbar] API response body:", body);
                const capabilities = body.data?.capabilities || body.capabilities || body.data || [];
                
                console.log("[Campaign Toolbar] Extracted capabilities:", capabilities);
                
                // Check capabilities array
                hasPermission = checkPermissionsArray(capabilities);
                
                console.log("[Campaign Toolbar] Permission check result (API):", hasPermission);
                
                if (hasPermission) {
                  console.log("[Campaign Toolbar] Setting canCreateEvent to TRUE (from API)");
                  setCanCreateEvent(true);
                  return; // Early return if permission found via API
                }
              } else {
                const errorBody = await res.json().catch(() => ({}));
                console.error("[Campaign Toolbar] API error response:", res.status, errorBody);
              }
            } catch (apiErr) {
              console.error("[Campaign Toolbar] Failed to fetch capabilities from API:", apiErr);
              // Continue to check user object as fallback
            }
          } else if (!userId && token && API_URL) {
            console.warn("[Campaign Toolbar] Cannot call /api/users/:userId/capabilities - missing userId", {
              userId: !!userId,
              token: !!token,
              API_URL: !!API_URL
            });
          }
          
        // PRIORITY 3: Check roles for permissions
        if (user?.roles && Array.isArray(user.roles)) {
            // Try hasCapability utility for structured roles
            hasPermission = hasCapability(user, 'event.create') || hasCapability(user, 'request.create');
            if (hasPermission) {
              setCanCreateEvent(true);
              return;
            }
            
            // Also check if roles have permissions arrays
            for (const role of user.roles) {
              if (role && role.permissions && Array.isArray(role.permissions)) {
                hasPermission = checkPermissionsArray(role.permissions);
                if (hasPermission) {
                  setCanCreateEvent(true);
                  return;
                }
              }
            }
          }
          
        // PRIORITY 4: Check nested data structures
        if (user?.data && user.data.permissions) {
          hasPermission = checkPermissionsArray(user.data.permissions);
          if (hasPermission) {
            setCanCreateEvent(true);
            return;
          }
        }
        
        // If we get here, no permission was found - set to false
        console.log("[Campaign Toolbar] No permission found, setting canCreateEvent to false");
        setCanCreateEvent(false);
      } catch (err) {
        console.error("[Campaign Toolbar] Error checking create permission:", err);
        console.error("[Campaign Toolbar] Error stack:", err instanceof Error ? err.stack : "No stack trace");
        setCanCreateEvent(false);
      }
    };
    
    checkCreatePermission().catch((err) => {
      console.error("[Campaign Toolbar] Unhandled error in checkCreatePermission:", err);
      setCanCreateEvent(false);
    });
  }, [API_URL]);

  // Quick Filter States
  const [qEventType, setQEventType] = useState<string>("");
  const [qDateRange, setQDateRange] = useState<RangeValue<DateValue> | null>(
    null,
  );
  const [qProvince, setQProvince] = useState<string>("");
  const [qDistrict, setQDistrict] = useState<string>("");
  const [qMunicipality, setQMunicipality] = useState<string>("");
  const [qMunicipalitiesList, setQMunicipalitiesList] = useState<any[]>([]);

  // Modal states
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [isBloodDriveModalOpen, setIsBloodDriveModalOpen] = useState(false);
  const [isAdvocacyModalOpen, setIsAdvocacyModalOpen] = useState(false);
  // submission/loading states to prevent duplicate creates
  const [isTrainingSubmitting, setIsTrainingSubmitting] = useState(false);
  const [isBloodSubmitting, setIsBloodSubmitting] = useState(false);
  const [isAdvocacySubmitting, setIsAdvocacySubmitting] = useState(false);
  // error states for each modal
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [bloodDriveError, setBloodDriveError] = useState<string | null>(null);
  const [advocacyError, setAdvocacyError] = useState<string | null>(null);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [advTitle, setAdvTitle] = useState("");
  const [advCoordinator, setAdvCoordinator] = useState("");
  const [advStakeholder, setAdvStakeholder] = useState("");
  const [advCoordinatorOptions, setAdvCoordinatorOptions] = useState<
    { key: string; label: string }[]
  >([]);
  const [advStakeholderOptions, setAdvStakeholderOptions] = useState<
    { key: string; label: string }[]
  >([]);
  const [advDateRange, setAdvDateRange] =
    useState<RangeValue<DateValue> | null>(null);

  // Event type labels and descriptions
  const eventLabelsMap = {
    "blood-drive": "Blood Drive",
    training: "Training",
    advocacy: "Advocacy",
  };

  const eventDescriptionsMap = {
    "blood-drive": "Organize a blood donation event",
    training: "Schedule a training session",
    advocacy: "Create an advocacy campaign",
  };

  // Handle tab selection changes
  const handleTabChange = (key: React.Key) => {
    const tabKey = key.toString();

    setSelectedTab(tabKey);
    onTabChange?.(tabKey);
  };

  // Get selected event type value
  const selectedEventTypeValue = Array.from(selectedEventType)[0] as
    | string
    | undefined;
  const typedEventKey = selectedEventTypeValue as
    | keyof typeof eventLabelsMap
    | undefined;
  const currentEventLabel = typedEventKey
    ? eventLabelsMap[typedEventKey]
    : "Event";

  // Handle create event button click - opens appropriate modal
  const handleCreateEventClick = () => {
    // Clear errors when opening modals
    setTrainingError(null);
    setBloodDriveError(null);
    setAdvocacyError(null);
    switch (selectedEventTypeValue) {
      case "blood-drive":
        setIsBloodDriveModalOpen(true);
        break;
      case "training":
        setIsTrainingModalOpen(true);
        break;
      case "advocacy":
        setIsAdvocacyModalOpen(true);
        break;
    }
  };

  // Handle modal confirmations
  const handleTrainingEventConfirm = async (data: any) => {
    if (!onCreateEvent) return;
    setIsTrainingSubmitting(true);
    setTrainingError(null); // Clear previous errors
    try {
      await onCreateEvent("training", data);
      setIsTrainingModalOpen(false);
      setTrainingError(null); // Clear error on success
    } catch (err: any) {
      // Capture error message and display in modal
      const errorMessage = err?.message || "Failed to create training event";

      setTrainingError(errorMessage);
    } finally {
      setIsTrainingSubmitting(false);
    }
  };

  const handleBloodDriveEventConfirm = async (data: any) => {
    if (!onCreateEvent) return;
    setIsBloodSubmitting(true);
    setBloodDriveError(null); // Clear previous errors
    try {
      await onCreateEvent("blood-drive", data);
      setIsBloodDriveModalOpen(false);
      setBloodDriveError(null); // Clear error on success
    } catch (err: any) {
      // Capture error message and display in modal
      const errorMessage = err?.message || "Failed to create blood drive event";

      setBloodDriveError(errorMessage);
    } finally {
      setIsBloodSubmitting(false);
    }
  };

  const handleAdvocacyEventConfirm = async (data: any) => {
    if (!onCreateEvent) return;
    setIsAdvocacySubmitting(true);
    setAdvocacyError(null); // Clear previous errors
    try {
      await onCreateEvent("advocacy", data);
      setIsAdvocacyModalOpen(false);
      setAdvocacyError(null); // Clear error on success
    } catch (err: any) {
      // Capture error message and display in modal
      const errorMessage = err?.message || "Failed to create advocacy event";

      setAdvocacyError(errorMessage);
    } finally {
      setIsAdvocacySubmitting(false);
    }
  };

  // Helper to apply quick filter
  const applyQuickFilter = (
    eventType: string,
    dateRange: RangeValue<DateValue> | null,
    province: string,
    district: string,
    municipality: string,
  ) => {
    const filter: any = {};

    if (eventType && eventType !== "all") filter.category = eventType;
    if (dateRange) {
      filter.startDate = dateRange.start.toString();
      filter.endDate = dateRange.end.toString();
    }
    if (province) filter.province = province;
    if (district) filter.district = district;
    if (municipality) filter.municipality = municipality;
    onQuickFilter?.(filter);
  };

  // Helper to clear all quick filters
  const clearAllFilters = () => {
    setQEventType("");
    setQDateRange(null);
    setQProvince("");
    setQDistrict("");
    setQMunicipality("");
    applyQuickFilter("", null, "", "", "");
  };

  // Fetch coordinators for advanced filter when modal opens
  useEffect(() => {
    const fetchCoordinators = async () => {
      try {
        const rawUser = localStorage.getItem("unite_user");
        const token =
          localStorage.getItem("unite_token") ||
          sessionStorage.getItem("unite_token");
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const user = rawUser ? JSON.parse(rawUser) : null;
        const info = getUserInfo();

        // Check if user has permission to view coordinators (typically admins or users with request.review permission)
        // Use permission-based check instead of hardcoded role checks
        const hasReviewPermission = user && (hasCapability(user, 'request.review') || hasCapability(user, 'request.*') || hasCapability(user, '*'));
        const isAdmin = !!(info && info.isAdmin) || (user && (user.authority >= 80 || user.isSystemAdmin));
        
        if (user && (isAdmin || hasReviewPermission)) {
          // Use new API endpoint for coordinators
          // Coordinators should have request.create capability AND authority >= 60 and < 80
          try {
            const res = await fetch(`${API_URL}/api/users/by-capability?capability=request.create`, {
              headers,
              credentials: "include",
            });
            
            if (!res.ok) {
              const errorBody = await res.json().catch(() => ({}));
              console.error("[Campaign Toolbar] Failed to fetch coordinators:", res.status, res.statusText, errorBody);
              setAdvCoordinatorOptions([]);
              return;
            }
            
            const body = await res.json();
            // API returns { success: true, data: [array of users] }
            const list = Array.isArray(body.data) ? body.data : (body.data?.users || body.users || []);
            
            // Additional client-side filtering to ensure only coordinators (authority >= 60 and < 80)
            // This is a safety measure in case backend filtering isn't perfect
            const coordinatorList = list.filter((c: any) => {
              const authority = c.authority || 20;
              return authority >= 60 && authority < 80;
            });
            
            if (coordinatorList.length === 0) {
              console.warn("[Campaign Toolbar] No coordinators found after filtering (authority >= 60 and < 80). Total users from API:", list.length);
            }
            
            const opts = (Array.isArray(coordinatorList) ? coordinatorList : []).map((c: any) => {
              // Get human-readable name from various possible fields
              const firstName = c.firstName || c.First_Name || c.first_name || "";
              const lastName = c.lastName || c.Last_Name || c.last_name || "";
              const fullName = `${firstName} ${lastName}`.trim() || c.name || c.Name || "Unknown Coordinator";
              const userId = String(c._id || c.id || "");
              
              // Get district info from coverage areas if available
              let districtLabel = "";
              if (c.coverageAreas && c.coverageAreas.length > 0) {
                const firstCoverage = c.coverageAreas[0];
                if (firstCoverage.districtIds && firstCoverage.districtIds.length > 0) {
                  districtLabel = ` - District ${firstCoverage.districtIds[0]}`;
                } else if (firstCoverage.districtName) {
                  districtLabel = ` - ${firstCoverage.districtName}`;
                }
              }

              return {
                key: userId,
                label: `${fullName}${districtLabel}`,
              };
            });

            setAdvCoordinatorOptions(opts);
            console.log(`[Campaign Toolbar] Loaded ${opts.length} coordinators`);
          } catch (err) {
            console.error("[Campaign Toolbar] Error fetching coordinators:", err);
            setAdvCoordinatorOptions([]);
          }
        }

        // For non-admin users, try to get their coordinator ID from user object
        // This is for users who are coordinators themselves or have coordinator assignments
        if (user && !isAdmin && !hasReviewPermission) {
          // Try to get coordinator ID from various possible fields
          const candidateIds: Array<string | number | undefined> = [
            user.id || user._id,
            user.Coordinator_ID,
            user.CoordinatorId,
            user.CoordinatorID,
            user.role_data?.coordinator_id,
            info?.raw?.Coordinator_ID,
            info?.raw?.CoordinatorId,
          ];

          let coordId = candidateIds.find(Boolean) as string | undefined;

          if (!coordId) {
            try {
              const t =
                token ||
                (typeof window !== "undefined"
                  ? localStorage.getItem("unite_token") ||
                    sessionStorage.getItem("unite_token")
                  : null);
              const payload = decodeJwt(t);

              if (payload) {
                coordId = payload.coordinator_id || payload.Coordinator_ID;
              }
            } catch (e) {}
          }

          if (coordId) {
            try {
              let resolvedCoordId = String(coordId);

              if (/^stkh_/i.test(resolvedCoordId)) {
                // If it's a stakeholder ID, fetch the stakeholder to get coordinator
                const stRes = await fetch(
                  `${API_URL}/api/stakeholders/${encodeURIComponent(resolvedCoordId)}`,
                  { headers, credentials: "include" },
                );
                const stBody = await stRes.json();

                if (stRes.ok && stBody.data) {
                  const st = stBody.data;
                  resolvedCoordId = st.coordinator_id || st.Coordinator_ID || st.CoordinatorId;
                }
              }

              const res = await fetch(
                `${API_URL}/api/coordinators/${encodeURIComponent(resolvedCoordId)}`,
                { headers, credentials: "include" },
              );
              const body = await res.json();

              if (res.ok && body.data) {
                const c = body.data;
                const staff = c.Staff || c.staff || null;
                const district = c.District || c.district || null;
                const fullName = staff
                  ? [staff.First_Name, staff.Middle_Name, staff.Last_Name]
                      .filter(Boolean)
                      .join(" ")
                      .trim()
                  : c.StaffName || c.label || c.firstName || c.First_Name || c.name || c.Name || "Unknown Coordinator";
                const districtLabel = district?.District_Number
                  ? `District ${district.District_Number}`
                  : district?.District_Name || "";

                const coordinatorId = String(c.Coordinator_ID || (staff && staff.ID) || c.id || c._id || "");
                setAdvCoordinatorOptions([{
                  key: coordinatorId,
                  label: `${fullName}${districtLabel ? " - " + districtLabel : ""}`,
                }]);
              }
            } catch (e) {
              console.error("Failed to fetch coordinator by id", coordId, e);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch coordinators", err);
      }
    };

    if (isAdvancedModalOpen) {
      fetchCoordinators();
    }
  }, [isAdvancedModalOpen]);

  // Load stakeholders for selected coordinator when coordinator changes
  useEffect(() => {
    const fetchStakeholdersForCoordinator = async () => {
      try {
        if (!advCoordinator) {
          setAdvStakeholderOptions([]);
          return;
        }

        const token =
          localStorage.getItem("unite_token") ||
          sessionStorage.getItem("unite_token");
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Fetch stakeholders using new API
        // Pass coordinatorId to use coordinator's full jurisdiction (all municipalities from all coverage areas)
        // Backend will use jurisdiction service to filter stakeholders properly
        const stRes = await fetch(
          `${API_URL}/api/users/by-capability?capability=request.review&coordinatorId=${encodeURIComponent(String(advCoordinator))}`,
          { headers, credentials: "include" },
        );
        
        const stBody = await stRes.json();

        if (stRes.ok) {
          // API returns { success: true, data: [array of users] }
          const list = Array.isArray(stBody.data) ? stBody.data : (stBody.data?.users || stBody.users || []);
          
          // Filter to only stakeholders: authority < 60
          // This ensures we only show stakeholders, not coordinators or admins
          const stakeholderList = (Array.isArray(list) ? list : []).filter((s: any) => {
            const authority = s.authority || 20;
            return authority < 60;
          });
          
          const opts = stakeholderList.map((s: any) => {
            // Get human-readable name from various possible fields
            const firstName = s.firstName || s.First_Name || s.first_name || "";
            const lastName = s.lastName || s.Last_Name || s.last_name || "";
            const fullName = `${firstName} ${lastName}`.trim() || s.name || s.Name || "Unknown Stakeholder";
            const userId = String(s._id || s.id || "");
            
            return {
              key: userId,
              label: fullName,
            };
          });

          setAdvStakeholderOptions(opts);
          if (advStakeholder && !opts.find((o: any) => o.key === advStakeholder)) {
            setAdvStakeholder("");
          }
          console.log(`[CampaignToolbar] Loaded ${opts.length} stakeholders (filtered from ${list.length} total users)`);
        } else {
          console.warn("Failed to load stakeholders:", stBody.message || "Unknown error");
          setAdvStakeholderOptions([]);
        }
      } catch (err) {
        console.warn("Failed to load stakeholders", err);
        setAdvStakeholderOptions([]);
      }
    };

    fetchStakeholdersForCoordinator();
  }, [advCoordinator]);

  return (
    <>
      <div className="w-full bg-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between px-6 py-3 gap-3 overflow-visible pr-6 z-20">
          {/* First Row: Tabs and Action Buttons (mobile) / Tabs and Pagination (desktop) */}
          <div className="flex flex-row items-center justify-between gap-3 w-full md:flex-1 md:min-w-0">
            {/* Status Tabs */}
            <div className="min-w-0 overflow-x-auto flex-1">
              <Tabs
                classNames={{
                  tabList: "bg-gray-100 p-1",
                  cursor: "bg-white shadow-sm",
                  tabContent:
                    "group-data-[selected=true]:text-gray-900 text-xs font-medium",
                }}
                radius="md"
                selectedKey={selectedTab}
                size="sm"
                variant="solid"
                onSelectionChange={handleTabChange}
              >
                <Tab
                  key="all"
                  title={counts.all > 0 ? `All (${counts.all})` : "All"}
                />
                <Tab
                  key="approved"
                  title={
                    counts.approved > 0
                      ? `Approved (${counts.approved})`
                      : "Approved"
                  }
                />
                <Tab
                  key="pending"
                  title={
                    counts.pending > 0 ? `Pending (${counts.pending})` : "Pending"
                  }
                />
                <Tab
                  key="rejected"
                  title={
                    counts.rejected > 0
                      ? `Rejected (${counts.rejected})`
                      : "Rejected"
                  }
                />
              </Tabs>
            </div>

            {/* Pagination - Desktop only (shown on same row as tabs) */}
            {totalPages > 1 && (
              <div className="hidden md:flex items-center gap-1">
                {/* Previous Button */}
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  isDisabled={currentPage === 1}
                  onPress={() => onPageChange(currentPage - 1)}
                  className="min-w-8 h-8"
                >
                  ‹
                </Button>

                {/* Page Numbers with ellipsis logic */}
                {(() => {
                  const pages = [];
                  const maxVisible = 4; // Maximum number of page buttons to show

                  if (totalPages <= maxVisible + 1) {
                    // If total pages is small, show all pages
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    // Always start with page 1
                    pages.push(1);

                    // Calculate how many pages we can show in the middle
                    const remainingSlots = maxVisible - 2; // -2 for first and last page
                    const sidePages = Math.floor(remainingSlots / 2);

                    // Calculate range around current page
                    let startRange = Math.max(2, currentPage - sidePages);
                    let endRange = Math.min(totalPages - 1, currentPage + sidePages);

                    // Adjust to ensure we show the right number of pages
                    const actualRange = endRange - startRange + 1;
                    if (actualRange < remainingSlots) {
                      if (startRange === 2) {
                        endRange = Math.min(totalPages - 1, endRange + (remainingSlots - actualRange));
                      } else if (endRange === totalPages - 1) {
                        startRange = Math.max(2, startRange - (remainingSlots - actualRange));
                      }
                    }

                    // Add ellipsis after 1 if there's a gap
                    if (startRange > 2) {
                      pages.push('...');
                    }

                    // Add the range
                    for (let i = startRange; i <= endRange; i++) {
                      pages.push(i);
                    }

                    // Add ellipsis before last page if there's a gap
                    if (endRange < totalPages - 1) {
                      pages.push('...');
                    }

                    // Always end with last page
                    pages.push(totalPages);
                  }

                  // Render the pages
                  return pages.map((page, index) => {
                    if (page === '...') {
                      return (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                          ...
                        </span>
                      );
                    }
                    return (
                      <Button
                        key={page}
                        size="sm"
                        variant={currentPage === page ? "solid" : "light"}
                        color={currentPage === page ? "primary" : "default"}
                        onPress={() => onPageChange(page as number)}
                        className="min-w-8 h-8 px-2"
                      >
                        {page}
                      </Button>
                    );
                  });
                })()}

                {/* Next Button */}
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  isDisabled={currentPage === totalPages}
                  onPress={() => onPageChange(currentPage + 1)}
                  className="min-w-8 h-8"
                >
                  ›
                </Button>
              </div>
            )}

            {/* Right side - Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0 overflow-visible md:pr-2">
            {/* Export Button */}
            {/*<Button
              <Button
                className=" border-default-200 bg-white font-medium text-xs"
                radius="md"
                size="sm"
                startContent={<ArrowDownToSquare className="w-4 h-4" />}
                variant="bordered"
                onPress={onExport}
              >
                Export
              </Button>
            </Button>*/}

            {/* Quick Filter Popover (mimicking a custom dropdown) */}
            <Popover offset={10} placement="bottom" showArrow>
              <PopoverTrigger>
                <Button
                  className=" border-default-200 bg-white font-medium text-xs hidden sm:inline-flex"
                  endContent={<ChevronDown className="w-3 h-3" />}
                  radius="md"
                  size="sm"
                  startContent={<Funnel className="w-4 h-4" />}
                  variant="bordered"
                >
                  Quick Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-4">
                <div className="w-full space-y-4">
                  <div className="text-xs">Quick Filter</div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Event Type</label>
                    <Select
                      className="h-9"
                      placeholder="Pick an event type"
                      selectedKeys={qEventType ? [qEventType] : []}
                      size="sm"
                      radius="md"
                      variant="bordered"
                      onChange={(e) => {
                        const val = e.target.value;

                        setQEventType(val);
                        applyQuickFilter(val, qDateRange, qProvince, qDistrict, qMunicipality);
                      }}
                    >
                      <SelectItem key="all">
                        All
                      </SelectItem>
                      <SelectItem key="Blood Drive">
                        Blood Drive
                      </SelectItem>
                      <SelectItem key="Training">
                        Training
                      </SelectItem>
                      <SelectItem key="Advocacy">
                        Advocacy
                      </SelectItem>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Date Range</label>
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
                      onChange={(val) => {
                        setQDateRange(val);
                        applyQuickFilter(qEventType, val, qProvince, qDistrict, qMunicipality);
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Province</label>
                    <Select
                      className="h-9"
                      placeholder="Pick a province"
                      selectedKeys={qProvince ? [qProvince] : []}
                      size="sm"
                      variant="bordered"
                      radius="md"
                      onChange={(e) => {
                        const val = e.target.value;

                        setQProvince(val);
                        // Fetch districts
                        onDistrictFetch?.(val);
                        // Clear district and municipality
                        setQDistrict("");
                        setQMunicipality("");
                        setQMunicipalitiesList([]);
                        applyQuickFilter(qEventType, qDateRange, val, "", "");
                      }}
                    >
                      {provinces && provinces.length > 0 ? (
                        provinces.map((p) => {
                          const provinceId = String(p._id || p.id || '');
                          const provinceName = String(p.name || p.Name || 'Unknown Province');
                          return (
                            <SelectItem key={provinceId}>
                              {provinceName}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem key="no-provinces" isDisabled>
                          No provinces available
                        </SelectItem>
                      )}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium ">District</label>
                    <Select
                      className="h-9"
                      isDisabled={!qProvince}
                      placeholder={qProvince ? "Pick a district" : "Select a province first"}
                      selectedKeys={qDistrict ? [qDistrict] : []}
                      size="sm"
                      variant="bordered"
                      radius="md"
                      onChange={async (e) => {
                        const val = e.target.value;

                        setQDistrict(val);
                        setQMunicipality("");
                        
                        // Fetch municipalities for selected district
                        if (val) {
                          try {
                            const token =
                              localStorage.getItem("unite_token") ||
                              sessionStorage.getItem("unite_token");
                            const headers: any = { "Content-Type": "application/json" };
                            if (token) headers["Authorization"] = `Bearer ${token}`;

                            const res = await fetch(`${API_URL}/api/locations/districts/${val}/municipalities`, {
                              headers,
                              credentials: "include",
                            });
                            const body = await res.json();

                            if (res.ok && body.data) {
                              const municipalitiesList = Array.isArray(body.data) ? body.data : [];
                              setQMunicipalitiesList(municipalitiesList);
                            } else {
                              // Fallback: use provider's cached municipalities
                              const municipalitiesFromProvider = getMunicipalitiesForDistrict(val);
                              setQMunicipalitiesList(municipalitiesFromProvider);
                            }
                          } catch (err) {
                            console.error("Error fetching municipalities:", err);
                            // Fallback: use provider's cached municipalities
                            const municipalitiesFromProvider = getMunicipalitiesForDistrict(val);
                            setQMunicipalitiesList(municipalitiesFromProvider);
                          }
                        } else {
                          setQMunicipalitiesList([]);
                        }
                        
                        applyQuickFilter(
                          qEventType,
                          qDateRange,
                          qProvince,
                          val,
                          "",
                        );
                      }}
                    >
                      {districts && districts.length > 0 ? (
                        districts.map((d) => {
                          const districtId = String(d._id || d.id || '');
                          const districtName = String(d.name || d.Name || 'Unknown District');
                          return (
                            <SelectItem key={districtId}>
                              {districtName}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem key="no-districts" isDisabled>
                          {qProvince ? "No districts available" : "Select a province first"}
                        </SelectItem>
                      )}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Municipality</label>
                    <Select
                      className="h-9"
                      isDisabled={!qDistrict}
                      placeholder={qDistrict ? "Pick a municipality" : "Select a district first"}
                      selectedKeys={qMunicipality ? [qMunicipality] : []}
                      size="sm"
                      variant="bordered"
                      radius="md"
                      onChange={(e) => {
                        const val = e.target.value;

                        setQMunicipality(val);
                        applyQuickFilter(qEventType, qDateRange, qProvince, qDistrict, val);
                      }}
                    >
                      {qMunicipalitiesList && qMunicipalitiesList.length > 0 ? (
                        qMunicipalitiesList.map((m) => {
                          const municipalityId = String(m._id || m.id || '');
                          const municipalityName = String(m.name || m.Name || 'Unknown Municipality');
                          return (
                            <SelectItem key={municipalityId}>
                              {municipalityName}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem key="no-municipalities" isDisabled>
                          {qDistrict ? "No municipalities available" : "Select a district first"}
                        </SelectItem>
                      )}
                    </Select>
                  </div>

                  <Button
                    className="w-full mt-4"
                    color="default"
                    size="sm"
                    variant="bordered"
                    onPress={clearAllFilters}
                  >
                    Clear All Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Advanced Filter opens modal */}
            <Button
              className=" border-default-200 bg-white font-medium text-xs hidden sm:inline-flex"
              endContent={<ChevronDown className="w-3 h-3" />}
              radius="md"
              size="sm"
              startContent={<Wrench className="w-4 h-4" />}
              variant="bordered"
              onPress={() => setIsAdvancedModalOpen(true)}
            >
              Advanced Filter
            </Button>

            {/* Removed separate mobile funnel icon to free space on small screens */}

            {/* Create Event Button Group with Dropdown Menu*/}
            <Tooltip
              content={canCreateEvent ? undefined : "You don't have permission to create events or requests"}
              isDisabled={canCreateEvent}
            >
              <ButtonGroup radius="md" size="sm" variant="solid" className="flex-shrink-0 overflow-visible mr-3 relative z-50">
                {/* Full button for desktop/tablet */}
                <Button
                  color="primary"
                  className="hidden sm:inline-flex items-center gap-2 rounded-l-md"
                  radius="md"
                  size="sm"
                  startContent={<Ticket className="w-4 h-4" />}
                  onPress={handleCreateEventClick}
                  isDisabled={!canCreateEvent}
                  style={{ borderTopLeftRadius: "0.75rem", borderBottomLeftRadius: "0.75rem", borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                >
                  {currentEventLabel}
                </Button>

                {/* Compact icon-only button for small screens */}
                <Button
                  color="primary"
                  isIconOnly
                  radius="md"
                  size="sm"
                  className="inline-flex sm:hidden h-8 w-8 items-center justify-center rounded-l-md"
                  onPress={handleCreateEventClick}
                  isDisabled={!canCreateEvent}
                  aria-label={`Create ${currentEventLabel}`}
                  style={{ borderTopLeftRadius: "0.75rem", borderBottomLeftRadius: "0.75rem", borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </Button>
                <Dropdown placement="bottom-end" isDisabled={!canCreateEvent}>
                  <DropdownTrigger>
                    <Button 
                      isIconOnly 
                      color="primary" 
                      className="h-8 w-8 rounded-r-md" 
                      size="sm" 
                      isDisabled={!canCreateEvent}
                      style={{ borderTopRightRadius: "0.75rem", borderBottomRightRadius: "0.75rem", borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownTrigger>
                <DropdownMenu
                  disallowEmptySelection
                  aria-label="Event type options"
                  className="max-w-2xl"
                  selectedKeys={selectedEventType}
                  selectionMode="single"
                  onSelectionChange={(keys: any) => {
                    // Convert the incoming selection (SharedSelection) to Set<string>
                    try {
                      const arr = Array.from(keys as Iterable<any>);

                      setSelectedEventType(new Set(arr.map(String)));
                    } catch {
                      // fallback: clear selection
                      setSelectedEventType(new Set());
                    }
                  }}
                >
                  <DropdownItem
                    key="blood-drive"
                    description={eventDescriptionsMap["blood-drive"]}
                  >
                    {eventLabelsMap["blood-drive"]}
                  </DropdownItem>
                  <DropdownItem
                    key="training"
                    description={eventDescriptionsMap["training"]}
                  >
                    {eventLabelsMap["training"]}
                  </DropdownItem>
                  <DropdownItem
                    key="advocacy"
                    description={eventDescriptionsMap["advocacy"]}
                  >
                    {eventLabelsMap["advocacy"]}
                  </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </ButtonGroup>
            </Tooltip>
          </div>
        </div>

        {/* Mobile Pagination - Shown below tabs and buttons on mobile */}
        {totalPages > 1 && (
          <div className="flex md:hidden items-center justify-center gap-1 w-full px-6 pb-2">
            {/* Previous Button */}
            <Button
              isIconOnly
              size="sm"
              variant="light"
              isDisabled={currentPage === 1}
              onPress={() => onPageChange(currentPage - 1)}
              className="min-w-8 h-8"
            >
              ‹
            </Button>

            {/* Page Numbers with ellipsis logic */}
            {(() => {
              const pages = [];
              const maxVisible = 4; // Maximum number of page buttons to show

              if (totalPages <= maxVisible + 1) {
                // If total pages is small, show all pages
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Always start with page 1
                pages.push(1);

                // Calculate how many pages we can show in the middle
                const remainingSlots = maxVisible - 2; // -2 for first and last page
                const sidePages = Math.floor(remainingSlots / 2);

                // Calculate range around current page
                let startRange = Math.max(2, currentPage - sidePages);
                let endRange = Math.min(totalPages - 1, currentPage + sidePages);

                // Adjust to ensure we show the right number of pages
                const actualRange = endRange - startRange + 1;
                if (actualRange < remainingSlots) {
                  if (startRange === 2) {
                    endRange = Math.min(totalPages - 1, endRange + (remainingSlots - actualRange));
                  } else if (endRange === totalPages - 1) {
                    startRange = Math.max(2, startRange - (remainingSlots - actualRange));
                  }
                }

                // Add ellipsis after 1 if there's a gap
                if (startRange > 2) {
                  pages.push('...');
                }

                // Add the range
                for (let i = startRange; i <= endRange; i++) {
                  pages.push(i);
                }

                // Add ellipsis before last page if there's a gap
                if (endRange < totalPages - 1) {
                  pages.push('...');
                }

                // Always end with last page
                pages.push(totalPages);
              }

              // Render the pages
              return pages.map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-mobile-${index}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  );
                }
                return (
                  <Button
                    key={`mobile-${page}`}
                    size="sm"
                    variant={currentPage === page ? "solid" : "light"}
                    color={currentPage === page ? "primary" : "default"}
                    onPress={() => onPageChange(page as number)}
                    className="min-w-8 h-8 px-2"
                  >
                    {page}
                  </Button>
                );
              });
            })()}

            {/* Next Button */}
            <Button
              isIconOnly
              size="sm"
              variant="light"
              isDisabled={currentPage === totalPages}
              onPress={() => onPageChange(currentPage + 1)}
              className="min-w-8 h-8"
            >
              ›
            </Button>
          </div>
        )}
        </div>
      </div>

      {/* Event Creation Modals */}
      <CreateTrainingEventModal
        error={trainingError}
        isOpen={isTrainingModalOpen}
        isSubmitting={isTrainingSubmitting}
        onClose={() => {
          setIsTrainingModalOpen(false);
          setTrainingError(null); // Clear error when closing
        }}
        onConfirm={handleTrainingEventConfirm}
      />

      <CreateBloodDriveEventModal
        error={bloodDriveError}
        isOpen={isBloodDriveModalOpen}
        isSubmitting={isBloodSubmitting}
        onClose={() => {
          setIsBloodDriveModalOpen(false);
          setBloodDriveError(null); // Clear error when closing
        }}
        onConfirm={handleBloodDriveEventConfirm}
      />

      <CreateAdvocacyEventModal
        error={advocacyError}
        isOpen={isAdvocacyModalOpen}
        isSubmitting={isAdvocacySubmitting}
        onClose={() => {
          setIsAdvocacyModalOpen(false);
          setAdvocacyError(null); // Clear error when closing
        }}
        onConfirm={handleAdvocacyEventConfirm}
      />
      {/* Advanced Filter Modal */}
      <Modal
        isOpen={isAdvancedModalOpen}
        placement="center"
        size="md"
        onClose={() => setIsAdvancedModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Avatar
                className="bg-default-100 border-1 border-default"
                icon={<Wrench />}
              />
            </div>
            <h3 className="text-sm font-semibold py-2">Advanced Filter</h3>
            <p className="text-xs font-normal">
              Start providing your information by selecting your blood type. Add
              details below to proceed.
            </p>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-12">
              {/* Event Details Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold">Event Details</h4>

                <div className="h-px w-full bg-default"></div>

                {/* Title */}
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium">Title</label>
                  <Input
                    classNames={{
                      inputWrapper: "h-9 border-default-200",
                    }}
                    placeholder="Enter event title"
                    radius="md"
                    size="sm"
                    value={advTitle}
                    variant="bordered"
                    onValueChange={setAdvTitle}
                  />
                </div>

                {/* Coordinator */}
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium">Coordinator</label>
                  <Select
                    className="h-9"
                    classNames={{ trigger: "h-9 border-default-200" }}
                    placeholder="Pick a coordinator"
                    radius="md"
                    selectedKeys={advCoordinator ? [advCoordinator] : []}
                    size="sm"
                    variant="bordered"
                    onChange={(e) => {
                      setAdvCoordinator(e.target.value);
                      setAdvStakeholder("");
                    }}
                  >
                    {advCoordinatorOptions.map((c) => (
                      <SelectItem key={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Stakeholder */}
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium">Stakeholder</label>
                  <Select
                    className="h-9"
                    classNames={{ trigger: "h-9 border-default-200" }}
                    placeholder={advCoordinator ? "Pick a stakeholder" : "Select a coordinator first"}
                    radius="md"
                    selectedKeys={advStakeholder ? [advStakeholder] : []}
                    size="sm"
                    variant="bordered"
                    isDisabled={!advCoordinator}
                    onChange={(e) => setAdvStakeholder(e.target.value)}
                  >
                    {advStakeholderOptions.map((s) => (
                      <SelectItem key={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Date Range */}
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium">Date Range</label>
                  <DateRangePicker
                    className="w-full"
                    classNames={{
                      inputWrapper: "h-9 border-default-200",
                    }}
                    radius="md"
                    size="sm"
                    value={advDateRange}
                    variant="bordered"
                    onChange={setAdvDateRange}
                  />
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              className="flex-1"
              color="default"
              variant="bordered"
              radius="md"
              onPress={() => {
                setAdvTitle("");
                setAdvCoordinator("");
                setAdvStakeholder("");
                setAdvDateRange(null);
                onAdvancedFilter?.({});
                setIsAdvancedModalOpen(false);
              }}
            >
              Clear Filters
            </Button>
            <Button
              className="flex-1"
              color="primary"
              radius="md"
              onPress={() => {
                onAdvancedFilter?.({
                  title: advTitle || undefined,
                  coordinator: advCoordinator || undefined,
                  stakeholder: advStakeholder || undefined,
                  start: advDateRange?.start?.toString(),
                  end: advDateRange?.end?.toString(),
                });
                setIsAdvancedModalOpen(false);
              }}
            >
              Apply
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
