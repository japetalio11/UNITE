"use client";
import React from "react";
import { DropdownSection, DropdownItem, DropdownMenu } from "@heroui/dropdown";
import { Eye, Edit, Clock, Trash2, Check, X, Users, FileText } from "lucide-react";

interface Props {
  allowedActionSet: Set<string>;
  hasAllowedAction: (name?: string | string[] | null) => boolean;
  flagFor: (flagName: string, actionName?: string | string[]) => boolean;
  status: string;
  request?: any;
  onViewEvent?: () => void;
  onEditEvent?: () => void;
  openViewRequest?: () => Promise<void>;
  setManageStaffOpen?: (v: boolean) => void;
  setRescheduleOpen?: (v: boolean) => void;
  setAcceptOpen?: (v: boolean) => void;
  setRejectOpen?: (v: boolean) => void;
  setCancelOpen?: (v: boolean) => void;
  setDeleteOpen?: (v: boolean) => void;
}

const EventActionMenu: React.FC<Props> = ({
  allowedActionSet,
  hasAllowedAction,
  flagFor,
  status,
  request,
  onViewEvent,
  onEditEvent,
  openViewRequest,
  setManageStaffOpen,
  setRescheduleOpen,
  setAcceptOpen,
  setRejectOpen,
  setCancelOpen,
  setDeleteOpen,
}) => {
  // Build menus similar to original file; prefer action-driven menu when present
  const buildActionMenu = () => {
    if (!allowedActionSet || allowedActionSet.size === 0) return null;

    const actions: JSX.Element[] = [];
    const danger: JSX.Element[] = [];

    if (flagFor("canView", "view") && typeof onViewEvent === "function") {
      actions.push(
        <DropdownItem key="view-event" description="View event details" startContent={<Eye />} onPress={onViewEvent}>
          View Event
        </DropdownItem>,
      );
    }

    actions.push(
      <DropdownItem key="view-request" description="View request details" startContent={<FileText />} onPress={async () => { if (openViewRequest) await openViewRequest(); }}>
        View Request
      </DropdownItem>,
    );

    if (flagFor("canManageStaff", "manage-staff")) {
      actions.push(
        <DropdownItem key="manage-staff" description="Manage staff for this event" startContent={<Users />} onPress={() => { if (setManageStaffOpen) setManageStaffOpen(true); }}>
          Manage Staff
        </DropdownItem>,
      );
    }

    if (flagFor("canAccept", ["accept", "approve"])) {
      actions.push(
        <DropdownItem key="accept" description="Accept this request" startContent={<Check />} onPress={() => setAcceptOpen && setAcceptOpen(true)}>
          Accept Request
        </DropdownItem>,
      );
    }

    if (flagFor("canReject", "reject")) {
      actions.push(
        <DropdownItem key="reject" description="Reject this request" startContent={<X />} onPress={() => setRejectOpen && setRejectOpen(true)}>
          Reject Request
        </DropdownItem>,
      );
    }

    if (flagFor("canReschedule", ["resched", "reschedule"])) {
      actions.push(
        <DropdownItem key="reschedule" description="Propose a new schedule" startContent={<Clock />} onPress={() => setRescheduleOpen && setRescheduleOpen(true)}>
          Reschedule
        </DropdownItem>,
      );
    }

    if (flagFor("canAdminAction", "cancel")) {
      danger.push(
        <DropdownItem key="cancel" className="text-danger" color="danger" description="Cancel this request" startContent={<Trash2 className="text-xl text-danger pointer-events-none shrink-0" />} onPress={() => setCancelOpen && setCancelOpen(true)}>
          Cancel Request
        </DropdownItem>,
      );
    }

    if (flagFor("canDelete", "delete")) {
      danger.push(
        <DropdownItem key="delete" className="text-danger" color="danger" description="Delete this request" startContent={<Trash2 className="text-xl text-danger pointer-events-none shrink-0" />} onPress={() => setDeleteOpen && setDeleteOpen(true)}>
          Delete Request
        </DropdownItem>,
      );
    }

    if (actions.length === 0 && danger.length === 0) return null;

    return (
      <DropdownMenu aria-label="Event actions menu" variant="faded">
        {actions.length > 0 ? <DropdownSection title="Actions">{actions}</DropdownSection> : null}
        {danger.length > 0 ? <DropdownSection title="Danger zone">{danger}</DropdownSection> : null}
      </DropdownMenu>
    );
  };

  // For status-specific fallbacks where action-driven menu is not present, render small defaults
  const actionMenu = buildActionMenu();

  if (actionMenu) return actionMenu;

  // Fallback default
  return (
    <DropdownMenu aria-label="Event actions menu" variant="faded">
      <DropdownSection title="Actions">
        <DropdownItem key="view-event" description="View event details" startContent={<Eye />} onPress={onViewEvent}>
          View Event
        </DropdownItem>
        <DropdownItem key="view-request" description="View request details" startContent={<FileText />} onPress={async () => { if (openViewRequest) await openViewRequest(); }}>
          View Request
        </DropdownItem>
      </DropdownSection>
    </DropdownMenu>
  );
};

export default EventActionMenu;
