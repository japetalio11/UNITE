"use client";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Clock } from "@gravity-ui/icons";
import { DatePicker } from "@heroui/date-picker";
import { Button } from "@heroui/button";

import { fetchWithAuth } from "@/utils/fetchWithAuth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string | null;
  onSaved?: () => void;
}

const API_BASE =
  typeof process !== "undefined" &&
  process.env &&
  process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "http://localhost:3000";

export default function EventRescheduleModal({
  isOpen,
  onClose,
  eventId,
  onSaved,
}: Props) {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [currentDateDisplay, setCurrentDateDisplay] = useState("");
  const [rescheduledDate, setRescheduledDate] = useState<any>(null);
  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!eventId) return;
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE}/api/events/${encodeURIComponent(eventId)}`,
          { credentials: "include" },
        );
        const body = await res.json();

        if (!res.ok)
          throw new Error(body.message || "Failed to fetch event details");
        const data = body.data || body.event || body;
        const rid =
          data?.request?.Request_ID ||
          data?.Request_ID ||
          data?.requestId ||
          data?.request?.RequestId ||
          null;

        setRequestId(rid || null);

        // determine displayable current date
        let start: Date | null = null;

        try {
          if (data?.Start_Date) {
            if (typeof data.Start_Date === "object" && data.Start_Date.$date) {
              const d = data.Start_Date.$date;

              if (typeof d === "object" && d.$numberLong)
                start = new Date(Number(d.$numberLong));
              else start = new Date(d as any);
            } else {
              start = new Date(data.Start_Date as any);
            }
          }
        } catch (e) {
          start = null;
        }
        if (mounted) setCurrentDateDisplay(start ? start.toLocaleString() : "");
      } catch (e) {
        // ignore, leave fields blank
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, eventId]);

  const handleReschedule = async () => {
    setValidationError(null);
    if (!rescheduledDate) return setValidationError("Please choose a new date");
    try {
      const rs = new Date(rescheduledDate);

      rs.setHours(0, 0, 0, 0);
      const today = new Date();

      today.setHours(0, 0, 0, 0);
      if (rs.getTime() < today.getTime())
        return setValidationError("Rescheduled date cannot be before today");
    } catch (e) {
      return setValidationError("Invalid date selected");
    }

    if (!note || note.trim().length === 0)
      return setValidationError("Please provide a reason for rescheduling");
    if (!requestId)
      return setValidationError(
        "Unable to determine request id for reschedule",
      );

    try {
      setSaving(true);
      const rawUser =
        typeof window !== "undefined"
          ? localStorage.getItem("unite_user")
          : null;
      const user = rawUser ? JSON.parse(rawUser as string) : null;
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token")
          : null;
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      const newDateISO =
        typeof rescheduledDate === "string"
          ? new Date(rescheduledDate).toISOString()
          : rescheduledDate instanceof Date
            ? rescheduledDate.toISOString()
            : new Date(rescheduledDate).toISOString();

      const body: any = {
        action: "Rescheduled",
        note: note.trim(),
        rescheduledDate: newDateISO,
      };
      let res;

      if (token) {
        res = await fetchWithAuth(
          `${API_BASE}/api/requests/${encodeURIComponent(requestId)}/admin-action`,
          { method: "POST", body: JSON.stringify(body) },
        );
      } else {
        // legacy fallback when token absent
        const legacyBody = {
          adminId: user?.id || user?.Admin_ID || null,
          ...body,
        };

        res = await fetch(
          `${API_BASE}/api/requests/${encodeURIComponent(requestId)}/admin-action`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(legacyBody),
            credentials: "include",
          },
        );
      }
      const resp = await res.json();

      if (!res.ok)
        throw new Error(resp.message || "Failed to reschedule request");

      if (onSaved) await onSaved();
      onClose();
    } catch (e: any) {
      setValidationError(e?.message || "Failed to reschedule request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} placement="center" size="md" onClose={onClose}>
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-default-100">
            <Clock className="w-5 h-5 text-default-600" />
          </div>
          <span className="text-lg font-semibold">Reschedule Event</span>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-600 mb-4">
            Select a new date for this event and provide a reason for
            rescheduling.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium text-default-900">
              Current Date
            </label>
            <input
              readOnly
              className="w-full px-3 py-2 text-sm border border-default-200 rounded-lg bg-default-100"
              type="text"
              value={currentDateDisplay}
            />
          </div>

          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium text-default-900">
              New Date
            </label>
            <DatePicker
              hideTimeZone
              classNames={{
                base: "w-full",
                inputWrapper:
                  "border-default-200 hover:border-default-400 h-10",
                input: "text-sm",
              }}
              granularity="day"
              value={rescheduledDate}
              variant="bordered"
              onChange={setRescheduledDate}
            />
          </div>

          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium text-default-900">
              Reason for rescheduling
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm border border-default-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={4}
              value={note}
              onChange={(e) => setNote((e.target as HTMLTextAreaElement).value)}
            />
          </div>

          {validationError && (
            <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded">
              <p className="text-xs text-warning-700">{validationError}</p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button className="font-medium" variant="bordered" onPress={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-black text-white font-medium"
            color="default"
            isDisabled={!rescheduledDate || !note}
            onPress={handleReschedule}
          >
            {saving ? "Rescheduling..." : "Reschedule"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
