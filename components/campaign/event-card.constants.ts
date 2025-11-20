export const BOOLEAN_FLAG_TO_ACTION: Record<string, string> = {
  canView: "view",
  canEdit: "edit",
  canManageStaff: "manage-staff",
  canReschedule: "resched",
  canAdminAction: "cancel",
  canDelete: "delete",
  canAccept: "accept",
  canReject: "reject",
  canConfirm: "confirm",
  canDecline: "decline",
  canRevise: "revise",
};

export const ACTION_SYNONYMS: Record<string, string[]> = {
  resched: ["resched", "reschedule", "rescheduled"],
  accept: ["accept", "approve", "approved"],
  reject: ["reject", "decline", "denied"],
  cancel: ["cancel", "cancelled", "canceled"],
  confirm: ["confirm", "confirmed", "creator-confirm", "creator-confirmed"],
  decline: ["decline", "creator-decline", "creator-declined", "reject"],
  "manage-staff": ["manage-staff", "staff"],
};

export const FALLBACK_ACTION_MAP: Record<string, string[]> = {
  canView: ["view"],
  canEdit: ["edit"],
  canManageStaff: ["manage-staff"],
  canReschedule: ["resched"],
  canAdminAction: ["cancel"],
  canDelete: ["delete"],
  canAccept: ["accept"],
  canReject: ["reject"],
  canConfirm: ["confirm"],
  canDecline: ["decline"],
  canRevise: ["revise"],
};

export const API_BASE =
  typeof process !== "undefined" &&
  process.env &&
  process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "http://localhost:3000";
