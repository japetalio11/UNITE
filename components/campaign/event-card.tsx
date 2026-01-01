"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DatePicker } from "@heroui/date-picker";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";
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
import { Avatar } from "@heroui/avatar";
import { Spinner } from "@heroui/spinner";
import {
  EllipsisVertical,
  Eye,
  Pencil,
  Clock,
  TrashBin,
  Check,
  Xmark,
  Persons,
  FileText,
} from "@gravity-ui/icons";

import ManageStaffModal from "../modals/manage-staff-modal";
import EventActionMenu from "./event-action-menu";
import RescheduleModal from "./reschedule-modal";
import ConfirmModal from "./confirm-modal";
import {
  performRequestAction as svcPerformRequestAction,
  performConfirmAction as svcPerformConfirmAction,
  performStakeholderConfirm as svcPerformStakeholderConfirm,
  performCoordinatorConfirm,
  fetchRequestDetails as svcFetchRequestDetails,
  deleteRequest as svcDeleteRequest,
} from "./services/requestsService";

import { useLocations } from "../providers/locations-provider";

import { fetchWithAuth } from "@/utils/fetchWithAuth";

import {
  useAllowedActionSet,
  hasAllowedActionFactory,
  getViewer,
  getViewerId,
  formatDate,
} from "./event-card.utils";

import {
  BOOLEAN_FLAG_TO_ACTION,
  ACTION_SYNONYMS,
  FALLBACK_ACTION_MAP,
  API_BASE,
} from "./event-card.constants";

interface EventCardProps {
  title: string;
  organization: string;
  organizationType: string;
  district: string;
  category: string;
  status: "Approved" | "Pending" | "Rejected" | "Cancelled" | "Completed";
  location: string;
  date: string;
  onViewEvent?: () => void;
  onEditEvent?: () => void;
  // currentDate: the existing event date (display only)
  // rescheduledDate: the new chosen date (ISO string or date-only)
  // note: reason for reschedule
  onRescheduleEvent?: (
    currentDate: string,
    rescheduledDate: string,
    note: string,
  ) => void;
  onManageStaff?: () => void;
  request?: any;
  onCancelEvent?: () => void;
  onAcceptEvent?: (note?: string) => void;
  onRejectEvent?: (reqObj: any, note?: string) => void;
  onConfirmEvent?: () => void;
}

/**
 * EventCard Component
 * Displays summarized event details in a clean card layout with dropdown menu.
 */
const EventCard: React.FC<EventCardProps> = ({
  title,
  organization,
  organizationType,
  district,
  category,
  status,
  location,
  date,
  onViewEvent,
  onEditEvent,
  onRescheduleEvent,
  onManageStaff,
  request,
  onCancelEvent,
  onAcceptEvent,
  onRejectEvent,
  onConfirmEvent,
}) => {
  // Dialog state management
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [manageStaffOpen, setManageStaffOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [fullRequest, setFullRequest] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Ref-based locks to prevent race conditions (set synchronously before state updates)
  const isAcceptingRef = React.useRef(false);
  const isConfirmingRef = React.useRef(false);
  const isRejectingRef = React.useRef(false);
  const isReschedulingRef = React.useRef(false);

  const { getDistrictName, getProvinceName, locations } = useLocations();

  // Resolve district and province names using the centralized provider
  // Enhanced to handle ObjectId references and nested location structures
  const resolvedGeo = useMemo(() => {
    // Helper to extract ObjectId from various formats
    const extractId = (val: any): string | null => {
      if (!val && val !== 0) return null;
      
      // Handle Mongo Extended JSON format: { "$oid": "..." }
      if (typeof val === "object" && val !== null) {
        if (val.$oid) {
          return String(val.$oid);
        }
        // Populated object with _id
        if (val._id) {
          // Handle nested _id that might also be in Mongo Extended JSON format
          if (typeof val._id === "object" && val._id.$oid) {
            return String(val._id.$oid);
          }
          return String(val._id);
        }
        // Direct ObjectId reference (try toString)
        if (val.toString && typeof val.toString === "function") {
          const str = val.toString();
          if (/^[a-f0-9]{24}$/i.test(str)) {
            return str;
          }
        }
      }
      
      // Handle string ObjectId
      if (typeof val === "string") {
        if (/^[a-f0-9]{24}$/i.test(val)) return val;
      }
      
      return null;
    };

    // Check multiple paths for district and province
    let districtId = 
      extractId(request?.district) ||
      extractId(request?.location?.district) ||
      extractId(request?.event?.district) ||
      extractId((request as any)?.district) ||
      null;

    let provinceId = 
      extractId(request?.province) ||
      extractId(request?.location?.province) ||
      extractId(request?.event?.province) ||
      extractId((request as any)?.province) ||
      null;

    // Fallback: If location is missing, try to derive from coordinator's coverage area
    // This works if backend enriches the request with coordinator location data
    if (!districtId || !provinceId) {
      // Check reviewer's location (if enriched by backend)
      const reviewer = request?.reviewer;
      if (reviewer) {
        // Check if reviewer has location data in coverageAreas (if backend enriches)
        const reviewerDistrictId = extractId(reviewer.district) || 
                                   extractId(reviewer.coverageArea?.districtIds?.[0]) ||
                                   extractId((reviewer as any)?.location?.district);
        const reviewerProvinceId = extractId(reviewer.province) ||
                                   extractId(reviewer.coverageArea?.province) ||
                                   extractId((reviewer as any)?.location?.province);

        if (!districtId && reviewerDistrictId) {
          districtId = reviewerDistrictId;
        }
        if (!provinceId && reviewerProvinceId) {
          provinceId = reviewerProvinceId;
        }

        // If we have reviewer userId, check if it's populated with location data
        if (reviewer.userId && typeof reviewer.userId === "object") {
          const coordUser = reviewer.userId as any;
          const coordDistrictId = extractId(coordUser.coverageAreas?.[0]?.districtIds?.[0]) ||
                                 extractId(coordUser.locations?.district);
          const coordProvinceId = extractId(coordUser.coverageAreas?.[0]?.province) ||
                                 extractId(coordUser.locations?.province);

          if (!districtId && coordDistrictId) {
            districtId = coordDistrictId;
          }
          if (!provinceId && coordProvinceId) {
            provinceId = coordProvinceId;
          }
        }
      }

      // Check assignedCoordinator (alternative field)
      const assignedCoord = request?.assignedCoordinator;
      if (assignedCoord) {
        const coordDistrictId = extractId(assignedCoord.district) ||
                               extractId(assignedCoord.coverageArea?.districtIds?.[0]);
        const coordProvinceId = extractId(assignedCoord.province) ||
                               extractId(assignedCoord.coverageArea?.province);

        if (!districtId && coordDistrictId) {
          districtId = coordDistrictId;
        }
        if (!provinceId && coordProvinceId) {
          provinceId = coordProvinceId;
        }

        // Check if userId is populated
        if (assignedCoord.userId && typeof assignedCoord.userId === "object") {
          const coordUser = assignedCoord.userId as any;
          const coordDistrictId = extractId(coordUser.coverageAreas?.[0]?.districtIds?.[0]) ||
                                 extractId(coordUser.locations?.district);
          const coordProvinceId = extractId(coordUser.coverageAreas?.[0]?.province) ||
                                 extractId(coordUser.locations?.province);

          if (!districtId && coordDistrictId) {
            districtId = coordDistrictId;
          }
          if (!provinceId && coordProvinceId) {
            provinceId = coordProvinceId;
          }
        }
      }

      // Last fallback: Check requester's location
      if (!districtId || !provinceId) {
        const requester = request?.requester;
        if (requester?.userId && typeof requester.userId === "object") {
          const reqUser = requester.userId as any;
          const reqDistrictId = extractId(reqUser.locations?.municipalityId) ||
                               extractId(reqUser.coverageAreas?.[0]?.districtIds?.[0]);
          const reqProvinceId = extractId(reqUser.locations?.province) ||
                               extractId(reqUser.coverageAreas?.[0]?.province);

          if (!districtId && reqDistrictId) {
            districtId = reqDistrictId;
          }
          if (!provinceId && reqProvinceId) {
            provinceId = reqProvinceId;
          }
        }
      }
    }

    // If district is available but province is not, try to get province from district
    let finalProvinceId = provinceId;
    if (districtId && !finalProvinceId) {
      // First try to find district in the locations cache
      const districtObj = Object.values(locations.districts).find(
        (d: any) => String(d._id) === String(districtId)
      );
      if (districtObj) {
        if (districtObj.province) {
          finalProvinceId = String(districtObj.province);
        }
        // If district is found in cache but no province, try to get from parent
        if (!finalProvinceId && (districtObj as any).parent) {
          const parentLocation = Object.values(locations.provinces).find(
            (p: any) => String(p._id) === String((districtObj as any).parent)
          ) || Object.values(locations.districts).find(
            (d: any) => String(d._id) === String((districtObj as any).parent)
          );
          if (parentLocation && (parentLocation as any).type === 'province') {
            finalProvinceId = String(parentLocation._id);
          }
        }
      }
    }

    // If we have ObjectIds, resolve them - prefer backend-provided names, fallback to provider
    if (districtId || finalProvinceId) {
      // First try backend-provided names (from populated location objects)
      let districtName = request?.districtName || 
        (request?.district?.name) || 
        (districtId ? getDistrictName(String(districtId)) : null);
      let provinceName = request?.provinceName || 
        (request?.province?.name) || 
        (finalProvinceId ? getProvinceName(String(finalProvinceId)) : null);

      // If district name resolution failed, try to find it directly in the cache
      if (districtId && (!districtName || districtName === "Unknown District")) {
        const districtObj = Object.values(locations.districts).find(
          (d: any) => String(d._id) === String(districtId)
        );
        if (districtObj && districtObj.name) {
          districtName = districtObj.name;
        }
      }

      // If province name resolution failed but we have finalProvinceId, try cache
      if (finalProvinceId && (!provinceName || provinceName === "Unknown Province")) {
        const provinceObj = Object.values(locations.provinces).find(
          (p: any) => String(p._id) === String(finalProvinceId)
        );
        if (provinceObj && provinceObj.name) {
          provinceName = provinceObj.name;
        }
      }

      return {
        district: districtName && districtName !== "Unknown District" ? districtName : null,
        province: provinceName && provinceName !== "Unknown Province" ? provinceName : null,
      };
    }

    // Fallback: check if district prop is a friendly name (not ObjectId)
    const pickId = (request && (request as any).district) || district || null;
    if (!pickId) return { district: null, province: null };

    const isObjectId = (s: any) =>
      typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);

    if (!isObjectId(pickId)) {
      // If pickId is a hyphenated slug like "camarines-sur-naga-city",
      // try to split it into province and district parts.
      const humanize = (s: string) =>
        s
          .replace(/[-_]+/g, " ")
          .trim()
          .split(/\s+/)
          .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w))
          .join(" ");

      const splitHyphenated = (s: string) => {
        const parts = s.split(/[-_]+/).map((p) => p.trim()).filter(Boolean);
        if (parts.length === 0) return { province: null, district: null };
        if (parts.length === 1) return { province: null, district: humanize(parts[0]) };

        // If there are 2 parts assume province-district
        if (parts.length === 2) {
          return { province: humanize(parts[0]), district: humanize(parts[1]) };
        }

        // If >=3 parts: assume first..(n-2) -> province, last two -> district
        if (parts.length >= 3) {
          const provinceParts = parts.slice(0, parts.length - 2);
          const districtParts = parts.slice(parts.length - 2);
          return { province: humanize(provinceParts.join(" ")), district: humanize(districtParts.join(" ")) };
        }

        return { province: null, district: humanize(s) };
      };

      try {
        const candidate = String(pickId);
        if (candidate.includes("-") || candidate.includes("_")) {
          const { province, district: d } = splitHyphenated(candidate);
          return { district: d || null, province: province || null };
        }
      } catch (e) {
        // fallthrough to default
      }

      return { district: pickId, province: null };
    }

    // Last resort: try to resolve as ObjectId
    const districtName = getDistrictName(String(pickId));
    const districtObj = Object.values(locations.districts).find(
      (d: any) => String(d._id) === String(pickId)
    );
    const provinceName = districtObj && districtObj.province 
      ? getProvinceName(String(districtObj.province)) 
      : null;

    return {
      district: districtName !== "Unknown District" ? districtName : null,
      province: provinceName !== "Unknown Province" ? provinceName : null,
    };
  }, [request, district, getDistrictName, getProvinceName, locations.districts, locations.provinces]);

  // Sync fullRequest with request prop when it changes (e.g., after refresh)
  // This ensures the card shows the updated status after actions complete
  useEffect(() => {
    if (request && !viewOpen) {
      // Only update if view modal is closed (to avoid overwriting modal data)
      // Check if request has been updated (status changed)
      const currentStatus = fullRequest?.status || fullRequest?.Status;
      const newStatus = request?.status || request?.Status;
      const requestId = request?.Request_ID || request?.RequestId || request?._id;
      const fullRequestId = fullRequest?.Request_ID || fullRequest?.RequestId || fullRequest?._id;
      
      // Normalize statuses for comparison (handle case variations)
      const normalizeStatusForCompare = (s: string | undefined | null) => {
        if (!s) return '';
        return String(s).toLowerCase().trim();
      };
      
      const normalizedCurrent = normalizeStatusForCompare(currentStatus);
      const normalizedNew = normalizeStatusForCompare(newStatus);
      
      // Define status hierarchy to prevent downgrading (e.g., approved -> review-rescheduled)
      const getStatusPriority = (status: string) => {
        if (!status) return 0;
        const s = status.toLowerCase();
        if (s.includes('approved') || s === 'approved') return 5;
        if (s.includes('rejected') || s === 'rejected') return 4;
        if (s.includes('review-rescheduled') || s.includes('rescheduled')) return 3;
        if (s.includes('pending') || s.includes('review')) return 2;
        if (s.includes('cancelled') || s === 'cancelled') return 1;
        return 0;
      };
      
      const currentPriority = getStatusPriority(normalizedCurrent);
      const newPriority = getStatusPriority(normalizedNew);
      
      // Check for status transitions that indicate success (e.g., review-rescheduled -> approved)
      const wasPending = normalizedCurrent.includes('pending') || normalizedCurrent.includes('review');
      const wasReviewRescheduled = normalizedCurrent.includes('rescheduled') && normalizedCurrent.includes('review');
      const isNowApproved = normalizedNew === 'approved' || normalizedNew.includes('approv');
      const statusTransitioned = (wasPending || wasReviewRescheduled) && isNowApproved;
      
      // Prevent downgrading status (e.g., approved -> review-rescheduled)
      // BUT: Allow 'rejected' and 'review-rescheduled' to override any status if it comes from the request prop (source of truth)
      // This handles cases where an event handler incorrectly set the status and we need to correct it
      // Also allows valid workflow transitions like approved -> review-rescheduled (after reschedule)
      const isRejectedStatus = normalizedNew === 'rejected' || normalizedNew.includes('reject');
      const isReviewRescheduledStatus = normalizedNew.includes('review-rescheduled') || 
                                       (normalizedNew.includes('rescheduled') && normalizedNew.includes('review'));
      // Allow rejected and review-rescheduled to override (they are valid state transitions from approved)
      const wouldDowngrade = currentPriority > newPriority && !isRejectedStatus && !isReviewRescheduledStatus;
      
      // Check for field changes (title, location, etc.) - important for edit operations
      const currentTitle = fullRequest?.Event_Title || fullRequest?.event?.Event_Title;
      const newTitle = request?.Event_Title || request?.event?.Event_Title;
      const currentLocation = fullRequest?.Location || fullRequest?.location;
      const newLocation = request?.Location || request?.location;
      const titleChanged = newTitle && newTitle !== currentTitle;
      const locationChanged = newLocation && newLocation !== currentLocation;
      
      // Also check if fullRequest has old status but request prop might have new status
      // This handles cases where the request prop updates but fullRequest hasn't
      // For edit operations, we want to be more aggressive - update if ANY field changed
      const anyFieldChanged = titleChanged || locationChanged || 
                             (fullRequest?.Email !== request?.Email) ||
                             (fullRequest?.Phone_Number !== request?.Phone_Number) ||
                             (fullRequest?.Event_Description !== request?.Event_Description);
      
      const shouldUpdate = (normalizedCurrent !== normalizedNew || 
                          !fullRequest || 
                          requestId !== fullRequestId || 
                          statusTransitioned ||
                          anyFieldChanged ||
                          // Force update if fullRequest exists but request prop is different object
                          (fullRequest && request && JSON.stringify(fullRequest) !== JSON.stringify(request)))
                          && !wouldDowngrade; // Don't update if it would downgrade status (unless it's rejected)
      
      if (shouldUpdate) {
        // Request has been updated, sync fullRequest
        setFullRequest(request);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, viewOpen]);

  // Listen for staff update events
  useEffect(() => {
    const handleStaffUpdated = async (event: CustomEvent) => {
      const { requestId: eventRequestId, eventId: eventEventId } = event.detail || {};
      
      // Get current request ID
      const currentRequestId = request?.Request_ID || request?.RequestId || request?._id || request?.requestId || null;
      
      // Check if this event is for this card's request
      if (eventRequestId && currentRequestId && eventRequestId === currentRequestId) {
        
        // Invalidate cache for this request
        try {
          const { invalidateCache } = await import("@/utils/requestCache");
          invalidateCache(new RegExp(`event-requests/${encodeURIComponent(currentRequestId)}`));
          invalidateCache(/event-requests\?/);
        } catch (e) {
          console.error("[EventCard] Error invalidating cache:", e);
        }
        
        // Dispatch refresh event to trigger parent refresh
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("unite:requests-changed", {
              detail: {
                requestId: currentRequestId,
                action: "staff-updated",
                forceRefresh: true,
                cacheKeysToInvalidate: [`/api/event-requests/${currentRequestId}`],
              },
            })
          );
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("unite:staff-updated", handleStaffUpdated as unknown as EventListener);
      return () => {
        window.removeEventListener("unite:staff-updated", handleStaffUpdated as unknown as EventListener);
      };
    }
  }, [request]);

  // Listen for force refresh events (when we know a status change occurred)
  useEffect(() => {
    const handleForceRefresh = (event: CustomEvent) => {
      const { requestId: eventRequestId, expectedStatus, originalStatus } = event.detail || {};
      
      // Compute request ID using the same logic as resolvedRequestId, but inside the handler
      // This ensures we get the ID even if the component structure varies
      const currentResolvedRequest = fullRequest || request || (request && (request as any).event) || null;
      const currentRequestId = currentResolvedRequest?.Request_ID ||
                               currentResolvedRequest?.RequestId ||
                               currentResolvedRequest?._id ||
                               currentResolvedRequest?.requestId ||
                               request?.Request_ID || request?.RequestId || request?._id || request?.requestId ||
                               fullRequest?.Request_ID || fullRequest?.RequestId || fullRequest?._id ||
                               null;
      
      const currentStatus = fullRequest?.status || fullRequest?.Status || request?.status || request?.Status;
      const normalizedCurrentStatus = currentStatus ? String(currentStatus).toLowerCase().trim() : '';
      const normalizedOriginalStatus = originalStatus ? String(originalStatus).toLowerCase().trim() : '';
      const normalizedExpectedStatus = expectedStatus ? String(expectedStatus).toLowerCase().trim() : '';
      
      // CRITICAL FIX: Only match by ID, NOT by status
      // Matching by status causes ALL requests with the same status to be updated,
      // which is why accepting one rescheduled request made all rescheduled requests appear as approved
      const idMatches = eventRequestId && currentRequestId && String(eventRequestId) === String(currentRequestId);
      
      // Only update if this event is specifically for THIS card's request ID
      // Do NOT match by status - that causes the visual bug where all requests with the same status get updated
      if (idMatches) {
        
        // SIMPLE APPROACH: Just fetch the updated request directly from the API
        // Wait a moment for backend to process, then fetch and update
        const fetchUpdatedRequest = async () => {
          try {
            // Wait 500ms for backend to process the PUT request
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const updatedRequest = await svcFetchRequestDetails(currentRequestId, true);
            
            if (updatedRequest) {
              setFullRequest(updatedRequest);
              
              // Clear loading state now that we've updated the card
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("unite:request-editing", {
                    detail: {
                      requestId: currentRequestId,
                      isEditing: false,
                    },
                  })
                );
              }
            } else {
              console.warn("[EventCard] ⚠️ Fetched request but got no data");
              // Clear loading state anyway
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("unite:request-editing", {
                    detail: {
                      requestId: currentRequestId,
                      isEditing: false,
                    },
                  })
                );
              }
            }
          } catch (error: any) {
            console.error("[EventCard] ❌ Error fetching updated request:", error);
            // Clear loading state on error
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("unite:request-editing", {
                  detail: {
                    requestId: currentRequestId,
                    isEditing: false,
                  },
                })
              );
            }
          }
        };
        
        // Start fetching
        fetchUpdatedRequest();
      } else {
      }
    };
    
    window.addEventListener("unite:force-refresh-requests", handleForceRefresh as unknown as EventListener);
    return () => {
      window.removeEventListener("unite:force-refresh-requests", handleForceRefresh as unknown as EventListener);
    };
    // Include request and fullRequest so handler has latest values
    // Note: resolvedRequestId is computed inside the handler, so we don't need it in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, fullRequest]);

  const resolvedRequest =
    fullRequest || request || (request && (request as any).event) || null;

  const resolvedRequestId =
    resolvedRequest?.Request_ID ||
    resolvedRequest?.RequestId ||
    resolvedRequest?._id ||
    resolvedRequest?.requestId ||
    null;

  // Listen for edit events to show loading animation
  React.useEffect(() => {
    if (!resolvedRequestId) return;
    
    const handleEditEvent = (evt: any) => {
      const eventRequestId = evt?.detail?.requestId;
      const currentRequestId = resolvedRequestId;
      
      if (eventRequestId && currentRequestId && String(eventRequestId) === String(currentRequestId)) {
        const isEditing = evt?.detail?.isEditing === true;
        const error = evt?.detail?.error;
        
        setIsEditing(isEditing);
        
        if (error) {
          console.error("[EventCard] Edit error:", error);
          // Error is already shown by the edit modal
        }
      }
    };
    
    window.addEventListener("unite:request-editing", handleEditEvent as unknown as EventListener);
    return () => {
      window.removeEventListener("unite:request-editing", handleEditEvent as unknown as EventListener);
    };
  }, [resolvedRequestId]);

  // Note: resolveActorEndpoint removed - we now use unified /api/event-requests/:id/actions endpoint
  // Backend validates permissions automatically based on user's token

  const viewer = getViewer();
  const viewerId = getViewerId();
  const viewerRoleString = String(viewer.role || "").toLowerCase();

  // Permission-based action computation
  // Backend returns allowedActions based on user's permissions + authority hierarchy
  const allowedActionSet = useAllowedActionSet({
    request,
    fullRequest,
    resolvedRequest,
  });
  
  const hasAllowedAction = React.useCallback(
    hasAllowedActionFactory(allowedActionSet),
    [allowedActionSet],
  );

  const isReviewAccepted = (() => {
    try {
      const r = resolvedRequest || request || {};
      const s = String(r?.Status || r?.status || "").toLowerCase();
      return s.includes("review") && s.includes("accepted");
    } catch (e) {
      return false;
    }
  })();

  // Helper: Check if viewer is assigned coordinator (for UI hints only)
  // NOTE: This is NOT used for authorization - backend validates permissions
  const viewerIsAssignedCoordinator = (() => {
    try {
      if (!viewerId) return false;
      if (!viewerRoleString.includes("coordinator")) return false;
      const r = resolvedRequest || request || {};
      if (!r) return false;
      const coordId =
        r?.coordinator_id || r?.Coordinator_ID || r?.coordinatorId || null;
      const reviewerId = r?.reviewer?.id || r?.reviewerId || null;
      return (
        String(viewerId) === String(coordId) ||
        String(viewerId) === String(reviewerId)
      );
    } catch (e) {
      return false;
    }
  })();

  const hasAnyAllowedAction = (names: string[]) =>
    names.some((name) => hasAllowedAction(name));

  // Manage staff state
  // Manage staff modal is handled by the shared ManageStaffModal component

  // Reschedule handler used by RescheduleModal
  const handleRescheduleConfirm = async (
    currentDateStr: string,
    rescheduledISO: string,
    noteText: string,
  ) => {
    const startTime = Date.now();
    // Prevent duplicate actions
    if (isRescheduling) {
      return;
    }

    try {
      // Close modal first so user can see the loading animation
      setRescheduleOpen(false);
      setIsRescheduling(true);

      if (onRescheduleEvent) {
        await onRescheduleEvent(currentDateStr, rescheduledISO, noteText);
      } else {
        if (!resolvedRequestId) {
          console.error("[EventCard] Request ID not found");
          alert("Request ID not found. Cannot reschedule.");
          throw new Error("Request ID not found");
        }
        
        if (!rescheduledISO) {
          console.error("[EventCard] Rescheduled date is missing");
          alert("Rescheduled date is required.");
          throw new Error("Rescheduled date is required");
        }

        await svcPerformRequestAction(
          resolvedRequestId,
          "reschedule",
          noteText,
          rescheduledISO,
        );
      }
      
      if (viewOpen) {
        await openViewRequest();
      }
    } catch (e: any) {
      console.error("[EventCard] handleRescheduleConfirm error:", e);
      const errorMessage = (e as Error).message || "Failed to reschedule request";
      alert(`Failed to reschedule: ${errorMessage}`);
      throw e; // Re-throw so modal can handle it
    } finally {
      setIsRescheduling(false);
    }
  };

  // Unified action handler with refresh - used by ACCEPT, CONFIRM, and similar actions
  // Ensures consistent UI refresh behavior across all actions
  const handleActionWithRefresh = async (
    actionFn: () => Promise<any>,
    actionName: string
  ) => {
    if (!resolvedRequestId) {
      alert("Request ID not found");
      return;
    }

    const loadingSetter = actionName === 'accept' ? setIsAccepting : setIsConfirming;
    
    // Prevent duplicate actions
    if (actionName === 'accept' && isAccepting) {
      console.warn("[EventCard] Accept already in progress, ignoring duplicate call");
      return;
    }
    if (actionName === 'confirm' && isConfirming) {
      console.warn("[EventCard] Confirm already in progress, ignoring duplicate call");
      return;
    }
    
    try {
      loadingSetter(true);
      
      // Execute action
      const response = await actionFn();
      
      // Extract response data - handle both response structures
      // performConfirmAction returns: { success, data: { request, ui: {...} } }
      // performRequestAction returns: { success, data: { request, ui: {...} } }
      // Both services should return the same structure, but handle edge cases
      const responseRequest = response?.data?.request || response?.data || response?.request || response;
      const uiFlags = response?.data?.ui || response?.ui || {};
      const shouldRefresh = uiFlags?.shouldRefresh !== undefined 
        ? uiFlags.shouldRefresh 
        : true; // Default to true for state changes
      const shouldCloseModal = uiFlags?.shouldCloseModal !== undefined 
        ? uiFlags.shouldCloseModal 
        : true;
      const cacheKeysToInvalidate = uiFlags?.cacheKeysToInvalidate || [];
      
      // Clear permission cache and invalidate request cache IMMEDIATELY (synchronous, before state update)
      try {
        const { clearPermissionCache } = await import("@/utils/eventActionPermissions");
        const { invalidateCache } = await import("@/utils/requestCache");
        
        // Extract event ID from response or request for targeted cache clearing
        const eventId = responseRequest?.Event_ID || 
                       responseRequest?.eventId || 
                       responseRequest?.event?.Event_ID || 
                       responseRequest?.event?.EventId ||
                       resolvedRequest?.Event_ID ||
                       resolvedRequest?.eventId ||
                       resolvedRequest?.event?.Event_ID ||
                       resolvedRequest?.event?.EventId ||
                       null;
        
        // Clear permission cache for specific event (immediate, synchronous)
        if (eventId) {
          clearPermissionCache(String(eventId));
        } else {
          // Fallback: clear all permission cache if eventId not available
          clearPermissionCache();
        }
        
        // Invalidate request cache (immediate, synchronous)
        if (cacheKeysToInvalidate && cacheKeysToInvalidate.length > 0) {
          cacheKeysToInvalidate.forEach((key: string) => {
            const cachePattern = new RegExp(key.replace(/^\/api\//, '').replace(/\//g, '.*'));
            invalidateCache(cachePattern);
          });
        } else {
          invalidateCache(/event-requests/);
        }
      } catch (cacheError) {
        console.error(`[EventCard] Error clearing caches:`, cacheError);
      }
      
      // Update UI immediately with response data (after cache clearing)
      if (responseRequest) {
        setFullRequest(responseRequest);
      }
      
      // Dispatch single refresh event AFTER state update
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(new CustomEvent("unite:requests-changed", {
            detail: { 
              requestId: resolvedRequestId, 
              action: actionName, 
              forceRefresh: shouldRefresh,
              shouldRefresh,
              shouldCloseModal,
              cacheKeysToInvalidate
            }
          }));
        } catch (e) {
          console.error(`[EventCard] Failed to dispatch event:`, e);
        }
      }
      
      // Close modal after state update and event dispatch
      setViewOpen(false);
    } catch (error: any) {
      console.error(`[EventCard] ${actionName} action error:`, error);
      
      // Show error message to user
      alert(`Failed to ${actionName} request: ${error?.message || "Unknown error"}`);
    } finally {
      loadingSetter(false);
    }
  };

  const handleCancel = () => {
    if (onCancelEvent) {
      onCancelEvent();
    }
    setCancelOpen(false);
  };

  const handleCancelWithNote = async (note?: string) => {
    try {
      // Note: Cancel actions don't include notes in the request body
      // The note is for UI/display purposes only, not sent to backend
      // Backend validator doesn't allow note for cancel actions
      
      if (resolvedRequestId) {
        await svcPerformRequestAction(
          resolvedRequestId,
          "cancel",
          undefined, // Don't pass note for cancel actions
        );
      } else if (onCancelEvent) {
        onCancelEvent();
      }
    } catch (e) {
      console.error("Cancel error:", e);
      alert(
        "Failed to cancel event: " + ((e as Error).message || "Unknown error"),
      );
      return;
    }

    setCancelOpen(false);

    if (viewOpen) {
      await openViewRequest();
    }
  };

  const handleDelete = async () => {
    try {
      // Use the most up-to-date request data available
      let r = resolvedRequest || {};
      const requestId = r?.Request_ID || r?.RequestId || r?.requestId || null;

      if (!requestId) {
        alert("Request ID not found");

        return;
      }

      // If we don't have fresh data or the status isn't cancelled, fetch the latest
      if (
        !fullRequest ||
        (r.Status !== "Cancelled" && r.status !== "Cancelled")
      ) {
        try {
          const data = await svcFetchRequestDetails(requestId);
          r = data || r;
        } catch (fetchError) {
          console.warn("Failed to fetch latest request data:", fetchError);
        }
      }

      // perform deletion via service
      const resp = await svcDeleteRequest(requestId);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token")
          : null;
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Create deletion notification for coordinator
      try {
        const coordinatorId = r?.coordinator_id || r?.Coordinator_ID || null;
        const eventId = r?.Event_ID || r?.EventId || null;

        if (coordinatorId && eventId) {
          const notificationRes = await fetch(
            `${API_BASE}/api/notifications/request-deletion`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                coordinatorId,
                requestId,
                eventId,
              }),
              credentials: "include",
            },
          );

          if (!notificationRes.ok) {
            console.warn("Failed to create coordinator deletion notification");
          }
        }
      } catch (notificationError) {
        console.warn(
          "Error creating coordinator deletion notification:",
          notificationError,
        );
      }

      // Create deletion notification for stakeholder (owner)
      try {
        const stakeholderId =
          r?.stakeholder_id ||
          r?.Stakeholder_ID ||
          (r?.requester?.userId || r?.requester?.id || null) ||
          null;
        const eventId = r?.Event_ID || r?.EventId || null;

        if (stakeholderId && eventId) {
          const stakeholderNotificationRes = await fetch(
            `${API_BASE}/api/notifications/stakeholder-deletion`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                stakeholderId,
                requestId,
                eventId,
              }),
              credentials: "include",
            },
          );

          if (!stakeholderNotificationRes.ok) {
            console.warn("Failed to create stakeholder deletion notification");
          }
        }
      } catch (stakeholderNotificationError) {
        console.warn(
          "Error creating stakeholder deletion notification:",
          stakeholderNotificationError,
        );
      }

      // Notify other parts of the app to refresh lists
      try {
        window.dispatchEvent(
          new CustomEvent("unite:requests-changed", { detail: { requestId } }),
        );
      } catch (e) {}

      setDeleteOpen(false);
      setSuccessModal(true);
    } catch (e) {
      console.error("Delete error:", e);
      alert(
        "Failed to delete request: " +
          ((e as Error).message || "Unknown error"),
      );
    } finally {
      setDeleteOpen(false);
    }
  };

  const handleReject = () => {
    // legacy: call without note
    if (onRejectEvent && request) {
      try {
        onRejectEvent(request);
      } catch (e) {}
    }
    setRejectOpen(false);
  };

  const handleAccept = async (note?: string) => {
    // Prevent duplicate actions - check ref first (synchronous, prevents race conditions)
    if (isAcceptingRef.current) {
      console.warn("[EventCard] ❌ BLOCKED: Accept already in progress (ref check), ignoring duplicate call");
      return;
    }
    
    // Also check state (redundant but safe)
    if (isAccepting) {
      return;
    }

    // Check if request is already approved
    const currentStatus = fullRequest?.status || fullRequest?.Status || request?.status || request?.Status;
    const normalizedStatus = currentStatus ? String(currentStatus).toLowerCase().trim() : '';
    const isAlreadyApproved = normalizedStatus === 'approved' || normalizedStatus.includes('approv');
    
    if (isAlreadyApproved) {
      // Close modal if open
      setAcceptOpen(false);
      return;
    }

    try {
      // Set ref immediately (synchronous) to prevent race conditions
      isAcceptingRef.current = true;
      
      // Set loading state FIRST to prevent duplicate calls
      setIsAccepting(true);
      
      // Close modal after setting loading state
      setAcceptOpen(false);
      
      // Check if callback is provided (preferred path - direct refresh from page)
      if (onAcceptEvent) {
        try {
          await onAcceptEvent(note);
          return;
        } catch (callbackError: any) {
          console.error("[EventCard] onAcceptEvent callback failed:", callbackError);
          throw callbackError;
        }
      }

      // Fallback to direct API call if no callback
      if (!resolvedRequestId) {
        console.error("[EventCard] Request ID not found");
        alert("Request ID not found. Cannot accept.");
        throw new Error("Request ID not found");
      }

      // Use unified action handler with refresh
      await handleActionWithRefresh(
        () => svcPerformRequestAction(resolvedRequestId, "accept", undefined),
        'accept'
      );
    } catch (e: any) {
      console.error("[EventCard] handleAccept error:", e);
      const errorMessage = e?.message || "Failed to accept request";
      alert(`Failed to accept: ${errorMessage}`);
      throw e; // Re-throw so modal can handle it
    } finally {
      setIsAccepting(false);
      // Reset ref in finally to ensure it's always cleared
      isAcceptingRef.current = false;
    }
  };

  // New: handle reject with admin note
  const handleRejectWithNote = async (note?: string) => {
    // Prevent duplicate actions
    if (isRejecting) {
      return;
    }

    try {
      // Close modal first so user can see the loading animation
      setRejectOpen(false);
      setIsRejecting(true);
      
      // Check if callback is provided (preferred path - direct refresh from page)
      if (onRejectEvent && request) {
        try {
          await onRejectEvent(request, note);
          return;
        } catch (callbackError: any) {
          console.error("[EventCard] onRejectEvent callback failed:", callbackError);
          throw callbackError;
        }
      }

      // Fallback to direct API call if no callback
      if (!resolvedRequestId) {
        console.error("[EventCard] Request ID not found");
        alert("Request ID not found. Cannot reject.");
        throw new Error("Request ID not found");
      }

      await svcPerformRequestAction(
        resolvedRequestId,
        "reject",
        note || "",
      );
    } catch (e: any) {
      console.error("[EventCard] handleRejectWithNote error:", e);
      const errorMessage = e?.message || "Failed to reject request";
      alert(`Failed to reject: ${errorMessage}`);
      throw e; // Re-throw so modal can handle it
    } finally {
      setIsRejecting(false);
    }
  };

  // Menu for Approved status
  // Helper to derive flags from request/event or fallback to allowedActions
  const flagFor = (
    flagName: string,
    actionName?: string | string[],
  ): boolean => {
    try {
      const r = resolvedRequest || request || {};
      const explicit = (r as any)?.[flagName] ?? (r as any)?.event?.[flagName];

      if (explicit !== undefined && explicit !== null) {
        return Boolean(explicit);
      }

      if (actionName && hasAllowedAction(actionName)) {
        return true;
      }

      const fallback = FALLBACK_ACTION_MAP[flagName];
      if (fallback && hasAllowedAction(fallback)) {
        return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  };

  // Debug: log permission-based allowed actions with detailed reschedule check (after flagFor is defined)
  React.useEffect(() => {
    try {
      const extractedActions = Array.from(allowedActionSet || []);
      const hasRescheduleDirect = extractedActions.includes('reschedule');
      const hasReschedDirect = extractedActions.includes('resched');
      const canRescheduleCheck = flagFor("canReschedule", ["resched", "reschedule"]);
      const hasRescheduleViaHasAllowed = hasAllowedAction(["resched", "reschedule"]);
      
      const dbg = {
        requestId: resolvedRequestId,
        viewerId,
        // Role string for context only - action visibility is permission-driven
        viewerRole: viewerRoleString,
        // Permission-based allowed actions from backend
        allowedActions: extractedActions,
        actionCount: extractedActions.length,
        status: resolvedRequest?.Status || resolvedRequest?.status,
        // Backend-computed permissions (from API response)
        backendAllowedActions: resolvedRequest?.allowedActions ?? resolvedRequest?.allowed_actions ?? null,
        rootAllowedActions: request?.allowedActions ?? request?.allowed_actions ?? null,
        // Reschedule-specific debugging
        hasRescheduleDirect,
        hasReschedDirect,
        canRescheduleCheck,
        hasRescheduleViaHasAllowed,
        // Check what flagFor sees
        canRescheduleFlag: (resolvedRequest || request || {})?.canReschedule,
      };
      
      // Detailed request snapshot for debugging permission issues (especially for coordinators)
      // (Debug logging removed)
    } catch (e) {
      console.error("[EventCard] Error in permission debugging:", e);
    }
  }, [allowedActionSet, resolvedRequest, request, resolvedRequestId, viewerId, viewerRoleString, flagFor, hasAllowedAction]);

  // Menus are now rendered by EventActionMenu which uses the same flags and setters

  // Menu for Pending status
  // pendingMenu moved to EventActionMenu

  // Default menu for Rejected or other statuses
  // defaultMenu moved to EventActionMenu

  // API_BASE imported from event-card.constants

  // Network operations moved to services/requestsService
  // Using service methods directly - no need for local wrapper

  // Open local view modal, fetching full request details when necessary
  const openViewRequest = async () => {
    try {
      const r = request || (request && (request as any).event) || {};
      const requestId =
        r?.Request_ID || r?.RequestId || r?._id || r?.requestId || null;

      // If there's no id, just open with the provided object
      if (!requestId) {
        setFullRequest(r);
        setViewOpen(true);

        return;
      }

      // If the passed request already contains event category subdocuments (BloodDrive/Training/Advocacy)
      // then we can avoid fetching; do NOT treat admin/stakeholder action fields as "has nested".
      const hasNested = !!(
        r?.event?.categoryData ||
        r?.event?.BloodDrive ||
        r?.event?.bloodDrive ||
        r?.event?.Training ||
        r?.event?.training ||
        r?.event?.Advocacy ||
        r?.event?.advocacy ||
        r?.BloodDrive ||
        r?.bloodDrive ||
        r?.Training ||
        r?.training ||
        r?.Advocacy ||
        r?.advocacy
      );

      if (hasNested) {
        setFullRequest(r);
        setViewOpen(true);

        return;
      }

      // Otherwise fetch fresh details from API
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token")
          : null;
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;
      const url = `${API_BASE}/api/event-requests/${encodeURIComponent(requestId)}`;
      let res;

      if (token) {
        // try fetchWithAuth if available
        try {
          res = await fetchWithAuth(url, { method: "GET" });
        } catch (e) {
          res = await fetch(url, { headers });
        }
      } else {
        res = await fetch(url, { headers, credentials: "include" });
      }
      const body = await res.json().catch(() => ({}));

      const data = body?.data || body?.request || body;
      // If the returned request contains an event reference but not the full
      // event (with category subdocument like BloodDrive), fetch the event
      // and merge so the View modal can display specific details.
      let finalRequest = data || r;

      try {
        const eventRef = finalRequest?.event || finalRequest;
        const eventId =
          eventRef?.Event_ID ||
          eventRef?.EventId ||
          eventRef?.EventId ||
          eventRef?.Event_ID ||
          finalRequest?.Event_ID ||
          finalRequest?.EventId ||
          null;

        if (eventId) {
          // fetch full event details
          const evUrl = `${API_BASE}/api/events/${encodeURIComponent(eventId)}`;
          let evRes;

          try {
            if (token) {
              try {
                evRes = await fetchWithAuth(evUrl, { method: "GET" });
              } catch (e) {
                evRes = await fetch(evUrl, { headers });
              }
            } else {
              evRes = await fetch(evUrl, { headers, credentials: "include" });
            }
          } catch (fetchErr) {
            evRes = null;
          }

          const evBody = evRes ? await evRes.json().catch(() => ({})) : null;
          let evData = evBody?.data || evBody?.event || evBody;

          // If fetched event did not include categoryData, try the dedicated category endpoint
          if (evData && !evData.categoryData) {
            try {
              const catUrl = `${API_BASE}/api/events/${encodeURIComponent(eventId)}/category`;
              let catRes;

              if (token) {
                try {
                  catRes = await fetchWithAuth(catUrl, { method: "GET" });
                } catch (e) {
                  catRes = await fetch(catUrl, { headers });
                }
              } else {
                catRes = await fetch(catUrl, {
                  headers,
                  credentials: "include",
                });
              }
              const catBody = await catRes.json().catch(() => null);

              const catData = catBody?.data || catBody?.category || catBody;

              if (catData)
                evData = { ...(evData || {}), categoryData: catData };
            } catch (e) {}
          }

          // Merge strategy: prefer fetched evData, but keep any request-level event fallback fields
          const mergedEvent = {
            ...(evData || {}),
            ...(finalRequest?.event || {}),
          };

          finalRequest = { ...(finalRequest || {}), event: mergedEvent };

          // Preserve requester/request-level fallback fields from the original passed-in object `r`
          // if the freshly fetched request is missing them (keeps createdByName, email, dates, etc.)
          try {
            const fallbackKeys = [
              "createdByName",
              "RequesterName",
              "First_Name",
              "first_name",
              "Email",
              "email",
              "RequestedDate",
              "Date",
              "StartTime",
              "Start",
              "EndTime",
              "End",
            ];

            fallbackKeys.forEach((k) => {
              try {
                if (
                  (finalRequest[k] === undefined ||
                    finalRequest[k] === null ||
                    finalRequest[k] === "") &&
                  r &&
                  (r as any)[k]
                ) {
                  finalRequest[k] = (r as any)[k];
                }
              } catch (e) {}
            });
          } catch (e) {}
        }
      } catch (e) {
        // ignore event fetch failures and proceed with request data
      }

      setFullRequest(finalRequest || r);
      // Geo resolution is now handled by useMemo above

      setViewOpen(true);
    } catch (e) {
      // fallback to provided request
      setFullRequest(request || (request && (request as any).event) || null);
      setViewOpen(true);
    }
  };

  // Unified confirm action handler - uses same pattern as ACCEPT
  // Uses callback from page for direct refresh (like RESCHEDULE)
  const handleConfirmAction = async () => {
    // Prevent duplicate actions
    if (isConfirming) {
      return;
    }
    
    // Check if already approved to prevent duplicate confirm
    const currentStatus = resolvedRequest?.status || resolvedRequest?.Status;
    if (currentStatus === 'approved' || currentStatus === 'Approved') {
      alert("This request has already been approved and cannot be confirmed again.");
      return;
    }

    try {
      setIsConfirming(true);
      
      // Check if callback is provided (preferred path - direct refresh from page)
      if (onConfirmEvent) {
        try {
          await onConfirmEvent();
          return;
        } catch (callbackError: any) {
          console.error("[EventCard] onConfirmEvent callback failed:", callbackError);
          throw callbackError;
        }
      }

      // Fallback to direct API call if no callback
      if (!resolvedRequestId) {
        console.error("[EventCard] Request ID not found");
        alert("Request ID not found");
        return;
      }
      
      // Use unified action handler with refresh
      await handleActionWithRefresh(
        () => svcPerformConfirmAction(resolvedRequestId),
        'confirm'
      );
    } catch (e: any) {
      console.error("[EventCard] handleConfirmAction error:", e);
      const errorMessage = e?.message || "Failed to confirm request";
      alert(`Failed to confirm: ${errorMessage}`);
      throw e; // Re-throw so caller can handle it
    } finally {
      setIsConfirming(false);
    }
  };

  // Stakeholder confirm action moved to services
  // Unified confirm action - no need for role-specific functions
  // Note: This function is kept for backward compatibility but now uses handleConfirmAction
  const runStakeholderDecision = async (decision: "Accepted" | "Rejected") => {
    if (decision === "Accepted") {
      // Use unified handleConfirmAction for consistency
      await handleConfirmAction();
    } else {
      // For rejected/declined, use the existing logic
      try {
        if (!resolvedRequestId) {
          throw new Error("Unable to determine request id");
        }
        // Decline action would use performRequestAction with "decline"
        // For now, just show error as this path shouldn't be used
        throw new Error("Decline action should use performRequestAction");
      } catch (err: any) {
        console.error("Decline decision error:", err);
        alert(
          `Failed to decline request: ${err?.message || "Unknown error"}`,
        );
      }
    }
  };

  const buildActionMenu = () => {
    if (allowedActionSet.size === 0) return null;

    const actions: JSX.Element[] = [];
    const danger: JSX.Element[] = [];

    if (flagFor("canView", "view") && typeof onViewEvent === "function") {
      actions.push(
        <DropdownItem
          key="view-event"
          description="View event details"
          startContent={<Eye />}
          onPress={onViewEvent}
        >
          View Event
        </DropdownItem>,
      );
    }

    if (flagFor("canManageStaff", "manage-staff")) {
      actions.push(
        <DropdownItem
          key="manage-staff"
          description="Manage staff for this event"
          startContent={<Persons />}
          onPress={() => {
            setManageStaffOpen(true);
            if (typeof onManageStaff === "function") onManageStaff();
          }}
        >
          Manage Staff
        </DropdownItem>,
      );
    }

    if (flagFor("canAccept", ["accept", "approve"])) {
      actions.push(
        <DropdownItem
          key="accept"
          description="Accept this request"
          startContent={<Check />}
          onPress={() => setAcceptOpen(true)}
        >
          Accept Request
        </DropdownItem>,
      );
    }

    if (flagFor("canReject", "reject")) {
      // When waiting for coordinator confirmation after admin accepted, do not show a Reject option
      if (!(isReviewAccepted && viewerIsAssignedCoordinator)) {
        actions.push(
          <DropdownItem
            key="reject"
            description="Reject this request"
            startContent={<Xmark />}
            onPress={() => setRejectOpen(true)}
          >
            Reject Request
          </DropdownItem>,
        );
      }
    }

    if (flagFor("canReschedule", ["resched", "reschedule"])) {
      actions.push(
        <DropdownItem
          key="reschedule"
          description="Propose a new schedule"
          startContent={<Clock />}
          onPress={() => {
            setRescheduleOpen(true);
          }}
        >
          Reschedule
        </DropdownItem>,
      );
    }

    // Show Confirm action when permission-based check allows it
    // Backend validates permissions when action is performed
    // Disable if already confirming/accepting or request is already approved
    if (flagFor("canConfirm", "confirm")) {
      const isAlreadyApproved = resolvedRequest?.status === 'approved' || 
                                 resolvedRequest?.Status === 'Approved' ||
                                 resolvedRequest?.status === 'APPROVED';
      actions.push(
        <DropdownItem
          key="confirm"
          description="Confirm the reviewer decision"
          startContent={<Check />}
          onPress={handleConfirmAction}
          isDisabled={isConfirming || isAccepting || isAlreadyApproved}
        >
          {isConfirming ? "Confirming..." : "Confirm"}
        </DropdownItem>,
      );
    }

    if (flagFor("canDecline", "decline")) {
      actions.push(
        <DropdownItem
          key="decline"
          description="Decline the reviewer decision"
          startContent={<Xmark />}
          onPress={async () => {
            await runStakeholderDecision("Rejected");
          }}
        >
          Decline
        </DropdownItem>,
      );
    }

    if (flagFor("canAdminAction", "cancel")) {
      danger.push(
        <DropdownItem
          key="cancel"
          className="text-danger"
          color="danger"
          description="Cancel this request"
          startContent={
            <TrashBin className="text-xl text-danger pointer-events-none shrink-0" />
          }
          onPress={() => setCancelOpen(true)}
        >
          Cancel Request
        </DropdownItem>,
      );
    }

    if (flagFor("canDelete", "delete")) {
      danger.push(
        <DropdownItem
          key="delete"
          className="text-danger"
          color="danger"
          description="Delete this request"
          startContent={
            <TrashBin className="text-xl text-danger pointer-events-none shrink-0" />
          }
          onPress={() => setDeleteOpen(true)}
        >
          Delete Request
        </DropdownItem>,
      );
    }

    if (actions.length === 0 && danger.length === 0) {
      return null;
    }

    return (
      <DropdownMenu aria-label="Event actions menu" variant="faded">
        {actions.length > 0 ? (
          <DropdownSection title="Actions">{actions}</DropdownSection>
        ) : null}
        {danger.length > 0 ? (
          <DropdownSection title="Danger zone">{danger}</DropdownSection>
        ) : null}
      </DropdownMenu>
    );
  };

  const renderFooterActionsFromAllowed = () => {
    if (allowedActionSet.size === 0) return null;

    const buttons: JSX.Element[] = [];
    // Only show the core action set: Accept, Reschedule, Reject
    // Reject is styled as a danger action to make it visually distinct.
    // Use permission-based check for confirm action instead of role-based check
    if (hasAllowedAction("confirm") || flagFor("canConfirm", "confirm")) {
      buttons.push(
        <Button
          key="footer-confirm"
          className="bg-black text-white"
          color="default"
          onPress={handleConfirmAction}
          isDisabled={isConfirming || isAccepting}
        >
          Confirm
        </Button>,
      );
    } else if (hasAllowedAction(["accept", "approve"])) {
      buttons.push(
        <Button
          key="footer-accept"
          className="bg-black text-white"
          color="default"
          onPress={() => {
            setViewOpen(false);
            setAcceptOpen(true);
          }}
          isDisabled={isAccepting || isConfirming}
        >
          {isAccepting ? "Accepting..." : "Accept"}
        </Button>,
      );
    }

    if (hasAllowedAction(["resched", "reschedule"])) {
      buttons.push(
        <Button
          key="footer-resched"
          color="default"
          onPress={() => {
            setViewOpen(false);
            setRescheduleOpen(true);
          }}
        >
          Reschedule
        </Button>,
      );
    }

    // Only show Reject when not in review-accepted coordinator confirmation state
    if (
      !(isReviewAccepted && viewerIsAssignedCoordinator) &&
      hasAllowedAction("reject")
    ) {
      buttons.push(
        <Button
          key="footer-reject"
          color="danger"
          variant="bordered"
          onPress={() => {
            setViewOpen(false);
            setRejectOpen(true);
          }}
        >
          Reject
        </Button>,
      );
    }

    if (!buttons.length) return null;

    return [
      <Button
        key="footer-close"
        variant="bordered"
        onPress={() => setViewOpen(false)}
      >
        Close
      </Button>,
      ...buttons,
    ];
  };

  // Menu rendering moved to EventActionMenu component above

  // Determine a human-friendly pending-stage label for Pending requests
  const getPendingStageLabel = (): string | null => {
    // Always prefer fullRequest first (it has the most up-to-date status)
    const r =
      fullRequest || resolvedRequest || request || (request && (request as any).event) || {};

    // Prefer a human-friendly label returned by the backend when present
    const backendLabel =
      r?.statusLabel || r?.status_label || r?.StatusLabel || null;
    if (backendLabel) return backendLabel;

    // First check the request Status field for new workflow statuses
    const requestStatus = String(r?.Status || r?.status || "").toLowerCase();

    // Generic, scalable status labels - never depend on role names
    // Use backend's getHumanStatusLabel function logic for consistency
    
    // Pending states
    if (
      requestStatus.includes("pending") ||
      requestStatus.includes("pending_review")
    ) {
      return "Waiting for Review";
    }

    // Review states
    if (requestStatus.includes("review")) {
      if (requestStatus.includes("accepted")) {
        return "Accepted / Confirmed";
      }
      
      if (
        requestStatus.includes("resched") ||
        requestStatus.includes("reschedule") ||
        requestStatus.includes("rescheduled")
      ) {
        return "Reschedule Requested";
      }
      
      // Other review states
      return "Under Review";
    }

    // Rescheduled states (legacy)
    if (
      requestStatus.includes("rescheduled_by_admin") ||
      requestStatus.includes("rescheduled_by_coordinator") ||
      requestStatus.includes("rescheduled_by_stakeholder")
    ) {
      return "Reschedule Requested";
    }

    // Final states
    if (requestStatus.includes("approved") || requestStatus.includes("completed")) {
      return "Completed / Published";
    }
    
    if (requestStatus.includes("rejected") || requestStatus.includes("reject")) {
      return "Rejected";
    }
    
    if (requestStatus.includes("cancelled") || requestStatus.includes("cancel")) {
      return "Cancelled";
    }

    // Awaiting confirmation
    if (requestStatus.includes("awaiting_confirmation")) {
      return "Waiting for Confirmation";
    }

    // Fallback: return generic label or status as-is
    return status || "Unknown";
  };

  // Try to derive the current viewer id from legacy storage
  // getViewerId and formatDate are provided by utils

  const isViewerStakeholder = (() => {
    try {
      const r = request || (request && (request as any).event) || {};
      const madeByStakeholder =
        r?.stakeholder?.Stakeholder_ID ||
        r?.MadeByStakeholderID ||
        r?.Stakeholder_ID ||
        r?.stakeholder_id ||
        r?.StakeholderId ||
        null;

      if (!madeByStakeholder) return false;
      const viewerId = getViewerId();

      if (!viewerId) return false;

      return String(viewerId) === String(madeByStakeholder);
    } catch (e) {
      return false;
    }
  })();

  // Header status label: shows pending subtypes (unless the subtype is 'completed'),
  // or base statuses like Approved/Rejected/Cancelled as fallback.
  const headerStatusLabel = (() => {
    try {
      const pendingLabel = getPendingStageLabel();
      // Always prefer fullRequest first (it has the most up-to-date status)
      const r = fullRequest || resolvedRequest || request || {};
      // Use fullRequest status first, then fallback to status prop only if fullRequest doesn't have status
      const rawStatus = String(
        (fullRequest?.Status || fullRequest?.status) || 
        (r?.Status || r?.status) || 
        status || 
        ""
      ).toLowerCase();

      // If pending subtype indicates 'completed', don't show it
      if (rawStatus.includes("pending") && pendingLabel) {
        const low = String(pendingLabel).toLowerCase();
        if (low.includes("complete")) return null;
        return pendingLabel;
      }

      if (rawStatus.includes("approve") || rawStatus.includes("approved")) return "Approved";
      if (rawStatus.includes("reject") || rawStatus.includes("rejected")) return "Rejected";
      if (rawStatus.includes("cancel")) return "Cancelled";

      // Prefer fullRequest status over status prop
      return (
        (fullRequest?.statusLabel || fullRequest?.StatusLabel) ||
        (r?.statusLabel || r?.StatusLabel) ||
        (fullRequest?.status || fullRequest?.Status) ||
        (r?.status || r?.Status) ||
        status
      ) || null;
    } catch (e) {
      return null;
    }
  })();

  // Helper to safely extract numeric counts from various backend shapes
  const extractNumber = (v: any): number | null => {
    try {
      if (v === undefined || v === null) return null;
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      }
      if (typeof v === "object") {
        // Mongo Extended JSON shapes
        if (v.$numberInt !== undefined) return Number(v.$numberInt);
        if (v.$numberLong !== undefined) return Number(v.$numberLong);
        if (v.$numberDecimal !== undefined) return Number(v.$numberDecimal);
        // direct numeric-like keys
        for (const k of Object.keys(v)) {
          const maybe = (v as any)[k];
          if (typeof maybe === "number") return maybe;
          if (typeof maybe === "string" && /^[0-9]+(\.|$)/.test(maybe))
            return Number(maybe);
        }
      }
    } catch (e) {}
    return null;
  };

  // Derive goal count and label from the request/event object
  const goalInfo = useMemo(() => {
    const r = resolvedRequest || request || {};
    const ev = r.event || r || {};

    const categoryCandidate =
      (ev?.Category || ev?.category || r?.Category || r?.category || category || "")
        .toString()
        .toLowerCase();

    // Candidate fields for each type (try multiple casings)
    const bloodTargets = [
      ev?.BloodDrive?.Target_Donation,
      ev?.bloodDrive?.Target_Donation,
      ev?.BloodDrive?.TargetDonation,
      ev?.bloodDrive?.TargetDonation,
      ev?.Target_Donation,
      ev?.TargetDonation,
      r?.Target_Donation,
      r?.TargetDonation,
    ];

    const trainingTargets = [
      ev?.Training?.MaxParticipants,
      ev?.training?.MaxParticipants,
      ev?.Training?.Max_Participants,
      ev?.training?.Max_Participants,
      ev?.MaxParticipants,
      ev?.Max_Participants,
      r?.MaxParticipants,
      r?.Max_Participants,
    ];

    const advocacyTargets = [
      ev?.Advocacy?.ExpectedAudienceSize,
      ev?.advocacy?.ExpectedAudienceSize,
      ev?.Advocacy?.Expected_Audience_Size,
      ev?.advocacy?.Expected_Audience_Size,
      ev?.ExpectedAudienceSize,
      ev?.Expected_Audience_Size,
      r?.ExpectedAudienceSize,
      r?.Expected_Audience_Size,
    ];

    const pickNumberFrom = (arr: any[]) => {
      for (const a of arr) {
        const n = extractNumber(a);
        if (n !== null) return n;
      }
      return null;
    };

    if (categoryCandidate.includes("blood")) {
      let n = null;
      const txt =
        String(ev?.reviewSummary || ev?.reviewMessage || r?.reviewSummary || r?.reviewMessage || "");
      const m = txt.match(/target\s+donation\s+of\s+(\d+)/i) || txt.match(/target\s+donation[^\d]*(\d+)/i) || txt.match(/target\s+(?:donation|donations)[^\d]*(\d+)/i);
      if (m && m[1]) n = extractNumber(m[1]);
      if (n === null) {
        n = pickNumberFrom(bloodTargets);
      }
      if (n === null) {
        const m2 = txt.match(/(\d+)/g);
        if (m2) {
          const numbers = m2.map(extractNumber).filter((nn): nn is number => nn !== null);
          if (numbers.length > 0) {
            const last = numbers[numbers.length - 1];
            if (last > 0) n = last;
          }
        }
      }
      return { count: n, label: "u.", isBlood: true, mainLabel: "Goal Count" };
    }

    if (categoryCandidate.includes("training")) {
      let n = null;
      const txt = String(ev?.reviewSummary || r?.reviewSummary || "");
      const m = txt.match(/max(?:imum)?\s+participants?[^\d]*(\d+)/i) || txt.match(/participants?[^\d]*(\d+)/i);
      if (m && m[1]) n = extractNumber(m[1]);
      if (n === null) {
        n = pickNumberFrom(trainingTargets);
      }
      if (n === null) {
        const m2 = txt.match(/(\d+)/g);
        if (m2) {
          const numbers = m2.map(extractNumber).filter((nn): nn is number => nn !== null);
          if (numbers.length > 0) {
            const last = numbers[numbers.length - 1];
            if (last > 0) n = last;
          }
        }
      }
      return { count: n, label: "", isBlood: false, mainLabel: "Audience No." };
    }

    if (categoryCandidate.includes("advoc") || categoryCandidate.includes("advocacy")) {
      let n = null;
      const txt = String(ev?.reviewSummary || r?.reviewSummary || "");
      const m = txt.match(/expected\s+audience\s+size[^\d]*(\d+)/i) || txt.match(/audience[^\d]*(\d+)/i) || txt.match(/participants?[^\d]*(\d+)/i);
      if (m && m[1]) n = extractNumber(m[1]);
      if (n === null) {
        n = pickNumberFrom(advocacyTargets);
      }
      if (n === null) {
        const m2 = txt.match(/(\d+)/g);
        if (m2) {
          const numbers = m2.map(extractNumber).filter((nn): nn is number => nn !== null);
          if (numbers.length > 0) {
            const last = numbers[numbers.length - 1];
            if (last > 0) n = last;
          }
        }
      }
      return { count: n, label: "", isBlood: false, mainLabel: "Audience No." };
    }

    // Fallback: try any known fields
    const fallback = pickNumberFrom([
      ...bloodTargets,
      ...trainingTargets,
      ...advocacyTargets,
    ]);

    let n = fallback;
    if (n === null) {
      const txt = String(ev?.reviewSummary || ev?.reviewMessage || r?.reviewSummary || r?.reviewMessage || "");
      const m = txt.match(/(\d+)/g);
      if (m) {
        const numbers = m.map(extractNumber).filter((nn): nn is number => nn !== null);
        if (numbers.length > 0) {
          const last = numbers[numbers.length - 1];
          if (last > 0) n = last;
        }
      }
    }

    return { count: n, label: n !== null ? "" : "", isBlood: false, mainLabel: "Goal Count" };
  }, [resolvedRequest, request, fullRequest, category]);

  // Format the date/time for the card footer area (e.g. "Dec 1 8:00 AM - 4:00 PM")
  const cardDateRange = useMemo(() => {
    const r = resolvedRequest || request || {};

    const pick = (...cands: any[]) => {
      for (const c of cands) {
        if (c !== undefined && c !== null && c !== "") return c;
      }
      return null;
    };

    // Helper to parse date from various formats including Mongo Extended JSON
    const parseDate = (v: any): Date | null => {
      if (!v && v !== 0) return null;
      try {
        if (typeof v === "string" || typeof v === "number") {
          const d = new Date(v);
          if (!isNaN(d.getTime())) return d;
        }
        if (typeof v === "object" && v !== null) {
          // Handle Mongo Extended JSON format: { $date: "..." } or { $date: { $numberLong: "..." } }
          if (v.$date) {
            const inner = v.$date.$numberLong || v.$date;
            const n = typeof inner === "string" ? Number(inner) : inner;
            const d = new Date(Number(n));
            if (!isNaN(d.getTime())) return d;
          }
          if (v.$numberLong) {
            const d = new Date(Number(v.$numberLong));
            if (!isNaN(d.getTime())) return d;
          }
          // Try direct Date conversion
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

    const startVal = pick(
      r?.Start_Date,
      r?.Date, // Add Date field support
      r?.Start,
      r?.start,
      r?.StartTime,
      r?.event?.Start_Date,
      r?.event?.Date,
      r?.event?.Start,
      r?.event?.StartTime,
    );

    const endVal = pick(
      r?.End_Date,
      r?.End,
      r?.end,
      r?.EndTime,
      r?.event?.End_Date,
      r?.event?.End,
      r?.event?.EndTime,
    );

    const formatDateShort = (d?: any) => {
      if (!d) return null;
      try {
        // Use parseDate helper to handle Mongo Extended JSON
        const parsed = parseDate(d);
        if (parsed) {
          return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
        // Fallback to direct Date conversion
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return String(d);
        return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      } catch (e) {
        return String(d);
      }
    };

    const formatTimeShort = (t?: any) => {
      if (!t) return null;
      try {
        // Use parseDate helper to handle Mongo Extended JSON
        const parsed = parseDate(t);
        if (parsed) {
          return parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        }
        // Fallback to direct Date conversion
        const dt = new Date(t);
        if (isNaN(dt.getTime())) return String(t);
        return dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      } catch (e) {
        return String(t);
      }
    };

    const datePart = formatDateShort(startVal) || formatDateShort(endVal) || null;
    const startTime = formatTimeShort(startVal);
    const endTime = formatTimeShort(endVal);

    if (!datePart && !startTime && !endTime) return null;

    if (datePart && startTime) {
      return `${datePart} ${startTime}${endTime ? " - " + endTime : ""}`;
    }

    // Fallbacks
    if (startTime && endTime) return `${startTime} - ${endTime}`;
    if (startTime) return `${startTime}`;
    if (datePart) return datePart;

    return null;
  }, [resolvedRequest, request, fullRequest]);

  // Compute display status from fullRequest first, then fallback to status prop
  // This ensures the status Chip updates when fullRequest changes (e.g., after accept action)
  const displayStatus = (() => {
    try {
      // Always prefer fullRequest first (it has the most up-to-date status)
      const r = fullRequest || resolvedRequest || request || {};
      const statusRaw = String(r?.status || r?.Status || status || "pending-review").toLowerCase();
      
      if (statusRaw.includes("reject") || statusRaw.includes("rejected")) return "Rejected";
      if (statusRaw.includes("approv") || statusRaw.includes("approved") || 
          statusRaw.includes("complete") || statusRaw.includes("completed")) return "Approved";
      if (statusRaw.includes("cancel") || statusRaw.includes("cancelled")) return "Cancelled";
      return "Pending";
    } catch (e) {
      return status || "Pending";
    }
  })();

  return (
    <>
      <Card className="w-full rounded-xl border border-gray-200 shadow-none bg-white relative">
        {/* Loading overlay to prevent interaction during confirm, accept, reject, reschedule, or edit */}
        {(isConfirming || isAccepting || isRejecting || isRescheduling || isEditing) && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" color="primary" />
              <p className="text-sm font-medium text-gray-700">
                {isEditing ? "Editing event..." : isAccepting ? "Accepting request..." : isRejecting ? "Rejecting request..." : isRescheduling ? "Rescheduling request..." : "Confirming request..."}
              </p>
              <p className="text-xs text-gray-500">Please wait while we update the request</p>
            </div>
          </div>
        )}
        <CardHeader className="flex justify-between items-start">
          {/* Title and Organization */}
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="w-6 h-6" />
              <div className="flex flex-col">
                <p className="text-xs text-default-800">
                  {(request &&
                    (request.createdByName ||
                      (request.event && request.event.createdByName))) ||
                    organization ||
                    organizationType}
                </p>
                {headerStatusLabel ? (
                  <p className="text-xs text-default-400 mt-1">{headerStatusLabel}</p>
                ) : null}
              </div>
            </div>
          </div>
          <Dropdown>
            <DropdownTrigger>
              <Button
                isIconOnly
                aria-label="Event actions"
                className="hover:text-default-800"
                variant="light"
              >
                <EllipsisVertical className="w-5 h-5" />
              </Button>
            </DropdownTrigger>
            <EventActionMenu
              allowedActionSet={allowedActionSet}
              hasAllowedAction={hasAllowedAction}
              flagFor={flagFor}
              status={status}
              request={resolvedRequest || fullRequest || request}
              onViewEvent={onViewEvent}
              onEditEvent={onEditEvent}
              openViewRequest={openViewRequest}
              setManageStaffOpen={setManageStaffOpen}
              setRescheduleOpen={setRescheduleOpen}
              setAcceptOpen={setAcceptOpen}
              setRejectOpen={setRejectOpen}
              setCancelOpen={setCancelOpen}
              setDeleteOpen={setDeleteOpen}
              // Do NOT show confirm fallback for reviewers; rely solely on allowed actions
              showConfirmFallback={false}
              onConfirm={async () => {
                try {
                  if (!resolvedRequestId)
                    throw new Error("Request id not found");
                  // Use unified handleConfirmAction for all confirm actions
                  await handleConfirmAction();
                } catch (e) {
                  console.error("Dropdown confirm error:", e);
                  try {
                    alert(
                      "Failed to confirm request: " + (e as any)?.message ||
                        "Unknown error",
                    );
                  } catch (_) {}
                }
              }}
            />
            {/* Debug logging removed */}
          </Dropdown>
        </CardHeader>
        <CardBody className="py-4">
          <div className="flex items-center gap-2 mb-4">
            <Chip
              color={
                category === "Blood Drive"
                  ? "danger"
                  : "default" // Training and Advocacy use custom colors via className
              }
              className={
                category === "Training"
                  ? "bg-orange-100 text-orange-600"
                  : category === "Advocacy"
                    ? "bg-blue-100 text-blue-600"
                    : ""
              }
              radius="sm"
              size="sm"
              variant="flat"
            >
              {category}
            </Chip>
            <Chip
              color={
                displayStatus === "Approved"
                  ? "success"
                  : displayStatus === "Pending"
                    ? "warning"
                    : "danger"
              }
              radius="sm"
              size="sm"
              variant="flat"
            >
              {displayStatus}
            </Chip>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs">Province</p>
              <p className="text-xs text-default-800 font-medium">
                {resolvedGeo?.province || "N/A"}
              </p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs">District</p>
              <p className="text-xs text-default-800 font-medium">
                {resolvedGeo?.district || (district && !/^[a-f0-9]{24}$/i.test(String(district)) ? district : "N/A")}
              </p>
            </div>
            <div className="flex justify-between items-start">
              <p className="text-xs mt-1">Location</p>
              <p className="text-xs text-default-800 font-medium text-right max-w-[70%]">
                {location}
              </p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs">Date</p>
              <p className="text-xs text-default-800 font-medium text-right">
                {cardDateRange || "—"}
              </p>
            </div>
          </div>
        </CardBody>
        <CardFooter className="pt-4 flex-col items-stretch gap-3">
          <div className="h-px w-full bg-default-200"></div>
          <div className="flex justify-between w-full items-center">
            <span className="text-xs">{goalInfo?.mainLabel || "Goal Count"}</span>
            <span
              className={`text-2xl font-bold ${
                goalInfo?.isBlood ? "text-danger" : "text-default-800"
              }`}
            >
              {goalInfo?.count !== null && goalInfo?.count !== undefined
                ? goalInfo.count
                : "N/A"}
              {goalInfo && goalInfo.count !== null ? (
                goalInfo.isBlood ? (
                  <span className="text-xs font-normal ml-2">{goalInfo.label}</span>
                ) : (
                  <span className="text-xs font-normal ml-2">{goalInfo.label}</span>
                )
              ) : null}
            </span>
          </div>
        </CardFooter>
      </Card>

      {/* View Request Modal (unified request details + role/stage-specific actions) */}
      <Modal
        isOpen={viewOpen}
        placement="center"
        size="lg"
        onClose={() => {
          setViewOpen(false);
          setFullRequest(null);
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Avatar
                className="bg-default-100 border-1 border-default"
                icon={<FileText />}
              />
            </div>
            <h3 className="text-sm font-semibold py-2">Request Details</h3>
            <p className="text-xs font-normal">
              Review the details of this request below.
            </p>
          </ModalHeader>
          <ModalBody className="py-4">
            {(() => {
              const r = resolvedRequest || {};
              const reviewSummary =
                r?.reviewSummary ||
                r?.ReviewSummary ||
                r?.reviewMessage ||
                r?.event?.reviewSummary ||
                r?.event?.reviewMessage ||
                null;

              // Admin/coordinator decisions and reschedule proposals are attached
              // to `decisionSummary` by the backend. Prefer showing either the
              // original review message or the decision summary (or both).
              const decisionSummary =
                r?.decisionSummary ||
                r?.DecisionSummary ||
                r?.event?.decisionSummary ||
                null;

              // Treat as rejected when the status contains 'reject' or 'rejected'
              const statusRaw = String(r?.Status || r?.status || "");
              const isRejected = /reject(ed)?/i.test(statusRaw);

              // Try to infer who performed the decision (actor) for display
              const actorNameOrRole =
                r?.decision?.actor?.name ||
                r?.Decision?.actor?.name ||
                r?.decision?.actor?.role ||
                r?.Decision?.actor?.role ||
                r?.reviewer?.name ||
                r?.reviewer?.role ||
                r?.reviewerName ||
                r?.ReviewerName ||
                null;

              const actorLabel = actorNameOrRole
                ? String(actorNameOrRole)
                : null;

              // Build a sensible fallback note when `decisionSummary` is absent
              const fallbackNoteCandidates = [
                r?.decisionSummary,
                r?.DecisionSummary,
                r?.AdminNote,
                r?.adminNote,
                r?.Admin_Notes,
                r?.ReviewerNotes,
                r?.reviewerNotes,
                r?.rescheduleProposal?.reviewerNotes,
                r?.rescheduleProposal?.proposedBy?.notes,
                r?.DecisionNote,
                r?.decisionNote,
              ];

              const composedFallbackNote = (() => {
                for (const c of fallbackNoteCandidates) {
                  if (c !== undefined && c !== null && String(c).trim() !== "")
                    return String(c);
                }
                return null;
              })();

              const noteText =
                decisionSummary ||
                composedFallbackNote ||
                reviewSummary ||
                null;

              if (!reviewSummary && !decisionSummary) return null;

              // helper to pick first available field from candidates
              const pick = (...cands: any[]) => {
                for (const c of cands) {
                  if (c !== undefined && c !== null && c !== "") return c;
                }
                return null;
              };

              const requestedDateRaw = pick(
                r?.RequestedDate,
                r?.Date,
                r?.requestedDate,
                r?.event?.Start_Date,
                r?.event?.Start,
                null,
              );

              let startRaw = pick(
                r?.StartTime,
                r?.Start,
                r?.start,
                r?.event?.Start,
                r?.event?.Start_Time,
                null,
              );
              let endRaw = pick(
                r?.EndTime,
                r?.End,
                r?.end,
                r?.event?.End,
                null,
              );

              // If time fields are missing, try to parse them from the message (e.g. "from 08:00–16:00")
              if (!startRaw) {
                const timeMatch = String(reviewSummary).match(
                  /from\s+(\d{1,2}:\d{2})(?:\s*[–-]\s*(\d{1,2}:\d{2}))?/i,
                );
                if (timeMatch) {
                  startRaw = timeMatch[1];
                  if (timeMatch[2]) endRaw = timeMatch[2];
                }
              }

              // If date missing, attempt to extract an ISO date like 2025-12-22 from the message
              let inferredDate = requestedDateRaw;
              if (!inferredDate) {
                const dateMatch =
                  String(reviewSummary).match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) inferredDate = dateMatch[1];
              }

              const formatTime = (t?: any) => {
                if (!t) return "";
                try {
                  let d = new Date(t);
                  if (isNaN(d.getTime()) && inferredDate) {
                    d = new Date(`${inferredDate}T${t}`);
                  }
                  if (isNaN(d.getTime())) return String(t);
                  return d.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                } catch (e) {
                  return String(t);
                }
              };

              const dateDisplay = formatDate(inferredDate as any);
              const timeDisplay = startRaw
                ? `${formatTime(startRaw)}${endRaw ? " - " + formatTime(endRaw) : ""}`
                : "";

              // Additional fields to display if present
              const requester =
                pick(
                  r?.createdByName,
                  r?.RequesterName,
                  r?.First_Name,
                  r?.first_name,
                  r?.Requester,
                  r?.requesterName,
                ) || "—";

              // Prefer resolved geo names fetched when opening the modal
              let districtVal = resolvedGeo?.district || null;
              let provinceVal = resolvedGeo?.province || null;
              let municipalityVal =
                pick(r?.municipality, r?.Municipality, r?.MunicipalityName) ||
                null;
              let locationVal =
                pick(r?.Location, r?.location, r?.Venue, r?.venue) || null;
              const eventType =
                pick(
                  r?.Event_Type,
                  r?.eventType,
                  r?.Category,
                  r?.category,
                  r?.event?.Category,
                ) || "—";

              // If location is still missing, try to parse it from the message (e.g. "Located at XYZ")
              if (!locationVal) {
                const locMatch = String(reviewSummary).match(
                  /Located at\s+([^\.\n,]+)/i,
                );
                if (locMatch && locMatch[1]) {
                  locationVal = locMatch[1].trim();
                }
              }

              // Fallback to dash when unresolved
              districtVal = districtVal || "—";
              provinceVal = provinceVal || "—";
              municipalityVal = municipalityVal || "—";
              locationVal = locationVal || "—";

                          // Helper to format date/time for the card: "Dec 1 8:00 AM - 4:00 PM"
                          const formatDateShort = (d?: any) => {
                            if (!d) return null;
                            try {
                              const dt = new Date(d);
                              if (isNaN(dt.getTime())) return String(d);
                              return dt.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              });
                            } catch (e) {
                              return String(d);
                            }
                          };

                          const formatTimeShort = (t?: any) => {
                            if (!t) return null;
                            try {
                              const dt = new Date(t);
                              if (isNaN(dt.getTime())) return String(t);
                              return dt.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              });
                            } catch (e) {
                              return String(t);
                            }
                          };

                          const startVal = pick(
                            r?.Start_Date,
                            r?.Start,
                            r?.start,
                            r?.StartTime,
                            r?.event?.Start_Date,
                            r?.event?.Start,
                            null,
                          );

                          const endVal = pick(
                            r?.End_Date,
                            r?.End,
                            r?.end,
                            r?.EndTime,
                            r?.event?.End_Date,
                            r?.event?.End,
                            null,
                          );

                          const startDateShort = formatDateShort(startVal);
                          const startTimeShort = formatTimeShort(startVal);
                          const endTimeShort = formatTimeShort(endVal);

              return (
                <div className="space-y-3 mb-4">
                  <div className="p-4 border border-default-200 rounded-lg bg-default-50">
                    {/* Prefer showing the backend decision summary (includes admin/coordinator note)
                        when present — replace the original request message for reschedule/reject flows. */}
                    {isRejected ? (
                      <>
                        <p className="text-xs font-semibold text-default-900 mb-2">
                          Rejected
                        </p>
                        <p className="text-xs text-default-800 whitespace-pre-line">
                          {decisionSummary || reviewSummary}
                        </p>
                      </>
                    ) : decisionSummary ? (
                      <>
                        <p className="text-xs font-semibold text-default-900 mb-2">
                          Decision Note
                        </p>
                        <p className="text-xs text-default-800 whitespace-pre-line">
                          {decisionSummary}
                        </p>
                      </>
                    ) : reviewSummary ? (
                      <>
                        <p className="text-xs font-semibold text-default-900 mb-2">
                          Request Message
                        </p>
                        <p className="text-xs text-default-800 whitespace-pre-line">
                          {reviewSummary}
                        </p>
                      </>
                    ) : null}

                    <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-default-700 font-semibold">
                          Requester
                        </p>
                        <p className="text-default-800 font-medium">
                          {requester}
                        </p>

                        <p className="mt-3 text-default-700 font-semibold">
                          Province
                        </p>
                        <p className="text-default-800">{provinceVal}</p>

                        <p className="mt-3 text-default-700 font-semibold">
                          District
                        </p>
                        <p className="text-default-800">{districtVal}</p>

                        <p className="mt-3 text-default-700 font-semibold">
                          Municipality
                        </p>
                        <p className="text-default-800">{municipalityVal}</p>
                      </div>

                      <div>
                        <p className="text-default-700 font-semibold">Date</p>
                        <p className="text-default-800 font-medium">
                          {dateDisplay}
                        </p>

                        <p className="mt-3 text-default-700 font-semibold">
                          Time
                        </p>
                        <p className="text-default-800">{timeDisplay || "—"}</p>

                        <p className="mt-3 text-default-700 font-semibold">
                          Location
                        </p>
                        <p className="text-default-800">{locationVal}</p>

                        <p className="mt-3 text-default-700 font-semibold">
                          Event Type
                        </p>
                        <p className="text-default-800">{eventType}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Reduced details: only request message is shown above. */}
          </ModalBody>
          <ModalFooter>
            {(() => {
              const dynamicFooter = renderFooterActionsFromAllowed();
              if (dynamicFooter) return dynamicFooter;

              return (
                <Button variant="bordered" onPress={() => setViewOpen(false)}>
                  Close
                </Button>
              );
            })()}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <RescheduleModal
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        currentDate={date}
        onConfirm={handleRescheduleConfirm}
      />

      {/* Manage Staff Dialog (shared component) */}
      <ManageStaffModal
        eventId={
          request?.Event_ID || (request?.event && request.event.Event_ID)
        }
        isOpen={manageStaffOpen}
        request={request}
        requestId={request?.Request_ID}
        onClose={() => setManageStaffOpen(false)}
        onSaved={async () => {
          // onSaved hook: refresh request data and dispatch event
          const requestId = request?.Request_ID || request?.RequestId || request?._id || null;
          if (requestId && typeof window !== "undefined") {
            // Dispatch refresh event to trigger parent refresh
            window.dispatchEvent(
              new CustomEvent("unite:requests-changed", {
                detail: {
                  requestId,
                  action: "staff-updated",
                  forceRefresh: true,
                  cacheKeysToInvalidate: [`/api/event-requests/${requestId}`],
                },
              })
            );
          }
        }}
      />

      <ConfirmModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel Event"
        message="Are you sure you want to cancel this event? This action cannot be undone. Please provide a reason for cancellation."
        confirmText="Cancel Event"
        onConfirm={async (note?: string) => await handleCancelWithNote(note)}
        requireNote={true}
        color="danger"
      />

      <ConfirmModal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Event"
        message="Provide a reason for rejecting this event. This will be shown to the requester."
        confirmText="Reject"
        onConfirm={async (note?: string) => await handleRejectWithNote(note)}
        requireNote={true}
      />

      <ConfirmModal
        isOpen={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        title="Accept Event"
        message="Are you sure you want to accept this event?"
        confirmText="Accept"
        onConfirm={async (note?: string) => await handleAccept(note)}
        requireNote={false}
      />

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Request"
        message="Are you sure you want to delete this request? This action cannot be undone."
        confirmText="Delete"
        onConfirm={async () => await handleDelete()}
        requireNote={false}
        color="danger"
      />

      {/* Success Modal */}
      <Modal
        isOpen={successModal}
        placement="center"
        size="sm"
        onClose={() => setSuccessModal(false)}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Avatar
                className="border-1"
                icon={<Check className="w-4 h-4" />}
              />
            </div>
            <h3 className="text-sm font-semibold py-2">Success</h3>
            <p className="text-xs font-normal">Request deleted successfully.</p>
          </ModalHeader>
          <ModalBody className="py-4"></ModalBody>
          <ModalFooter>
            <Button
              className="bg-black text-white font-medium"
              color="default"
              onPress={() => setSuccessModal(false)}
            >
              OK
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default EventCard;
