import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { API_BASE } from "../event-card.constants";

const getToken = () =>
  typeof window !== "undefined"
    ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
    : null;

export const performRequestAction = async (
  requestId: string,
  actorType: "admin-action" | "coordinator-action" | "stakeholder-action",
  action: "Accepted" | "Rejected" | "Rescheduled" | "Cancelled",
  note?: string,
  rescheduledDate?: string | null,
) => {
  const token = getToken();
  const headers: any = { "Content-Type": "application/json" };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const body: any = { action, note: note || "" };
  if (rescheduledDate) body.rescheduledDate = rescheduledDate;

  let res;

  if (token) {
    res = await fetchWithAuth(
      `${API_BASE}/api/requests/${encodeURIComponent(requestId)}/${actorType}`,
      { method: "POST", body: JSON.stringify(body) },
    );
  } else {
    const legacyBody = { action, note: note || "", ...(rescheduledDate && { rescheduledDate }) };
    res = await fetch(
      `${API_BASE}/api/requests/${encodeURIComponent(requestId)}/${actorType}`,
      { method: "POST", headers, body: JSON.stringify(legacyBody), credentials: "include" },
    );
  }

  const resp = await res.json();
  if (!res.ok) throw new Error(resp.message || `Failed to perform ${actorType}`);

  try {
    window.dispatchEvent(new CustomEvent("unite:requests-changed", { detail: { requestId } }));
  } catch (e) {}

  return resp;
};

export const performStakeholderConfirm = async (requestId: string, action: "Accepted" | "Rejected") => {
  const rawUser = typeof window !== "undefined" ? localStorage.getItem("unite_user") : null;
  const parsedUser = rawUser ? JSON.parse(rawUser as string) : null;
  const stakeholderId = parsedUser?.id || parsedUser?.Stakeholder_ID || parsedUser?.StakeholderId || parsedUser?.ID || null;

  if (!stakeholderId) throw new Error("Unable to determine stakeholder id");

  const token = getToken();
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const body: any = { stakeholderId, action };

  let res;
  if (token) {
    res = await fetchWithAuth(
      `${API_BASE}/api/requests/${encodeURIComponent(requestId)}/stakeholder-confirm`,
      { method: "POST", body: JSON.stringify(body) },
    );
  } else {
    res = await fetch(
      `${API_BASE}/api/requests/${encodeURIComponent(requestId)}/stakeholder-confirm`,
      { method: "POST", headers, body: JSON.stringify(body), credentials: "include" },
    );
  }

  const resp = await res.json();
  if (!res.ok) throw new Error(resp.message || "Failed to record stakeholder confirmation");

  try {
    window.dispatchEvent(new CustomEvent("unite:requests-changed", { detail: { requestId } }));
  } catch (e) {}

  return resp;
};

export const performCoordinatorConfirm = async (requestId: string, action: "Accepted" | "Rejected") => {
  const rawUser = typeof window !== "undefined" ? localStorage.getItem("unite_user") : null;
  const parsedUser = rawUser ? JSON.parse(rawUser as string) : null;
  const coordinatorId = parsedUser?.id || parsedUser?.Coordinator_ID || parsedUser?.CoordinatorId || parsedUser?.ID || null;

  if (!coordinatorId) throw new Error("Unable to determine coordinator id");

  const token = getToken();
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const body: any = { coordinatorId, action };

  let res;
  if (token) {
    res = await fetchWithAuth(
      `${API_BASE}/api/requests/${encodeURIComponent(requestId)}/coordinator-confirm`,
      { method: "POST", body: JSON.stringify(body) },
    );
  } else {
    res = await fetch(
      `${API_BASE}/api/requests/${encodeURIComponent(requestId)}/coordinator-confirm`,
      { method: "POST", headers, body: JSON.stringify(body), credentials: "include" },
    );
  }

  const resp = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(resp.message || "Failed to record coordinator confirmation");

  try {
    window.dispatchEvent(new CustomEvent("unite:requests-changed", { detail: { requestId } }));
  } catch (e) {}

  return resp;
};

export const fetchRequestDetails = async (requestId: string) => {
  const token = getToken();
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${API_BASE}/api/requests/${encodeURIComponent(requestId)}`;

  let res;
  if (token) {
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
  return data;
};

export const deleteRequest = async (requestId: string) => {
  const token = getToken();
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  if (token) {
    res = await fetchWithAuth(`${API_BASE}/api/requests/${encodeURIComponent(requestId)}/delete`, { method: "DELETE" });
  } else {
    res = await fetch(`${API_BASE}/api/requests/${encodeURIComponent(requestId)}/delete`, { method: "DELETE", headers, credentials: "include" });
  }

  const resp = await res.json();
  if (!res.ok) throw new Error(resp.message || "Failed to delete request");

  try {
    window.dispatchEvent(new CustomEvent("unite:requests-changed", { detail: { requestId } }));
  } catch (e) {}

  return resp;
};

export default {};
