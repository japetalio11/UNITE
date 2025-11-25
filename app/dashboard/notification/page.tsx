"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Kbd } from "@heroui/kbd";
import {
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Droplet,
  Megaphone,
  BellRing,
  Filter,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { SearchIcon } from "@/components/icons";
import EventViewModal from "@/components/campaign/event-view-modal";
import { getUserInfo } from "@/utils/getUserInfo";
import { fetchJsonWithAuth } from "@/utils/fetchWithAuth";

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pagination, setPagination] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<any>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const user = useMemo(() => getUserInfo(), []);

  const getRecipientId = () => {
    const parsed = user.raw || null;

    if (!parsed) return null;

    // Prefer stakeholder id if present, otherwise coordinator id, then fall back
    return (
      parsed?.Stakeholder_ID ||
      parsed?.StakeholderId ||
      parsed?.stakeholder_id ||
      parsed?.stakeholderId ||
      parsed?.Coordinator_ID ||
      parsed?.CoordinatorId ||
      parsed?.coordinator_id ||
      parsed?.coordinatorId ||
      parsed?.id ||
      parsed?.ID ||
      parsed?.user_id ||
      parsed?.UserID ||
      parsed?.User_Id ||
      null
    );
  };

  const getRecipientType = () => {
    if (user.isAdmin) return "Admin";
    const role = (user.role || "").toLowerCase();

    // explicit role strings
    if (role.includes("coordinator")) return "Coordinator";
    if (role.includes("stakeholder")) return "Stakeholder";
    // fallback to raw fields
    const rawStaff =
      user.raw?.StaffType ||
      user.raw?.Staff_Type ||
      user.raw?.staff_type ||
      user.raw?.staffType ||
      null;

    if (rawStaff && String(rawStaff).toLowerCase() === "coordinator")
      return "Coordinator";
    if (rawStaff && String(rawStaff).toLowerCase() === "stakeholder")
      return "Stakeholder";
    // if the stored user object contains a Stakeholder id prefer Stakeholder
    const parsed = user.raw || null;

    if (parsed) {
      if (
        parsed.Stakeholder_ID ||
        parsed.StakeholderId ||
        parsed.stakeholder_id ||
        parsed.stakeholderId
      )
        return "Stakeholder";
      if (
        parsed.Coordinator_ID ||
        parsed.CoordinatorId ||
        parsed.coordinator_id ||
        parsed.coordinatorId
      )
        return "Coordinator";
    }
    // Try a best-effort detection: scan the raw stored object for 'stakeholder' keyword
    try {
      const s = parsed
        ? JSON.stringify(parsed).toLowerCase()
        : typeof window !== "undefined"
          ? (localStorage.getItem("unite_user") || "").toLowerCase()
          : "";

      if (s && s.includes("stakeholder")) return "Stakeholder";
      if (s && s.includes("coordinator")) return "Coordinator";
    } catch (e) {
      // ignore
    }
    // Try a best-effort detection: scan the raw stored object for 'stakeholder' keyword
    try {
      const s = parsed
        ? JSON.stringify(parsed).toLowerCase()
        : typeof window !== "undefined"
          ? (localStorage.getItem("unite_user") || "").toLowerCase()
          : "";

      if (s && s.includes("stakeholder")) return "Stakeholder";
      if (s && s.includes("coordinator")) return "Coordinator";
    } catch (e) {
      // ignore
    }

    // unknown: return null so caller can detect missing info
    return null;
  };

  // Developer debug: show a small overlay when URL has ?debugUser=1 so we can inspect
  // the parsed stored user and the derived recipient id/type at runtime.
  const showUserDebug =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("debugUser") === "1"
      : false;

  useEffect(() => {
    if (!showUserDebug) return;
    try {
      const parsed = user.raw || null;
      const recipientId = (function () {
        if (!parsed) return null;

        return (
          parsed?.Stakeholder_ID ||
          parsed?.StakeholderId ||
          parsed?.stakeholder_id ||
          parsed?.stakeholderId ||
          parsed?.Coordinator_ID ||
          parsed?.CoordinatorId ||
          parsed?.coordinator_id ||
          parsed?.coordinatorId ||
          parsed?.id ||
          parsed?.ID ||
          parsed?.user_id ||
          parsed?.UserID ||
          parsed?.User_Id ||
          null
        );
      })();
      const recipientType = getRecipientType();

      // Debug user info (only when ?debugUser=1 is in URL)

      if (showUserDebug) {
        // eslint-disable-next-line no-console
        console.groupCollapsed("NotificationPage: debugUser");
        // eslint-disable-next-line no-console
        console.log("raw stored user:", parsed);
        // eslint-disable-next-line no-console
        console.log("detected recipientId:", recipientId);
        // eslint-disable-next-line no-console
        console.log("detected recipientType:", recipientType);
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
    } catch (e) {
      console.error("Failed to compute debug user info", e);
    }
  }, [showUserDebug, user]);

  const recipientId = getRecipientId();
  const recipientType = getRecipientType();

  useEffect(() => {
    const load = async () => {
      if (!recipientId || !recipientType) {
        setError("No recipient info available. Please sign in.");

        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          recipientId: String(recipientId),
          recipientType,
          page: String(pageNumber),
          limit: String(pageSize),
        });

        if (filterType) params.set("type", filterType);
        if (query) params.set("request_id", query);

        const url = API_URL
          ? `${API_URL}/api/notifications?${params.toString()}`
          : `/api/notifications?${params.toString()}`;
        const body: any = await fetchJsonWithAuth(url);
        const items = body.data || body.notifications || [];

        setNotifications(items);
        setPagination(body.pagination || null);
      } catch (err: any) {
        setError(err.message || "Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [
    API_URL,
    recipientId,
    recipientType,
    query,
    filterType,
    pageNumber,
    pageSize,
  ]);

  const markAllRead = async () => {
    if (!recipientId || !recipientType) return;
    try {
      setLoading(true);
      const url = API_URL
        ? `${API_URL}/api/notifications/mark-all-read`
        : `/api/notifications/mark-all-read`;

      await fetchJsonWithAuth(url, {
        method: "PUT",
        body: JSON.stringify({
          recipientId: String(recipientId),
          recipientType,
        }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, IsRead: true })));
      if (pagination) setPagination({ ...pagination, unread: 0 });
    } catch (err: any) {
      setError(err.message || "Failed to mark all read");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!recipientId) return;
    try {
      await fetchJsonWithAuth(
        `${API_URL || ""}/api/notifications/${encodeURIComponent(notificationId)}/read`,
        {
          method: "PUT",
          body: JSON.stringify({ recipientId: String(recipientId) }),
        },
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.Notification_ID === notificationId ? { ...n, IsRead: true } : n,
        ),
      );
    } catch (err: any) {
      setError(err.message || "Failed to mark read");
    }
  };

  const router = useRouter();

  const fetchRequestDetails = async (requestId: string) => {
    try {
      const url = API_URL
        ? `${API_URL}/api/requests/${encodeURIComponent(requestId)}`
        : `/api/requests/${encodeURIComponent(requestId)}`;
      const body: any = await fetchJsonWithAuth(url);
      const data = body.data || body.request || body;

      setViewRequest(data);
      setViewModalOpen(true);
    } catch (err: any) {
      setError(err?.message || "Failed to load request details");
    }
  };

  const totalPages =
    pagination?.pages || Math.ceil((pagination?.total || 0) / pageSize) || 1;
  const unreadCount = notifications.filter((n) => !n.IsRead).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Notifications
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Stay updated with your recent activity
              </p>
            </div>
            {unreadCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg">
                <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-900">
                  {unreadCount} unread
                </span>
              </div>
            )}
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  aria-label="Search notifications"
                  classNames={{
                    inputWrapper:
                      "bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors",
                    input: "text-sm",
                  }}
                  endContent={
                    <Kbd className="hidden lg:inline-block" keys={["command"]}>
                      K
                    </Kbd>
                  }
                  labelPlacement="outside"
                  placeholder="Search by request ID..."
                  startContent={
                    <SearchIcon className="text-base text-gray-400 pointer-events-none flex-shrink-0" />
                  }
                  type="search"
                  onChange={(e: any) => setQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    value={filterType || ""}
                    onChange={(e) => setFilterType(e.target.value || null)}
                  >
                    <option value="">All types</option>
                    <option value="NewRequest">New Request</option>
                    <option value="AdminAccepted">Admin Accepted</option>
                    <option value="AdminRescheduled">Admin Rescheduled</option>
                    <option value="AdminRejected">Admin Rejected</option>
                    <option value="CoordinatorApproved">
                      Coordinator Approved
                    </option>
                    <option value="RequestCompleted">Request Completed</option>
                  </select>
                </div>

                <Button
                  as="button"
                  className="px-5 py-2.5 text-sm font-medium bg-white border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={loading || unreadCount === 0}
                  variant="faded"
                  onClick={markAllRead}
                >
                  Mark all read
                </Button>
              </div>
            </div>
          </div>
        </div>

        {showUserDebug && (
          <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">
                Debug: stored user & detection
              </div>
              <div className="text-xs text-gray-500">
                dev only (add ?debugUser=1)
              </div>
            </div>
            <div className="text-xs text-gray-700">
              <pre className="whitespace-pre-wrap text-xs">
                {`stored user (localStorage.unite_user): ${(() => {
                  try {
                    return JSON.stringify(user.raw || {}, null, 2);
                  } catch (e) {
                    return String(user.raw);
                  }
                })()}`}
              </pre>
              <div className="mt-2 text-xs text-gray-600">
                Detected Recipient ID:{" "}
                <strong>
                  {(() => {
                    try {
                      const p = user.raw || null;

                      return p
                        ? p.Stakeholder_ID ||
                            p.StakeholderId ||
                            p.Coordinator_ID ||
                            p.CoordinatorId ||
                            p.id ||
                            p.ID ||
                            "none"
                        : "none";
                    } catch (e) {
                      return "error";
                    }
                  })()}
                </strong>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Detected Recipient Type:{" "}
                <strong>{getRecipientType() || "unknown"}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading && (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
              <p className="text-sm text-gray-500 mt-4">
                Loading notifications...
              </p>
            </div>
          )}

          {error && (
            <div className="p-6 bg-red-50 border-l-4 border-red-500">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {!loading && notifications.length === 0 && !error && (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BellRing className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                No notifications yet
              </h3>
              <p className="text-sm text-gray-500">
                When you receive notifications, they&apos;ll appear here
              </p>
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {notifications.map((n: any) => {
              const event = n.event || n.Event || null;
              const request = n.request || n.Request || null;
              const title =
                n.Title ||
                (event && (event.Event_Title || event.title)) ||
                (request && (request.Request_Title || request.title)) ||
                "Notification";

              const type = (n.NotificationType || "").toLowerCase();
              let TypeIcon: any = Mail;
              // default neutral classes
              let iconBgColor = n.IsRead ? "bg-gray-100" : "bg-gray-900";
              let iconColor = n.IsRead ? "text-gray-600" : "text-white";
              // pill colors for 'New' and ActionTaken
              let pillBg = "bg-black";
              let pillText = "text-white";
              let pillDot = "bg-white";
              let actionPillBg = "bg-gray-100";
              let actionPillText = "text-gray-700";

              // type-specific mappings (unread state uses color, read state falls back to gray text)
              if (type.includes("resched")) {
                TypeIcon = Calendar;
                iconBgColor = n.IsRead ? "bg-gray-100" : "bg-orange-500";
                iconColor = n.IsRead ? "text-orange-600" : "text-white";
                pillBg = "bg-orange-100";
                pillText = "text-orange-700";
                pillDot = "bg-orange-600";
                actionPillBg = "bg-orange-100";
                actionPillText = "text-orange-700";
              } else if (
                type.includes("accepted") ||
                type.includes("approved")
              ) {
                TypeIcon = CheckCircle;
                iconBgColor = n.IsRead ? "bg-gray-100" : "bg-green-500";
                iconColor = n.IsRead ? "text-green-600" : "text-white";
                pillBg = "bg-green-100";
                pillText = "text-green-700";
                pillDot = "bg-green-600";
                actionPillBg = "bg-green-100";
                actionPillText = "text-green-700";
              } else if (type.includes("rejected")) {
                TypeIcon = XCircle;
                iconBgColor = n.IsRead ? "bg-gray-100" : "bg-red-500";
                iconColor = n.IsRead ? "text-red-600" : "text-white";
                pillBg = "bg-red-100";
                pillText = "text-red-700";
                pillDot = "bg-red-600";
                actionPillBg = "bg-red-100";
                actionPillText = "text-red-700";
              } else if (type.includes("blood")) {
                TypeIcon = Droplet;
                iconBgColor = n.IsRead ? "bg-gray-100" : "bg-red-500";
                iconColor = n.IsRead ? "text-red-600" : "text-white";
                pillBg = "bg-red-100";
                pillText = "text-red-700";
                pillDot = "bg-red-600";
                actionPillBg = "bg-red-100";
                actionPillText = "text-red-700";
              } else if (type.includes("advocacy")) {
                TypeIcon = Megaphone;
                iconBgColor = n.IsRead ? "bg-gray-100" : "bg-purple-500";
                iconColor = n.IsRead ? "text-purple-600" : "text-white";
                pillBg = "bg-purple-100";
                pillText = "text-purple-700";
                pillDot = "bg-purple-600";
                actionPillBg = "bg-purple-100";
                actionPillText = "text-purple-700";
              } else if (
                type.includes("request") ||
                type.includes("newrequest")
              ) {
                TypeIcon = BellRing;
                iconBgColor = n.IsRead ? "bg-gray-100" : "bg-blue-500";
                iconColor = n.IsRead ? "text-blue-600" : "text-white";
                pillBg = "bg-blue-100";
                pillText = "text-blue-700";
                pillDot = "bg-blue-600";
                actionPillBg = "bg-blue-100";
                actionPillText = "text-blue-700";
              }

              const dateStr = (() => {
                const d =
                  n.RescheduledDate ||
                  n.ReadAt ||
                  n.ReadedAt ||
                  n.createdAt ||
                  n.created_at ||
                  n.created;

                try {
                  if (!d) return "";
                  const dt = new Date(d);

                  return new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(dt);
                } catch (e) {
                  return String(d);
                }
              })();

              const eventSummary = event
                ? {
                    title: event.Event_Title || event.title,
                    location: event.Location || event.location,
                    start: event.Start_Date || event.start || null,
                  }
                : null;

              return (
                <div
                  key={n.Notification_ID}
                  className={`flex items-start gap-4 p-6 transition-all hover:bg-gray-50 ${!n.IsRead ? "bg-gray-50" : ""}`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 pt-1">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgColor} transition-all shadow-sm`}
                    >
                      <TypeIcon className={`w-6 h-6 ${iconColor}`} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3
                            className={`text-base font-semibold ${!n.IsRead ? "text-gray-900" : "text-gray-700"}`}
                          >
                            {title}
                          </h3>
                          {!n.IsRead && (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${pillBg} ${pillText}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 ${pillDot} rounded-full`}
                              />
                              New
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {n.NotificationType && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                              {n.NotificationType.replace(
                                /([A-Z])/g,
                                " $1",
                              ).trim()}
                            </span>
                          )}
                          {n.ActionTaken && (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${actionPillBg} ${actionPillText}`}
                            >
                              {n.ActionTaken}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {dateStr}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                      {n.Message}
                    </p>

                    {eventSummary && (
                      <div className="mt-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg border border-gray-200">
                        <div className="font-semibold text-gray-900 mb-2">
                          {eventSummary.title}
                        </div>
                        <div className="space-y-1">
                          {eventSummary.location && (
                            <div className="text-xs text-gray-600 flex items-center gap-1.5">
                              <span className="w-1 h-1 bg-gray-400 rounded-full" />
                              {eventSummary.location}
                            </div>
                          )}
                          {eventSummary.start && (
                            <div className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(eventSummary.start).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-3">
                    {(request || n.Request_ID) && (
                      <Button
                        className="text-sm font-medium text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
                        variant="ghost"
                        onClick={() =>
                          fetchRequestDetails(
                            request?.Request_ID ||
                              request?.RequestId ||
                              n.Request_ID,
                          )
                        }
                      >
                        View Details
                      </Button>
                    )}

                    {!n.ActionTaken &&
                      (n.NotificationType || "")
                        .toLowerCase()
                        .includes("resched") && (
                        <Button
                          className="px-4 py-2 bg-black hover:bg-gray-900 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                          variant="solid"
                          onClick={() => {
                            if (n.Request_ID)
                              router.push(
                                `/dashboard/campaign?requestId=${encodeURIComponent(n.Request_ID)}`,
                              );
                            else if (n.Event_ID)
                              router.push(
                                `/dashboard/campaign?eventId=${encodeURIComponent(n.Event_ID)}`,
                              );
                          }}
                        >
                          Take Action
                        </Button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.total > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-medium text-gray-900">
                    {(pagination.page - 1) * pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-gray-900">
                    {Math.min(pagination.page * pageSize, pagination.total)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-900">
                    {pagination.total}
                  </span>{" "}
                  notifications
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      setPageNumber(Math.max(1, pagination.page - 1))
                    }
                  >
                    Previous
                  </button>
                  <div className="px-4 py-2 text-sm text-gray-600">
                    Page{" "}
                    <span className="font-medium text-gray-900">
                      {pagination.page}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-gray-900">
                      {pagination.pages}
                    </span>
                  </div>
                  <button
                    className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() =>
                      setPageNumber(
                        Math.min(pagination.pages, pagination.page + 1),
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {viewModalOpen && (
        <EventViewModal
          isOpen={viewModalOpen}
          request={viewRequest}
          onClose={() => {
            setViewModalOpen(false);
            setViewRequest(null);
          }}
        />
      )}
    </main>
  );
}
