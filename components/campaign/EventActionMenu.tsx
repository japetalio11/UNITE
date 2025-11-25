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
  // Optional: direct confirm handler and fallback visibility flag
  onConfirm?: () => Promise<void>;
  showConfirmFallback?: boolean;
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
  onConfirm,
  showConfirmFallback,
}) => {
  // Build menus similar to original file; prefer action-driven menu when present
  const buildActionMenu = () => {
    if (!allowedActionSet || allowedActionSet.size === 0) return null;

    let actions: JSX.Element[] = [];
    let danger: JSX.Element[] = [];
    const seenKeys = new Set<string>();

    if (flagFor("canView", "view") && typeof onViewEvent === "function") {
      const k = "view-event";
      if (!seenKeys.has(k)) {
        actions.push(
          <DropdownItem key={k} description="View event details" startContent={<Eye />} onPress={onViewEvent}>
            View Event
          </DropdownItem>,
        );
        seenKeys.add(k);
      }
    }

    {
      const k = "view-request";
      if (!seenKeys.has(k)) {
        actions.push(
          <DropdownItem key={k} description="View request details" startContent={<FileText />} onPress={async () => { if (openViewRequest) await openViewRequest(); }}>
            View Request
          </DropdownItem>,
        );
        seenKeys.add(k);
      }
    }

    if (flagFor("canManageStaff", "manage-staff")) {
      const k = "manage-staff";
      if (!seenKeys.has(k)) {
        actions.push(
          <DropdownItem key={k} description="Manage staff for this event" startContent={<Users />} onPress={() => { if (setManageStaffOpen) setManageStaffOpen(true); }}>
            Manage Staff
          </DropdownItem>,
        );
        seenKeys.add(k);
      }
    }

    if (flagFor("canAccept", ["accept", "approve"])) {
      const k = "accept";
      if (!seenKeys.has(k)) {
        actions.push(
          <DropdownItem key={k} description="Accept this request" startContent={<Check />} onPress={() => setAcceptOpen && setAcceptOpen(true)}>
            Accept Request
          </DropdownItem>,
        );
        seenKeys.add(k);
      }
    }

    if (flagFor("canReject", "reject")) {
      const k = "reject";
      if (!seenKeys.has(k)) {
        actions.push(
          <DropdownItem key={k} description="Reject this request" startContent={<X />} onPress={() => setRejectOpen && setRejectOpen(true)}>
            Reject Request
          </DropdownItem>,
        );
        seenKeys.add(k);
      }
    }

    if (flagFor("canReschedule", ["resched", "reschedule"])) {
      const k = "reschedule";
      if (!seenKeys.has(k)) {
        actions.push(
          <DropdownItem key={k} description="Propose a new schedule" startContent={<Clock />} onPress={() => setRescheduleOpen && setRescheduleOpen(true)}>
            Reschedule
          </DropdownItem>,
        );
        seenKeys.add(k);
      }
    }

    // Confirm action: show when explicitly allowed or when fallback requested
    if (flagFor("canConfirm", "confirm") || (showConfirmFallback)) {
      const k = "confirm";
      if (!seenKeys.has(k)) {
        actions.push(
          <DropdownItem
            key={k}
            description="Confirm the reviewer decision"
            startContent={<Check />}
            onPress={async () => {
              try {
                if (onConfirm) await onConfirm();
              } catch (e) {
                console.error('Confirm action error:', e);
                try { alert('Failed to confirm request: ' + (e as any)?.message || 'Unknown error'); } catch (_) {}
              }
            }}
          >
            Confirm
          </DropdownItem>,
        );
        seenKeys.add(k);
      }
    }

    // Do not show Cancel for already rejected requests — canceling a rejected
    // request is confusing and previously caused duplicate Cancel entries.
    const statusString = String((request && (request.Status || request.status)) || '').toLowerCase();
    const isRejectedStatus = statusString.includes('reject');

    if (flagFor("canAdminAction", "cancel") && !isRejectedStatus) {
      const k = "cancel";
      if (!seenKeys.has(k)) {
        danger.push(
          <DropdownItem key={k} className="text-danger" color="danger" description="Cancel this request" startContent={<Trash2 className="text-xl text-danger pointer-events-none shrink-0" />} onPress={() => setCancelOpen && setCancelOpen(true)}>
            Cancel Request
          </DropdownItem>,
        );
        seenKeys.add(k);
      }
    }

    if (flagFor("canDelete", "delete")) {
      const k = "delete";
      if (!seenKeys.has(k)) {
        danger.push(
          <DropdownItem key={k} className="text-danger" color="danger" description="Delete this request" startContent={<Trash2 className="text-xl text-danger pointer-events-none shrink-0" />} onPress={() => setDeleteOpen && setDeleteOpen(true)}>
            Delete Request
          </DropdownItem>,
        );
        seenKeys.add(k);
      }
    }

    if (actions.length === 0 && danger.length === 0) return null;

    // Defensive dedupe by label/text to avoid duplicated entries coming from
    // mixed data sources (allowedActions + boolean flags + fallbacks).
    const dedupeByLabel = (items: JSX.Element[]) => {
      const seen = new Set<string>();
      const out: JSX.Element[] = [];
      for (const it of items) {
        try {
          const props = (it as any)?.props || {};
          // Prefer description prop (explicit) as it is a stable string.
          let raw = props.description ?? props['data-description'] ?? props.children ?? '';

          // If children is an array or JSX, try to extract the last string child.
          if (Array.isArray(raw)) {
            const last = raw.slice().reverse().find((c) => typeof c === 'string' && c.trim().length > 0);
            raw = last ?? raw.join(' ');
          }

          // If children is a React element, attempt to access its props.children
          if (typeof raw === 'object' && raw !== null && raw.props) {
            raw = raw.props.children ?? '';
          }

          const label = String(raw || '').trim().toLowerCase();
          if (!label) {
            out.push(it);
            continue;
          }
          if (!seen.has(label)) {
            seen.add(label);
            out.push(it);
          }
        } catch (e) {
          out.push(it);
        }
      }
      return out;
    };

    // Combine both lists and dedupe across them so an action doesn't appear
    // both in Actions and Danger zone (this preserves the first occurrence).
    const combined = [...actions, ...danger];
    const uniqueCombined = dedupeByLabel(combined);

    // Re-split while preserving order and ensuring no duplicates across sections
    actions = uniqueCombined.filter((it) => actions.includes(it));
    danger = uniqueCombined.filter((it) => danger.includes(it));

    // Debug: log computed menu labels to help diagnose lingering duplicates
    try {
      const labels = uniqueCombined.map((it) => {
        const p = (it as any)?.props || {};
        const raw = p.description ?? p.children ?? '';
        return String(raw).toLowerCase().slice(0, 200);
      });
      // eslint-disable-next-line no-console
      console.debug('[EventActionMenu] menu labels:', labels);
    } catch (e) {}

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
