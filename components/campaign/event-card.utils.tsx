import { useMemo } from "react";
import { ACTION_SYNONYMS, BOOLEAN_FLAG_TO_ACTION } from "./event-card.constants";

export const normalizeActionName = (name?: string | null) =>
  typeof name === "string" ? name.trim().toLowerCase() : "";

export const getViewer = () => {
  try {
    if (typeof window === "undefined")
      return { id: null, role: null, isAdmin: false };
    const raw =
      localStorage.getItem("unite_user") || sessionStorage.getItem("unite_user");

    if (!raw) return { id: null, role: null, isAdmin: false };
    const parsed = JSON.parse(raw);
    const id =
      parsed?.id ||
      parsed?.ID ||
      parsed?._id ||
      parsed?.Stakeholder_ID ||
      parsed?.StakeholderId ||
      parsed?.stakeholder_id ||
      parsed?.user_id ||
      null;
    const role = parsed?.role || parsed?.staff_type || null;
    const roleString = String(role || "").toLowerCase();
    const isAdmin =
      !!parsed?.isAdmin ||
      roleString.includes("admin") ||
      roleString.includes("sysad") ||
      roleString.includes("systemadmin");

    return { id, role, isAdmin };
  } catch (e) {
    return { id: null, role: null, isAdmin: false };
  }
};

export const getViewerId = (): string | null => {
  const v = getViewer();
  return v.id ? String(v.id) : null;
};

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) return dateStr; // Return original if invalid

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return dateStr || "—";
  }
};

export const useAllowedActionSet = (payload: {
  request?: any;
  fullRequest?: any;
  resolvedRequest?: any;
}) => {
  const { request, fullRequest, resolvedRequest } = payload || {};

  return useMemo(() => {
    const set = new Set<string>();
    const pushActions = (src?: any) => {
      if (!src) return;
      const candidates = [
        src.allowedActions,
        src.allowed_actions,
        src.allowed_actions_list,
      ];

      candidates.forEach((candidate) => {
        if (Array.isArray(candidate)) {
          candidate.forEach((action) => {
            const normalized = normalizeActionName(action);
            if (normalized) set.add(normalized);
          });
        }
      });

      Object.entries(BOOLEAN_FLAG_TO_ACTION).forEach(
        ([flag, actionName]: [string, string]) => {
          if (src[flag]) {
            set.add(actionName);
          }
        },
      );

      if (src.event && src.event !== src) {
        pushActions(src.event);
      }
    };

    pushActions(request);
    pushActions(fullRequest);
    pushActions(resolvedRequest);

    return set;
  }, [request, fullRequest, resolvedRequest]);
};

export const hasAllowedActionFactory = (allowedActionSet: Set<string>) => (
  actionName?: string | string[] | null,
) => {
  if (!actionName) return false;
  const names = Array.isArray(actionName) ? actionName : [actionName];

  return names.some((name) => {
    const normalized = normalizeActionName(name);
    if (!normalized) return false;
    if (allowedActionSet.has(normalized)) return true;
    const synonyms = ACTION_SYNONYMS[normalized];
    return synonyms
      ? synonyms.some((alias) => allowedActionSet.has(alias))
      : false;
  });
};

export default {};
