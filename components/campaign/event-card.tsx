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
      await performStakeholderConfirm(resolvedRequestId, decision);
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

    if (flagFor("canConfirm", "confirm")) {
      actions.push(
        <DropdownItem
          key="confirm"
          description="Confirm the reviewer decision"
          startContent={<Check />}
          onPress={async () => {
            await runStakeholderDecision("Accepted");
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

    if (hasAllowedAction(["accept", "approve"])) {
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

    if (hasAllowedAction("reject")) {
      buttons.push(
        <Button
          key="footer-reject"
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

    if (hasAllowedAction("confirm")) {
      buttons.push(
        <Button
          key="footer-confirm"
          className="bg-black text-white"
          color="default"
          onPress={async () => {
            await runStakeholderDecision("Accepted");
          }}
        >
          Confirm
        </Button>,
      );
    }

    if (hasAllowedAction("decline")) {
      buttons.push(
        <Button
          key="footer-decline"
          variant="bordered"
          onPress={async () => {
            await runStakeholderDecision("Rejected");
          }}
        >
          Decline
        </Button>,
      );
    }

    if (hasAllowedAction("cancel")) {
      buttons.push(
        <Button
          key="footer-cancel"
          color="danger"
          variant="bordered"
          onPress={() => {
            setViewOpen(false);
            setCancelOpen(true);
          }}
        >
          Cancel Request
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
    const r = request || (request && (request as any).event) || {};

    // First check the request Status field for new workflow statuses
    const requestStatus = r?.Status || r?.status || null;

    if (requestStatus === "Pending_Stakeholder_Review") {
      return "Waiting for stakeholder review";
    }
    if (requestStatus === "Pending_Coordinator_Review") {
      return "Waiting for coordinator review";
    }
    if (requestStatus === "Pending_Admin_Review") {
      return "Waiting for admin review";
    }
    if (requestStatus === "Rescheduled_By_Admin") {
      return "Rescheduled by admin";
    }
    if (requestStatus === "Rescheduled_By_Coordinator") {
      return "Rescheduled by coordinator";
    }
    if (requestStatus === "Rescheduled_By_Stakeholder") {
      return "Rescheduled by stakeholder";
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
              />
          </Dropdown>
        </CardHeader>
        <CardBody>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs">District</p>
            <p className="text-xs text-default-800 font-medium">{district}</p>
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
              const decisionSummary =
                r?.decisionSummary ||
                r?.event?.decisionSummary ||
                null;

              if (!reviewSummary && !decisionSummary) return null;

              return (
                <div className="space-y-3 mb-4">
                  {reviewSummary ? (
                    <div className="p-3 border border-default-200 rounded-lg bg-default-50">
                      <p className="text-sm font-medium text-default-900 mb-1">
                        Request Message
                      </p>
                      <p className="text-xs text-default-700 whitespace-pre-line">
                        {reviewSummary}
                      </p>
                    </div>
                  ) : null}
                  {decisionSummary ? (
                    <div className="p-3 border border-default-200 rounded-lg bg-default-50">
                      <p className="text-sm font-medium text-default-900 mb-1">
                        Latest Decision
                      </p>
                      <p className="text-xs text-default-700 whitespace-pre-line">
                        {decisionSummary}
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })()}
            {(() => {
              const r =
                fullRequest ||
                request ||
                (request && (request as any).event) ||
                {};
              const adminAction =
                (r as any).AdminAction ?? (r as any).adminAction ?? null;
              const stakeholderAction =
                (r as any).StakeholderFinalAction ??
                (r as any).stakeholderFinalAction ??
                null;
              const isEdit =
                r.originalData && Object.keys(r.originalData).length > 0;
              const isRescheduled =
                adminAction &&
                String(adminAction).toLowerCase().includes("resched");
              const isStakeholderRescheduled =
                stakeholderAction &&
                String(stakeholderAction).toLowerCase().includes("resched");
              const isRejected =
                adminAction &&
                String(adminAction).toLowerCase().includes("reject");
              const isCancelled =
                adminAction &&
                String(adminAction).toLowerCase().includes("cancel");

              if (isStakeholderRescheduled) {
                // Stakeholder rescheduled request
                return (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium">
                        Stakeholder Rescheduled Event
                      </h4>
                    </div>
                    <div>
                      <p className="text-xs text-default-800">
                        Original Date:{" "}
                        {r?.RequestedDate || r?.Date || date || "—"}
                      </p>
                      <p className="text-xs text-default-800">
                        New Date:{" "}
                        {formatDate(
                          r?.RescheduledDate ||
                            r?.Rescheduled_Date ||
                            r?.rescheduledDate,
                        )}
                      </p>
                      <p className="text-xs text-default-600">
                        Note: {r?.StakeholderNote || "—"}
                      </p>
                    </div>
                  </div>
                );
              } else if (isRescheduled) {
                // Admin rescheduled request
                return (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium">Rescheduled Event</h4>
                    </div>
                    <div>
                      <p className="text-xs text-default-800">
                        Original Date:{" "}
                        {r?.RequestedDate || r?.Date || date || "—"}
                      </p>
                      <p className="text-xs text-default-800">
                        New Date:{" "}
                        {formatDate(
                          r?.RescheduledDate ||
                            r?.Rescheduled_Date ||
                            r?.rescheduledDate,
                        )}
                      </p>
                      <p className="text-xs text-default-600">
                        Note: {r?.AdminNote || "—"}
                      </p>
                    </div>
                    {/* Stakeholder action if any */}
                    {stakeholderAction ? (
                      <div className="mt-2 p-2 border border-default-200 rounded">
                        {(() => {
                          const s = String(
                            stakeholderAction || "",
                          ).toLowerCase();

                          if (s.includes("accept"))
                            return (
                              <div className="px-2 py-1 rounded-full bg-success-50 text-success-700 text-xs font-semibold inline-block">
                                Stakeholder: Accepted
                              </div>
                            );
                          if (s.includes("reject"))
                            return (
                              <div className="px-2 py-1 rounded-full bg-danger-50 text-danger-700 text-xs font-semibold inline-block">
                                Stakeholder: Rejected
                              </div>
                            );

                          return (
                            <div className="px-2 py-1 rounded-full bg-default-50 text-default-700 text-xs font-semibold inline-block">
                              Stakeholder: {String(stakeholderAction)}
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}
                  </div>
                );
              } else if (isEdit) {
                // Admin rescheduled request
                return (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium">Rescheduled Event</h4>
                    </div>
                    <div>
                      <p className="text-xs text-default-800">
                        Original Date:{" "}
                        {r?.RequestedDate || r?.Date || date || "—"}
                      </p>
                      <p className="text-xs text-default-800">
                        New Date:{" "}
                        {formatDate(
                          r?.RescheduledDate ||
                            r?.Rescheduled_Date ||
                            r?.rescheduledDate,
                        )}
                      </p>
                      <p className="text-xs text-default-600">
                        Note: {r?.AdminNote || "—"}
                      </p>
                    </div>
                    {/* Stakeholder action if any */}
                    {stakeholderAction ? (
                      <div className="mt-2 p-2 border border-default-200 rounded">
                        {(() => {
                          const s = String(
                            stakeholderAction || "",
                          ).toLowerCase();

                          if (s.includes("accept"))
                            return (
                              <div className="px-2 py-1 rounded-full bg-success-50 text-success-700 text-xs font-semibold inline-block">
                                Stakeholder: Accepted
                              </div>
                            );
                          if (s.includes("reject"))
                            return (
                              <div className="px-2 py-1 rounded-full bg-danger-50 text-danger-700 text-xs font-semibold inline-block">
                                Stakeholder: Rejected
                              </div>
                            );

                          return (
                            <div className="px-2 py-1 rounded-full bg-default-50 text-default-700 text-xs font-semibold inline-block">
                              Stakeholder: {String(stakeholderAction)}
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}
                  </div>
                );
              } else if (isRejected) {
                // Rejected request
                return (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium">Rejected Event</h4>
                    </div>
                    <div>
                      <p className="text-xs text-default-800">
                        Rejection Reason: {r?.AdminNote || "—"}
                      </p>
                    </div>
                  </div>
                );
              } else if (isCancelled) {
                // Cancelled request
                return (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium">Cancelled Event</h4>
                    </div>
                    <div>
                      <p className="text-xs text-default-800">
                        Cancellation Reason: {r?.AdminNote || "—"}
                      </p>
                    </div>
                  </div>
                );
              } else {
                // Creation request: show full details
                const requesterName =
                  r?.createdByName ||
                  r?.RequesterName ||
                  r?.First_Name ||
                  r?.first_name ||
                  null;
                const requesterEmail =
                  r?.Email || r?.email || r?.requesterEmail || null;
                const requestedDate =
                  r?.RequestedDate || r?.Date || date || null;
                const startTime =
                  r?.StartTime || r?.start_time || r?.Start || null;
                const endTime = r?.EndTime || r?.end_time || r?.End || null;
                const eventType =
                  r?.Event_Type ||
                  r?.eventType ||
                  r?.Category ||
                  r?.category ||
                  r?.event?.Category ||
                  r?.event?.category ||
                  r?.event?.categoryData?.type ||
                  category ||
                  null;

                return (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium">Requester</h4>
                      <p className="text-xs text-default-800">
                        {requesterName || "—"}
                      </p>
                      <p className="text-xs text-default-600">
                        {requesterEmail || "—"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        Requested Date & Time
                      </h4>
                      <p className="text-xs text-default-800">
                        {requestedDate || "—"}
                      </p>
                      {startTime || endTime ? (
                        <p className="text-xs text-default-600">
                          {startTime || "—"} — {endTime || "—"}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Event Type</h4>
                      <p className="text-xs text-default-800">
                        {eventType || "—"}
                      </p>
                    </div>
                    {/* Event-type specific details */}
                    {eventType &&
                    String(eventType).toLowerCase().includes("blood") ? (
                      <div>
                        <h4 className="text-sm font-medium">
                          Blood Drive Details
                        </h4>
                        {(() => {
                          const candidates = [
                            r?.blood_count,
                            r?.Blood_Count,
                            r?.bloodCount,
                            r?.Target_Donation,
                            r?.TargetDonation,
                            r?.target_donation,
                            r?.targetDonation,
                            r?.BloodDrive?.Target_Donation,
                            r?.bloodDrive?.Target_Donation,
                            r?.event?.Target_Donation,
                            r?.event?.TargetDonation,
                            r?.event?.Target_Donation_Count,
                            r?.event?.BloodDrive?.Target_Donation,
                            r?.event?.bloodDrive?.Target_Donation,
                            r?.event?.categoryData?.Target_Donation,
                            r?.event?.categoryData?.TargetDonation,
                            r?.event?.categoryData?.Target_Donation_Count,
                            r?.categoryData?.Target_Donation,
                            r?.categoryData?.TargetDonation,
                            r?.category?.data?.Target_Donation,
                            r?.category?.data?.TargetDonation,
                          ];
                          const found = candidates.find(
                            (v) => v !== undefined && v !== null && v !== "",
                          );
                          const display =
                            found !== undefined && found !== null
                              ? String(found)
                              : "—";

                          return (
                            <p className="text-xs text-default-800">
                              Target donation / Blood count: {display}
                            </p>
                          );
                        })()}
                      </div>
                    ) : null}
                    {eventType &&
                    String(eventType).toLowerCase().includes("training") ? (
                      <div>
                        <h4 className="text-sm font-medium">
                          Training Details
                        </h4>
                        {(() => {
                          const trainingType =
                            r?.training_type ||
                            r?.TrainingType ||
                            r?.event?.categoryData?.TrainingType ||
                            r?.event?.categoryData?.trainingType ||
                            r?.category?.TrainingType ||
                            r?.categoryData?.TrainingType ||
                            null;
                          const maxParticipants =
                            r?.max_participants ||
                            r?.MaxParticipants ||
                            r?.event?.categoryData?.MaxParticipants ||
                            r?.event?.categoryData?.maxParticipants ||
                            r?.category?.MaxParticipants ||
                            r?.categoryData?.MaxParticipants ||
                            null;

                          return (
                            <>
                              <p className="text-xs text-default-800">
                                Training Type: {trainingType ?? "—"}
                              </p>
                              <p className="text-xs text-default-800">
                                Max participants: {maxParticipants ?? "—"}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    ) : null}
                    {eventType &&
                    String(eventType).toLowerCase().includes("advocacy") ? (
                      <div>
                        <h4 className="text-sm font-medium">
                          Advocacy Details
                        </h4>
                        {(() => {
                          const targetAudience =
                            r?.event?.categoryData?.TargetAudience ||
                            r?.TargetAudience ||
                            r?.category?.TargetAudience ||
                            r?.categoryData?.TargetAudience ||
                            r?.target_audience ||
                            r?.targetAudience ||
                            null;
                          const expectedSize =
                            r?.event?.categoryData?.ExpectedAudienceSize ||
                            r?.ExpectedAudienceSize ||
                            r?.category?.ExpectedAudienceSize ||
                            r?.categoryData?.ExpectedAudienceSize ||
                            r?.expected_audience_size ||
                            r?.ExpectedAudienceSize ||
                            null;

                          return (
                            <>
                              <p className="text-xs text-default-800">
                                Target audience: {targetAudience ?? "—"}
                              </p>
                              <p className="text-xs text-default-800">
                                Expected audience size: {expectedSize ?? "—"}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    ) : null}
                    {/* Admin decision summary (if any) with color cues */}
                    {adminAction ? (
                      <div className="mt-2 p-3 border rounded">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const a = String(adminAction || "").toLowerCase();

                            if (a.includes("accept")) {
                              return (
                                <div className="px-2 py-1 rounded-full bg-success-50 text-success-700 text-xs font-semibold">
                                  Accepted
                                </div>
                              );
                            }
                            if (a.includes("resched")) {
                              return (
                                <div className="px-2 py-1 rounded-full bg-warning-50 text-warning-700 text-xs font-semibold">
                                  Rescheduled
                                </div>
                              );
                            }
                            if (a.includes("reject")) {
                              return (
                                <div className="px-2 py-1 rounded-full bg-danger-50 text-danger-700 text-xs font-semibold">
                                  Rejected
                                </div>
                              );
                            }

                            return (
                              <div className="px-2 py-1 rounded-full bg-default-50 text-default-700 text-xs font-semibold">
                                {String(adminAction)}
                              </div>
                            );
                          })()}
                          <p className="text-sm font-medium">
                            Admin action: {String(adminAction)}
                          </p>
                        </div>
                        {adminAction === "Rescheduled" ||
                        adminAction === "rescheduled" ? (
                          <div className="text-xs text-default-800 mt-2">
                            <p>
                              New date/time:{" "}
                              {formatDate(
                                r?.RescheduledDate ||
                                  r?.Rescheduled_Date ||
                                  r?.rescheduledDate,
                              )}
                            </p>
                          </div>
                        ) : null}
                        {r?.AdminNote ? (
                          <p className="text-xs text-default-600 mt-2">
                            Note: {r.AdminNote}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {/* Stakeholder confirmation summary (if any) with color cue */}
                    {stakeholderAction ? (
                      <div className="mt-2 p-2 border border-default-200 rounded">
                        {(() => {
                          const s = String(
                            stakeholderAction || "",
                          ).toLowerCase();

                          if (s.includes("accept"))
                            return (
                              <div className="px-2 py-1 rounded-full bg-success-50 text-success-700 text-xs font-semibold inline-block">
                                Stakeholder: Accepted
                              </div>
                            );
                          if (s.includes("reject"))
                            return (
                              <div className="px-2 py-1 rounded-full bg-danger-50 text-danger-700 text-xs font-semibold inline-block">
                                Stakeholder: Rejected
                              </div>
                            );

                          return (
                            <div className="px-2 py-1 rounded-full bg-default-50 text-default-700 text-xs font-semibold inline-block">
                              Stakeholder: {String(stakeholderAction)}
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}
                  </div>
                );
              }
            })()}
          </ModalBody>
          <ModalFooter>
            {/* Role & stage-specific actions */}
            {(() => {
              const dynamicFooter = renderFooterActionsFromAllowed();
              if (dynamicFooter) {
                return dynamicFooter;
              }

              const r =
                fullRequest ||
                request ||
                (request && (request as any).event) ||
                {};
              const requestStatus = r?.Status || r?.status || null;
              const v = getViewer();

              // Check new workflow statuses first
              if (requestStatus === "Pending_Stakeholder_Review") {
                // Only stakeholders can act on stakeholder review requests
                const stakeholderId =
                  r?.stakeholder_id || r?.Stakeholder_ID || null;
                const viewerIsStakeholder =
                  v.id &&
                  stakeholderId &&
                  String(v.id) === String(stakeholderId);

                if (viewerIsStakeholder) {
                  return (
                    <>
                      <Button
                        variant="bordered"
                        onPress={() => setViewOpen(false)}
                      >
                        Close
                      </Button>
                      <Button
                        className="bg-black text-white"
                        color="default"
                        onPress={async () => {
                          setViewOpen(false);
                          try {
                            const requestId =
                              r?.Request_ID ||
                              r?.RequestId ||
                              r?.requestId ||
                              null;

                            if (requestId) {
                              await performRequestAction(
                                requestId,
                                "stakeholder-action",
                                "Accepted",
                              );
                            }
                          } catch (e) {
                            console.error("Stakeholder accept error:", e);
                            alert(
                              "Failed to accept request: " +
                                ((e as Error).message || "Unknown error"),
                            );
                          }
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="bordered"
                        onPress={async () => {
                          setViewOpen(false);
                          try {
                            const requestId =
                              r?.Request_ID ||
                              r?.RequestId ||
                              r?.requestId ||
                              null;

                            if (requestId) {
                              await performRequestAction(
                                requestId,
                                "stakeholder-action",
                                "Rejected",
                              );
                            }
                          } catch (e) {}
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  );
                }

                return (
                  <Button variant="bordered" onPress={() => setViewOpen(false)}>
                    Close
                  </Button>
                );
              }

              if (requestStatus === "Pending_Coordinator_Review") {
                // Coordinators and sys admins can act on coordinator review requests
                const coordinatorId =
                  r?.coordinator_id || r?.Coordinator_ID || null;
                const viewerIsCoordinator =
                  v.id &&
                  coordinatorId &&
                  String(v.id) === String(coordinatorId);

                if (viewerIsCoordinator || v.isAdmin) {
                  const isEditRequest =
                    r.originalData && Object.keys(r.originalData).length > 0;

                  return (
                    <>
                      <Button
                        variant="bordered"
                        onPress={() => setViewOpen(false)}
                      >
                        Close
                      </Button>
                      <Button
                        className="bg-black text-white"
                        color="default"
                        onPress={async () => {
                          setViewOpen(false);
                          try {
                            const requestId =
                              r?.Request_ID ||
                              r?.RequestId ||
                              r?.requestId ||
                              null;

                            if (requestId) {
                              if (v.isAdmin) {
                                await performRequestAction(
                                  requestId,
                                  "admin-action",
                                  "Accepted",
                                );
                              } else {
                                await performRequestAction(
                                  requestId,
                                  "coordinator-action",
                                  "Accepted",
                                );
                              }
                            }
                          } catch (e) {}
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="bordered"
                        onPress={async () => {
                          setViewOpen(false);
                          try {
                            const requestId =
                              r?.Request_ID ||
                              r?.RequestId ||
                              r?.requestId ||
                              null;

                            if (requestId) {
                              if (v.isAdmin) {
                                await performRequestAction(
                                  requestId,
                                  "admin-action",
                                  "Rejected",
                                );
                              } else {
                                await performRequestAction(
                                  requestId,
                                  "coordinator-action",
                                  "Rejected",
                                );
                              }
                            }
                          } catch (e) {}
                        }}
                      >
                        Reject
                      </Button>
                      {!isEditRequest && (
                        <Button
                          color="default"
                          onPress={() => {
                            setViewOpen(false);
                            setRescheduleOpen(true);
                          }}
                        >
                          Reschedule
                        </Button>
                      )}
                    </>
                  );
                }

                return (
                  <Button variant="bordered" onPress={() => setViewOpen(false)}>
                    Close
                  </Button>
                );
              }

              if (requestStatus === "Pending_Admin_Review") {
                // Admins and coordinators can act on admin review requests
                if (v.isAdmin || v.role === "Coordinator") {
                  const isEditRequest =
                    r.originalData && Object.keys(r.originalData).length > 0;

                  return (
                    <>
                      <Button
                        variant="bordered"
                        onPress={() => setViewOpen(false)}
                      >
                        Close
                      </Button>
                      <Button
                        className="bg-black text-white"
                        color="default"
                        onPress={() => {
                          setViewOpen(false);
                          setAcceptOpen(true);
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="bordered"
                        onPress={() => {
                          setViewOpen(false);
                          setRejectOpen(true);
                        }}
                      >
                        Reject
                      </Button>
                      {!isEditRequest && (
                        <Button
                          color="default"
                          onPress={() => {
                            setViewOpen(false);
                            setRescheduleOpen(true);
                          }}
                        >
                          Reschedule
                        </Button>
                      )}
                    </>
                  );
                }

                return (
                  <Button variant="bordered" onPress={() => setViewOpen(false)}>
                    Close
                  </Button>
                );
              }

              // Fallback to old logic for backward compatibility
              const adminAction =
                (r as any).AdminAction ?? (r as any).adminAction ?? null;
              const stakeholderAction =
                (r as any).StakeholderFinalAction ??
                (r as any).stakeholderFinalAction ??
                null;
              const madeByStakeholder =
                r?.stakeholder?.Stakeholder_ID ||
                r?.MadeByStakeholderID ||
                r?.Stakeholder_ID ||
                r?.stakeholder_id ||
                r?.StakeholderId ||
                null;
              const viewerIsStakeholder =
                v.id &&
                madeByStakeholder &&
                String(v.id) === String(madeByStakeholder);

              // Admin/coordinator view when stakeholder rescheduled
              if (
                stakeholderAction &&
                String(stakeholderAction).toLowerCase().includes("resched") &&
                (v.isAdmin || v.role === "Coordinator")
              ) {
                return (
                  <>
                    <Button
                      variant="bordered"
                      onPress={() => setViewOpen(false)}
                    >
                      Close
                    </Button>
                    <Button
                      className="bg-black text-white"
                      color="default"
                      onPress={async () => {
                        setViewOpen(false);
                        try {
                          const requestId =
                            r?.Request_ID ||
                            r?.RequestId ||
                            r?.requestId ||
                            null;

                          if (requestId) {
                            if (v.isAdmin) {
                              await performRequestAction(
                                requestId,
                                "admin-action",
                                "Accepted",
                              );
                            } else {
                              await performRequestAction(
                                requestId,
                                "coordinator-action",
                                "Accepted",
                              );
                            }
                          }
                        } catch (e) {
                          console.error(
                            "Accept stakeholder reschedule error:",
                            e,
                          );
                          alert(
                            "Failed to accept reschedule: " +
                              ((e as Error).message || "Unknown error"),
                          );
                        }
                      }}
                    >
                      Accept Reschedule
                    </Button>
                    <Button
                      variant="bordered"
                      onPress={async () => {
                        setViewOpen(false);
                        try {
                          const requestId =
                            r?.Request_ID ||
                            r?.RequestId ||
                            r?.requestId ||
                            null;

                          if (requestId) {
                            if (v.isAdmin) {
                              await performRequestAction(
                                requestId,
                                "admin-action",
                                "Rejected",
                              );
                            } else {
                              await performRequestAction(
                                requestId,
                                "coordinator-action",
                                "Rejected",
                              );
                            }
                          }
                        } catch (e) {}
                      }}
                    >
                      Reject Reschedule
                    </Button>
                  </>
                );
              }

              // Admin view before decision
              if (!adminAction && v.isAdmin) {
                const isEditRequest =
                  r.originalData && Object.keys(r.originalData).length > 0;

                return (
                  <>
                    <Button
                      variant="bordered"
                      onPress={() => setViewOpen(false)}
                    >
                      Close
                    </Button>
                    <Button
                      className="bg-black text-white"
                      color="default"
                      onPress={() => {
                        setViewOpen(false);
                        setAcceptOpen(true);
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="bordered"
                      onPress={() => {
                        setViewOpen(false);
                        setRejectOpen(true);
                      }}
                    >
                      Reject
                    </Button>
                    {!isEditRequest && (
                      <Button
                        color="default"
                        onPress={() => {
                          setViewOpen(false);
                          setRescheduleOpen(true);
                        }}
                      >
                        Reschedule
                      </Button>
                    )}
                  </>
                );
              }

              // Stakeholder view after admin decision
              if (adminAction && viewerIsStakeholder && !stakeholderAction) {
                if (String(adminAction).toLowerCase().includes("accepted")) {
                  return (
                    <>
                      <Button
                        variant="bordered"
                        onPress={() => setViewOpen(false)}
                      >
                        Close
                      </Button>
                      <Button
                        className="bg-black text-white"
                        color="default"
                        onPress={async () => {
                          setViewOpen(false);
                          try {
                            const requestId =
                              r?.Request_ID ||
                              r?.RequestId ||
                              r?.requestId ||
                              null;

                            if (requestId)
                              await performStakeholderConfirm(
                                requestId,
                                "Accepted",
                              );
                          } catch (e) {}
                        }}
                      >
                        Accept
                      </Button>
                    </>
                  );
                }
                if (String(adminAction).toLowerCase().includes("rejected")) {
                  return (
                    <>
                      <Button
                        variant="bordered"
                        onPress={() => setViewOpen(false)}
                      >
                        Close
                      </Button>
                      <Button
                        className="bg-black text-white"
                        color="default"
                        onPress={async () => {
                          setViewOpen(false);
                          try {
                            const requestId =
                              r?.Request_ID ||
                              r?.RequestId ||
                              r?.requestId ||
                              null;

                            if (requestId)
                              await performStakeholderConfirm(
                                requestId,
                                "Accepted",
                              );
                          } catch (e) {}
                        }}
                      >
                        Accept
                      </Button>
                    </>
                  );
                }
                if (
                  String(adminAction).toLowerCase().includes("resched") ||
                  String(adminAction).toLowerCase().includes("rescheduled")
                ) {
                  return (
                    <>
                      <Button
                        variant="bordered"
                        onPress={() => setViewOpen(false)}
                      >
                        Close
                      </Button>
                      <Button
                        className="bg-black text-white"
                        color="default"
                        onPress={async () => {
                          setViewOpen(false);
                          try {
                            const requestId =
                              r?.Request_ID ||
                              r?.RequestId ||
                              r?.requestId ||
                              null;

                            if (requestId)
                              await performStakeholderConfirm(
                                requestId,
                                "Accepted",
                              );
                          } catch (e) {}
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="bordered"
                        onPress={async () => {
                          setViewOpen(false);
                          try {
                            const requestId =
                              r?.Request_ID ||
                              r?.RequestId ||
                              r?.requestId ||
                              null;

                            if (requestId)
                              await performStakeholderConfirm(
                                requestId,
                                "Rejected",
                              );
                          } catch (e) {}
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  );
                }
              }

              // Fallback for rescheduled requests by admin: coordinators can accept/reject
              if (adminAction && String(adminAction).toLowerCase().includes("resched") && v.role === "Coordinator") {
                return (
                  <>
                    <Button variant="bordered" onPress={() => setViewOpen(false)}>
                      Close
                    </Button>
                    <Button
                      className="bg-black text-white"
                      color="default"
                      onPress={async () => {
                        setViewOpen(false);
                        try {
                          const requestId = r?.Request_ID || r?.RequestId || r?.requestId || null;
                          if (requestId) {
                            await performRequestAction(
                              requestId,
                              "coordinator-action",
                              "Accepted",
                            );
                          }
                        } catch (e) {
                          console.error("Accept reschedule error:", e);
                          alert(
                            "Failed to accept reschedule: " +
                              ((e as Error).message || "Unknown error"),
                          );
                        }
                      }}
                    >
                      Accept Reschedule
                    </Button>
                    <Button
                      variant="bordered"
                      onPress={async () => {
                        setViewOpen(false);
                        try {
                          const requestId = r?.Request_ID || r?.RequestId || r?.requestId || null;
                          if (requestId) {
                            await performRequestAction(
                              requestId,
                              "coordinator-action",
                              "Rejected",
                            );
                          }
                        } catch (e) {}
                      }}
                    >
                      Reject Reschedule
                    </Button>
                  </>
                );
              }

              // Default fallback action: close
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
