"use client";
import React, { useCallback, useMemo, useState } from "react";
import { DatePicker } from "@heroui/date-picker";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Avatar } from "@heroui/avatar";
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
import {
  MoreVertical,
  Eye,
  Edit,
  Clock,
  Trash2,
  Check,
  X,
  Users,
  FileText,
} from "lucide-react";

import ManageStaffModal from "../manage-staff-modal";
import EventActionMenu from "./EventActionMenu";
import RescheduleModal from "./modals/RescheduleModal";
import ConfirmModal from "./modals/ConfirmModal";
import {
  performRequestAction as svcPerformRequestAction,
  performStakeholderConfirm as svcPerformStakeholderConfirm,
  performCoordinatorConfirm,
  fetchRequestDetails as svcFetchRequestDetails,
  deleteRequest as svcDeleteRequest,
} from "./services/requestsService";

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
  onRejectEvent?: (note?: string) => void;
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
  const [resolvedGeo, setResolvedGeo] = useState<any>({});

  // Try to resolve district/province names for the card itself (best-effort)
  React.useEffect(() => {
    (async () => {
      try {
        const pickId =
          (request && (request as any).district) || district || null;

        const isObjectId = (s: any) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);

        if (!pickId) return;

        // If it's already a friendly name (not an ObjectId), use it
        if (!isObjectId(pickId)) {
          setResolvedGeo((p: any) => ({ ...(p || {}), district: pickId }));
          return;
        }

        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
            : null;
        const headers: any = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Try direct lookup
        try {
          const res = await fetch(`${API_BASE}/api/districts/${encodeURIComponent(pickId)}`, { headers, credentials: token ? undefined : "include" });
          if (res && res.ok) {
            const body = await res.json().catch(() => null);
            const data = body?.data || body?.district || body || null;
            if (data) {
              const districtName = data?.District_Name || data?.DistrictName || data?.name || data?.Name || null;
              const provinceName = data?.Province_Name || data?.ProvinceName || data?.province || data?.Province || null;
              setResolvedGeo((p: any) => ({ ...(p || {}), district: districtName || null, province: provinceName || null }));
              return;
            }
          }
        } catch (e) {
          // ignore
        }

        // Fallback: list and match by _id or District_ID
        try {
          const listRes = await fetch(`${API_BASE}/api/districts?page=1&limit=1000`, { headers, credentials: token ? undefined : "include" });
          if (listRes && listRes.ok) {
            const listBody = await listRes.json().catch(() => null);
            const list = listBody?.data || listBody?.districts || listBody || [];
            if (Array.isArray(list) && list.length) {
              const match = list.find((d: any) => String(d._id) === String(pickId) || String(d.District_ID) === String(pickId));
              if (match) {
                const districtName = match?.District_Name || match?.DistrictName || match?.name || match?.Name || null;
                const provinceName = match?.Province_Name || match?.ProvinceName || match?.province || match?.Province || null;
                setResolvedGeo((p: any) => ({ ...(p || {}), district: districtName || null, province: provinceName || null }));
                return;
              }
            }
          }
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // ignore overall
      }
    })();
  }, [district, request]);

  const resolvedRequest =
    fullRequest ||
    request ||
    (request && (request as any).event) ||
    null;

  const resolvedRequestId =
    resolvedRequest?.Request_ID ||
    resolvedRequest?.RequestId ||
    resolvedRequest?._id ||
    resolvedRequest?.requestId ||
    null;


  const resolveActorEndpoint = () => {
    const viewer = getViewer();
    const roleString = String(viewer.role || "").toLowerCase();

    if (viewer.isAdmin) return "admin-action";
    if (roleString.includes("coordinator")) return "coordinator-action";
    if (roleString.includes("stakeholder")) return "stakeholder-action";

    return "admin-action";
  };

  const allowedActionSet = useAllowedActionSet({ request, fullRequest, resolvedRequest });
  const hasAllowedAction = React.useCallback(hasAllowedActionFactory(allowedActionSet), [allowedActionSet]);

  const viewer = getViewer();
  const viewerId = getViewerId();
  const viewerRoleString = String(viewer.role || "").toLowerCase();

  const isReviewAccepted = (() => {
    try {
      const r = resolvedRequest || request || {};
      const s = String(r?.Status || r?.status || "").toLowerCase();
      return s.includes("review") && s.includes("accepted");
    } catch (e) {
      return false;
    }
  })();

  const viewerIsAssignedCoordinator = (() => {
    try {
      if (!viewerId) return false;
      if (!viewerRoleString.includes("coordinator")) return false;
      const r = resolvedRequest || request || {};
      if (!r) return false;
      const coordId = r?.coordinator_id || r?.Coordinator_ID || r?.coordinatorId || null;
      const reviewerId = r?.reviewer?.id || r?.reviewerId || null;
      return String(viewerId) === String(coordId) || String(viewerId) === String(reviewerId);
    } catch (e) {
      return false;
    }
  })();

  const hasAnyAllowedAction = (names: string[]) =>
    names.some((name) => hasAllowedAction(name));

  // Manage staff state
  // Manage staff modal is handled by the shared ManageStaffModal component

  // Reschedule handler used by RescheduleModal
  const handleRescheduleConfirm = async (currentDateStr: string, rescheduledISO: string, noteText: string) => {
    try {
      if (onRescheduleEvent) {
        onRescheduleEvent(currentDateStr, rescheduledISO, noteText);
      } else {
        if (resolvedRequestId) {
          await performRequestAction(
            resolvedRequestId,
            resolveActorEndpoint(),
            "Rescheduled",
            noteText,
            rescheduledISO,
          );
        }
      }
    } catch (e) {
      console.error("Reschedule error:", e);
    } finally {
      setRescheduleOpen(false);
    }

    if (viewOpen) {
      await openViewRequest();
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
      const n = note ? note.trim() : "";
      if (!n) {
        throw new Error("Please provide a reason for cancelling this event");
      }

      if (resolvedRequestId) {
        await performRequestAction(
          resolvedRequestId,
          resolveActorEndpoint(),
          "Cancelled",
          n,
        );
      } else if (onCancelEvent) {
        onCancelEvent();
      }
    } catch (e) {
      console.error("Cancel error:", e);
      alert("Failed to cancel event: " + ((e as Error).message || "Unknown error"));
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
      if (!fullRequest || (r.Status !== "Cancelled" && r.status !== "Cancelled")) {
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
          (r?.made_by_role === "Stakeholder" ? r?.made_by_id : null) ||
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
    if (onRejectEvent) {
      try {
        onRejectEvent();
      } catch (e) {}
    }
    setRejectOpen(false);
  };

  const handleAccept = (note?: string) => {
    (async () => {
      try {
        if (resolvedRequestId) {
          await performRequestAction(
            resolvedRequestId,
            resolveActorEndpoint(),
            "Accepted",
            note || "",
          );
        } else if (onAcceptEvent) {
          try {
            onAcceptEvent(note);
          } catch (e) {}
        }
      } catch (e) {
        console.error("Accept error:", e);
        alert(
          "Failed to accept request: " +
            ((e as Error).message || "Unknown error"),
        );
      } finally {
        setAcceptOpen(false);
      }
    })();
  };

  // New: handle reject with admin note
  const handleRejectWithNote = (note?: string) => {
    (async () => {
      try {
        if (resolvedRequestId) {
          await performRequestAction(
            resolvedRequestId,
            resolveActorEndpoint(),
            "Rejected",
            note || "",
          );
        } else if (onRejectEvent) {
          try {
            onRejectEvent(note);
          } catch (e) {}
        }
      } catch (e) {
        // ignore
      } finally {
        setRejectOpen(false);
      }
    })();
  };

  // Menu for Approved status
  // Helper to derive flags from request/event or fallback to allowedActions
  const flagFor = (
    flagName: string,
    actionName?: string | string[],
  ): boolean => {
    try {
      const r = resolvedRequest || request || {};
      const explicit =
        (r as any)?.[flagName] ?? (r as any)?.event?.[flagName];

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


  // Menus are now rendered by EventActionMenu which uses the same flags and setters

  // Menu for Pending status
  // pendingMenu moved to EventActionMenu

  // Default menu for Rejected or other statuses
  // defaultMenu moved to EventActionMenu

  // API_BASE imported from event-card.constants

  // Network operations moved to services/requestsService
  const performRequestAction = svcPerformRequestAction;

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
      const url = `${API_BASE}/api/requests/${encodeURIComponent(requestId)}`;
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
      // Try to resolve district/province names when opening modal
      (async () => {
        try {
          const rr = finalRequest || r || {};
          const pickId =
            rr?.district || rr?.District || rr?.districtId || rr?.District_ID || rr?.district_id || null;

          const isObjectId = (s: any) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);

          if (pickId && isObjectId(pickId)) {
            try {
              const token =
                typeof window !== "undefined"
                  ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
                  : null;
              const headers: any = { "Content-Type": "application/json" };
              if (token) headers["Authorization"] = `Bearer ${token}`;

              // First try the direct lookup (this endpoint expects `District_ID` normally)
              let foundDistrict: any = null;
              try {
                const res = await fetch(
                  `${API_BASE}/api/districts/${encodeURIComponent(pickId)}`,
                  { headers, credentials: token ? undefined : "include" },
                );

                if (res && res.ok) {
                  const body = await res.json().catch(() => null);
                  const data = body?.data || body?.district || body;
                  foundDistrict = data || null;
                }
              } catch (e) {
                // ignore direct lookup failure and try fallback
              }

              // Fallback: list districts (large limit) and search by Mongo _id
              if (!foundDistrict) {
                try {
                  const listRes = await fetch(`${API_BASE}/api/districts?page=1&limit=1000`, {
                    headers,
                    credentials: token ? undefined : "include",
                  });

                  if (listRes && listRes.ok) {
                    const listBody = await listRes.json().catch(() => null);
                    const list = listBody?.data || listBody?.districts || listBody || [];
                    if (Array.isArray(list) && list.length) {
                      const match = list.find((d: any) => String(d._id) === String(pickId) || String(d.District_ID) === String(pickId));
                      if (match) foundDistrict = match;
                    }
                  }
                } catch (e) {
                  // ignore
                }
              }

              if (foundDistrict) {
                const districtName = foundDistrict?.District_Name || foundDistrict?.DistrictName || foundDistrict?.name || foundDistrict?.Name || null;
                let provinceName = foundDistrict?.Province_Name || foundDistrict?.ProvinceName || foundDistrict?.province || foundDistrict?.Province || null;

                // If provinceName looks like a Mongo _id, try to resolve via provinces list
                const isObjectId = (s: any) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);
                if (provinceName && isObjectId(provinceName)) {
                  try {
                    const provRes = await fetch(`${API_BASE}/api/locations/provinces`, { headers, credentials: token ? undefined : "include" });
                    if (provRes && provRes.ok) {
                      const provBody = await provRes.json().catch(() => null);
                      const provList = provBody?.data || provBody || [];
                      if (Array.isArray(provList)) {
                        const matchProv = provList.find((p: any) => String(p._id) === String(provinceName) || String(p.Province_ID) === String(provinceName));
                        if (matchProv) provinceName = matchProv?.name || matchProv?.Province_Name || matchProv?.ProvinceName || null;
                      }
                    }
                  } catch (e) {
                    // ignore
                  }
                }

                setResolvedGeo((prev: any) => ({ ...prev, district: districtName || null, province: provinceName || null }));
              }
            } catch (e) {
              // ignore fetch errors
            }
          }
        } catch (e) {}
      })();

      setViewOpen(true);
    } catch (e) {
      // fallback to provided request
      setFullRequest(request || (request && (request as any).event) || null);
      setViewOpen(true);
    }
  };

  // Stakeholder confirm action moved to services
  const performStakeholderConfirm = svcPerformStakeholderConfirm;

  const runStakeholderDecision = async (
    decision: "Accepted" | "Rejected",
  ) => {
    try {
      if (!resolvedRequestId) {
        throw new Error("Unable to determine request id");
      }
      // If current viewer is a coordinator confirming an admin decision, use the coordinator-confirm endpoint
      if (viewerRoleString.includes("coordinator") && viewerIsAssignedCoordinator) {
        await performCoordinatorConfirm(resolvedRequestId, decision);
      } else {
        await performStakeholderConfirm(resolvedRequestId, decision);
      }
      setViewOpen(false);
    } catch (err: any) {
      console.error("Stakeholder decision error:", err);
      alert(
        `Failed to ${
          decision === "Accepted" ? "confirm" : "decline"
        } request: ${err?.message || "Unknown error"}`,
      );
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

    actions.push(
      <DropdownItem
        key="view-request"
        description="View request details"
        startContent={<FileText />}
        onPress={async () => {
          await openViewRequest();
        }}
      >
        View Request
      </DropdownItem>,
    );

    if (flagFor("canManageStaff", "manage-staff")) {
      actions.push(
        <DropdownItem
          key="manage-staff"
          description="Manage staff for this event"
          startContent={<Users />}
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
            startContent={<X />}
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
          onPress={() => setRescheduleOpen(true)}
        >
          Reschedule
        </DropdownItem>,
      );
    }

    // Show Confirm action when allowed, or as a fallback when request is review-accepted
    // and the current viewer is the assigned coordinator (ensures quick-action availability).
    if (flagFor("canConfirm", "confirm") || (isReviewAccepted && viewerIsAssignedCoordinator)) {
      actions.push(
        <DropdownItem
          key="confirm"
          description="Confirm the reviewer decision"
          startContent={<Check />}
          onPress={async () => {
            try {
              if (viewerRoleString.includes("coordinator") && viewerIsAssignedCoordinator) {
                await performCoordinatorConfirm(resolvedRequestId, "Accepted");
                setViewOpen(false);
              } else {
                await runStakeholderDecision("Accepted");
              }
            } catch (e) {
              console.error("Confirm error:", e);
              alert("Failed to confirm request: " + (e as any)?.message || "Unknown error");
            }
          }}
        >
          Confirm
        </DropdownItem>,
      );
    }

    if (flagFor("canDecline", "decline")) {
      actions.push(
        <DropdownItem
          key="decline"
          description="Decline the reviewer decision"
          startContent={<X />}
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
            <Trash2 className="text-xl text-danger pointer-events-none shrink-0" />
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
            <Trash2 className="text-xl text-danger pointer-events-none shrink-0" />
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
    if (isReviewAccepted && viewerIsAssignedCoordinator) {
      buttons.push(
        <Button
          key="footer-confirm"
          className="bg-black text-white"
          color="default"
          onPress={async () => {
            setViewOpen(false);
            try {
              if (!resolvedRequestId) return alert('Request id not found');
              await performCoordinatorConfirm(resolvedRequestId, 'Accepted');
              try { window.dispatchEvent(new CustomEvent('unite:requests-changed', { detail: { requestId: resolvedRequestId } })); } catch (e) {}
            } catch (e) {
              console.error('Footer confirm error:', e);
              alert('Failed to confirm request: ' + ((e as any)?.message || 'Unknown error'));
            }
          }}
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
        >
          Accept
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
    if (!(isReviewAccepted && viewerIsAssignedCoordinator) && hasAllowedAction("reject")) {
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
    const r = resolvedRequest || request || (request && (request as any).event) || {};

    // Prefer a human-friendly label returned by the backend when present
    const backendLabel = r?.statusLabel || r?.status_label || r?.StatusLabel || null;
    if (backendLabel) return backendLabel;

    // First check the request Status field for new workflow statuses
    const requestStatus = String(r?.Status || r?.status || '').toLowerCase();

    // Unified workflow statuses (case-insensitive)
    if (requestStatus.includes('pending') || requestStatus.includes('pending_review') || requestStatus.includes('pending_review')) {
      if (r?.reviewer?.role && String(r.reviewer.role).toLowerCase().includes('coordinator')) return 'Waiting for Coordinator review';
      if (r?.reviewer?.role && (String(r.reviewer.role).toLowerCase().includes('admin') || String(r.reviewer.role).toLowerCase().includes('systemadmin'))) return 'Waiting for Admin review';
      return 'Waiting for Admin or Coordinator review';
    }

    if (requestStatus.includes('review')) {
      if (requestStatus.includes('accepted')) return 'Waiting for Coordinator confirmation';
      if (requestStatus.includes('resched') || requestStatus.includes('reschedule') || requestStatus.includes('rescheduled')) return (r?.reviewer?.role && String(r.reviewer.role).toLowerCase().includes('coordinator')) ? 'Waiting for Coordinator review (reschedule)' : 'Waiting for Admin review (reschedule)';
      return 'Waiting for Admin or Coordinator review';
    }

    if (requestStatus.includes('rescheduled_by_admin') || requestStatus.includes('rescheduled_by_admin') || requestStatus.includes('rescheduled_by_admin')) {
      return (r?.reviewer?.role && String(r.reviewer.role).toLowerCase().includes('coordinator')) ? 'Waiting for Coordinator review (reschedule)' : 'Waiting for Admin review (reschedule)';
    }
    if (requestStatus.includes('rescheduled_by_coordinator')) {
      return 'Rescheduled by coordinator';
    }
    if (requestStatus.includes('rescheduled_by_stakeholder')) {
      return 'Rescheduled by stakeholder';
    }

    // Fallback to old logic for backward compatibility
    if (status !== "Pending") return null;
    const adminAction =
      (r as any).AdminAction ?? (r as any).adminAction ?? null;
    const stakeholderAction =
      (r as any).StakeholderFinalAction ??
      (r as any).stakeholderFinalAction ??
      null;
    const coordinatorAction =
      (r as any).CoordinatorFinalAction ??
      (r as any).coordinatorFinalAction ??
      null;

    // Check if there's a stakeholder involved in this request
    const hasStakeholder =
      r?.stakeholder_id ||
      r?.Stakeholder_ID ||
      r?.StakeholderId ||
      r?.MadeByStakeholderID ||
      r?.stakeholder?.Stakeholder_ID ||
      null;

    if (!adminAction) return "Waiting for admin review";
    if (hasStakeholder && !stakeholderAction) return "Waiting for stakeholder confirmation";
    if (!coordinatorAction) return "Waiting for coordinator confirmation";

    return null;
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

  return (
    <>
      <Card className="w-full max-w-md h-60 rounded-xl border border-gray-200 shadow-none bg-white">
        <CardHeader className="flex justify-between items-center">
          {/* Avatar Section*/}
          <div className="flex items-center gap-3">
            <Avatar />
            <div>
              <h3 className="text-sm font-semibold">{title}</h3>
              {/* Show stakeholder full name when available; fall back to organization/coordinator */}
              <p className="text-xs text-default-800">
                {(request &&
                  (request.createdByName ||
                    (request.event && request.event.createdByName))) ||
                  organization ||
                  organizationType}
              </p>
              {getPendingStageLabel() ? (
                <p className="text-xs text-default-500 mt-1">
                  {getPendingStageLabel()}
                </p>
              ) : null}
            </div>
          </div>
          <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly aria-label="Event actions" className="hover:text-default-800" variant="light">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownTrigger>
              <EventActionMenu
                allowedActionSet={allowedActionSet}
                hasAllowedAction={hasAllowedAction}
                flagFor={flagFor}
                status={status}
                request={request}
                onViewEvent={onViewEvent}
                onEditEvent={onEditEvent}
                openViewRequest={openViewRequest}
                setManageStaffOpen={setManageStaffOpen}
                setRescheduleOpen={setRescheduleOpen}
                setAcceptOpen={setAcceptOpen}
                setRejectOpen={setRejectOpen}
                setCancelOpen={setCancelOpen}
                setDeleteOpen={setDeleteOpen}
                showConfirmFallback={isReviewAccepted && viewerIsAssignedCoordinator}
                onConfirm={async () => {
                  try {
                    if (!resolvedRequestId) throw new Error('Request id not found');
                    if (viewerRoleString.includes('coordinator') && viewerIsAssignedCoordinator) {
                      await performCoordinatorConfirm(resolvedRequestId, 'Accepted');
                    } else {
                      await runStakeholderDecision('Accepted');
                    }
                    try { window.dispatchEvent(new CustomEvent('unite:requests-changed', { detail: { requestId: resolvedRequestId } })); } catch (e) {}
                  } catch (e) {
                    console.error('Dropdown confirm error:', e);
                    try { alert('Failed to confirm request: ' + (e as any)?.message || 'Unknown error'); } catch (_) {}
                  }
                }}
              />
          </Dropdown>
        </CardHeader>
        <CardBody>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs">District</p>
            <p className="text-xs text-default-800 font-medium">{resolvedGeo?.district || district}</p>
          </div>
          <div className="flex items-center gap-3">
            <Chip color="primary" radius="sm" size="sm" variant="faded">
              {category}
            </Chip>
            <Chip
              color={
                status === "Approved"
                  ? "success"
                  : status === "Pending"
                    ? "warning"
                    : "danger"
              }
              radius="sm"
              size="sm"
              variant="flat"
            >
              {status}
            </Chip>
            {/* Confirm is available in the action menu; no quick button on the card itself */}
          </div>
        </CardBody>
        <CardFooter className="flex flex-col items-start gap-2 text-xs">
          <div className="flex justify-between w-full">
            <span className="">Location</span>
            <span className="text-default-800 text-right">{location}</span>
          </div>
          <div className="flex justify-between w-full">
            <span className="">Date</span>
            <span className="text-default-800">{date}</span>
          </div>
          {/* Primary action: View Request (replaces direct accept/reject on card) */}
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
          <ModalHeader>
            <span className="text-lg font-semibold">Request Details</span>
          </ModalHeader>
          <ModalBody>
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
                r?.decisionSummary || r?.DecisionSummary || r?.event?.decisionSummary || null;

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
                  if (c !== undefined && c !== null && String(c).trim() !== "") return String(c);
                }
                return null;
              })();

              const noteText = decisionSummary || composedFallbackNote || reviewSummary || null;

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
                const timeMatch = String(reviewSummary).match(/from\s+(\d{1,2}:\d{2})(?:\s*[–-]\s*(\d{1,2}:\d{2}))?/i);
                if (timeMatch) {
                  startRaw = timeMatch[1];
                  if (timeMatch[2]) endRaw = timeMatch[2];
                }
              }

              // If date missing, attempt to extract an ISO date like 2025-12-22 from the message
              let inferredDate = requestedDateRaw;
              if (!inferredDate) {
                const dateMatch = String(reviewSummary).match(/(\d{4}-\d{2}-\d{2})/);
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
              const timeDisplay = startRaw ? `${formatTime(startRaw)}${endRaw ? " - " + formatTime(endRaw) : ""}` : "";

              // Additional fields to display if present
              const requester = pick(r?.createdByName, r?.RequesterName, r?.First_Name, r?.first_name, r?.Requester, r?.requesterName) || "—";

              // Prefer resolved geo names fetched when opening the modal
              let districtVal = resolvedGeo?.district || null;
              let provinceVal = resolvedGeo?.province || null;
              let municipalityVal = pick(r?.municipality, r?.Municipality, r?.MunicipalityName) || null;
              let locationVal = pick(r?.Location, r?.location, r?.Venue, r?.venue) || null;
              const eventType = pick(r?.Event_Type, r?.eventType, r?.Category, r?.category, r?.event?.Category) || "—";

              // If location is still missing, try to parse it from the message (e.g. "Located at XYZ")
              if (!locationVal) {
                const locMatch = String(reviewSummary).match(/Located at\s+([^\.\n,]+)/i);
                if (locMatch && locMatch[1]) {
                  locationVal = locMatch[1].trim();
                }
              }

              // Fallback to dash when unresolved
              districtVal = districtVal || "—";
              provinceVal = provinceVal || "—";
              municipalityVal = municipalityVal || "—";
              locationVal = locationVal || "—";

              return (
                <div className="space-y-3 mb-4">
                  <div className="p-4 border border-default-200 rounded-lg bg-default-50">

                    {/* Prefer showing the backend decision summary (includes admin/coordinator note)
                        when present — replace the original request message for reschedule/reject flows. */}
                    {isRejected ? (
                      <>
                        <p className="text-sm font-semibold text-default-900 mb-2">Rejected</p>
                        <p className="text-sm text-default-800 whitespace-pre-line">{decisionSummary || reviewSummary}</p>
                      </>
                    ) : decisionSummary ? (
                      <>
                        <p className="text-sm font-semibold text-default-900 mb-2">Decision Note</p>
                        <p className="text-sm text-default-800 whitespace-pre-line">{decisionSummary}</p>
                      </>
                    ) : reviewSummary ? (
                      <>
                        <p className="text-sm font-semibold text-default-900 mb-2">Request Message</p>
                        <p className="text-sm text-default-800 whitespace-pre-line">{reviewSummary}</p>
                      </>
                    ) : null}

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-default-700 font-semibold">Requester</p>
                        <p className="text-default-800 font-medium">{requester}</p>

                        <p className="mt-3 text-default-700 font-semibold">Province</p>
                        <p className="text-default-800">{provinceVal}</p>

                        <p className="mt-3 text-default-700 font-semibold">District</p>
                        <p className="text-default-800">{districtVal}</p>

                        <p className="mt-3 text-default-700 font-semibold">Municipality</p>
                        <p className="text-default-800">{municipalityVal}</p>
                      </div>

                      <div>
                        <p className="text-default-700 font-semibold">Date</p>
                        <p className="text-default-800 font-medium">{dateDisplay}</p>

                        <p className="mt-3 text-default-700 font-semibold">Time</p>
                        <p className="text-default-800">{timeDisplay || "—"}</p>

                        <p className="mt-3 text-default-700 font-semibold">Location</p>
                        <p className="text-default-800">{locationVal}</p>

                        <p className="mt-3 text-default-700 font-semibold">Event Type</p>
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
          // onSaved hook: you can refresh data here if needed
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
      />

      {/* Success Modal */}
      <Modal
        isOpen={successModal}
        placement="center"
        size="sm"
        onClose={() => setSuccessModal(false)}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success-50">
              <Check className="w-5 h-5 text-success-500" />
            </div>
            <span className="text-lg font-semibold">Success</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Request deleted successfully.
            </p>
          </ModalBody>
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
