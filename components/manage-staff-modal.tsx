"use client";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Avatar } from "@heroui/avatar";
import { Persons, Xmark } from "@gravity-ui/icons";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import { fetchWithAuth } from "@/utils/fetchWithAuth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // prefer requestId when available (campaign cards have it); otherwise eventId can be provided
  requestId?: string | null;
  eventId?: string | null;
  request?: any;
  onSaved?: () => void;
}

const API_BASE =
  typeof process !== "undefined" &&
  process.env &&
  process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "http://localhost:3000";

export default function ManageStaffModal({
  isOpen,
  onClose,
  requestId: propRequestId,
  eventId,
  request,
  onSaved,
}: Props) {
  const [staffMembers, setStaffMembers] = useState<
    Array<{ FullName: string; Role: string }>
  >([]);
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(
    propRequestId || null,
  );

  useEffect(() => {
    setRequestId(propRequestId || null);
  }, [propRequestId]);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        // Determine requestId: prefer prop, then request object, then fetch from eventId
        let rid = propRequestId || null;

        if (!rid && request) {
          rid = request.Request_ID || request.RequestId || request._id || null;
        }

        if (!rid && eventId) {
          const res = await fetch(
            `${API_BASE}/api/events/${encodeURIComponent(eventId)}`,
            { credentials: "include" },
          );
          const body = await res.json();

          if (!res.ok)
            throw new Error(body.message || "Failed to fetch event details");
          const data = body.data || body.event || body;

          rid =
            data?.request?.Request_ID ||
            data?.Request_ID ||
            data?.requestId ||
            data?.request?.RequestId ||
            null;
        }

        setRequestId(rid || null);

        if (rid) {
          const token =
            typeof window !== "undefined"
              ? localStorage.getItem("unite_token") ||
                sessionStorage.getItem("unite_token")
              : null;
          const headers: any = { "Content-Type": "application/json" };

          if (token) headers["Authorization"] = `Bearer ${token}`;
          const r = await fetch(
            `${API_BASE}/api/requests/${encodeURIComponent(rid)}`,
            { headers },
          );
          const rb = await r.json();

          if (!r.ok)
            throw new Error(rb.message || "Failed to fetch request details");
          const reqData = rb.data || rb.request || rb;
          const staff = reqData?.staff || [];

          if (mounted) {
            setStaffMembers(
              Array.isArray(staff)
                ? staff.map((s: any) => ({
                    FullName:
                      s.FullName || s.Staff_FullName || s.Staff_Fullname || "",
                    Role: s.Role || "",
                  }))
                : [],
            );
          }
        } else {
          if (mounted) setStaffMembers([]);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load staff");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, propRequestId, eventId, request]);

  const addStaff = () => {
    if (!newFullName || !newRole) return setError("Name and role are required");
    setError(null);
    setStaffMembers([
      ...staffMembers,
      { FullName: newFullName.trim(), Role: newRole.trim() },
    ]);
    setNewFullName("");
    setNewRole("");
  };

  const removeStaff = (idx: number) => {
    setStaffMembers(staffMembers.filter((_, i) => i !== idx));
  };

  const save = async () => {
    const rid =
      requestId ||
      (request && (request.Request_ID || request.RequestId || request._id)) ||
      null;

    if (!rid) return setError("Request info not available");
    try {
      setSaving(true);
      setError(null);
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

      const body: any = {
        adminId: user?.id || user?.Admin_ID || null,
        eventId:
          eventId ||
          (request &&
            (request.Event_ID || (request.event && request.event.Event_ID))) ||
          null,
        staffMembers,
      };

      let res;

      if (token) {
        res = await fetchWithAuth(
          `${API_BASE}/api/requests/${encodeURIComponent(rid)}/staff`,
          { method: "POST", body: JSON.stringify(body) },
        );
      } else {
        res = await fetch(
          `${API_BASE}/api/requests/${encodeURIComponent(rid)}/staff`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            credentials: "include",
          },
        );
      }

      const resp = await res.json();

      if (!res.ok) throw new Error(resp.message || "Failed to assign staff");

      if (onSaved) await onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to save staff");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} placement="center" size="2xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Avatar
              className="bg-default-100 border-1 border-default"
              icon={<Persons />}
            />
          </div>
          <h3 className="text-sm font-semibold py-2">Add Staff</h3>
          <p className="text-xs font-normal">
            Start providing your information by selecting your blood type. Add
            details below to proceed.
          </p>
        </ModalHeader>

        <ModalBody className="py-4">
          <div className="mb-6">
            <div className="grid grid-cols-12 gap-4 mb-6 items-end">
              <div className="col-span-5 space-y-1">
                <label className="text-xs font-medium">
                  Name of Staff <span className="text-danger">*</span>
                </label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
                  placeholder="Enter name of staff"
                  radius="md"
                  size="sm"
                  value={newFullName}
                  variant="bordered"
                  onChange={(e) =>
                    setNewFullName((e.target as HTMLInputElement).value)
                  }
                />
              </div>

              <div className="col-span-4 space-y-1">
                <label className="text-xs font-medium">Staff Role</label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
                  placeholder="Role"
                  radius="md"
                  size="sm"
                  value={newRole}
                  variant="bordered"
                  onChange={(e) =>
                    setNewRole((e.target as HTMLInputElement).value)
                  }
                />
              </div>

              <div className="col-span-3">
                <Button
                  className="w-full font-medium border-default-200"
                  radius="md"
                  size="sm"
                  variant="bordered"
                  onPress={addStaff}
                >
                  Add Staff
                </Button>
              </div>
            </div>

            <div className="border border-default-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-default-50">
                <div className="col-span-1 flex items-center">
                  <input
                    aria-label="select all"
                    className="w-4 h-4 rounded border-default-300"
                    type="checkbox"
                  />
                </div>
                <div className="col-span-6 text-xs font-semibold text-default-600 uppercase tracking-wide">
                  Name
                </div>
                <div className="col-span-3 text-xs font-semibold text-default-600 uppercase tracking-wide">
                  Role
                </div>
                <div className="col-span-2 text-xs font-semibold text-default-600 uppercase tracking-wide text-center">
                  Action
                </div>
              </div>

              <div className="bg-white">
                {loading && (
                  <div className="px-4 py-6 text-center text-sm text-default-600 border-t border-default-100">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner size="sm" />
                      <span>Loading staff...</span>
                    </div>
                  </div>
                )}

                {!loading && staffMembers.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-default-500">
                    No staff assigned yet.
                  </div>
                )}

                {staffMembers.map((s, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-default-100 hover:bg-default-50 transition-colors"
                  >
                    <div className="col-span-1 flex items-center">
                      <input
                        aria-label={`select-${idx}`}
                        className="w-4 h-4 rounded border-default-300"
                        type="checkbox"
                      />
                    </div>
                    <div className="col-span-6 text-sm text-default-900">
                      {s.FullName}
                    </div>
                    <div className="col-span-3 text-sm text-default-700">
                      {s.Role}
                    </div>
                    <div className="col-span-2 flex items-center justify-end pr-3">
                      <button
                        aria-label="remove"
                        className="text-danger hover:bg-danger-50 p-1.5 rounded-lg transition-colors"
                        onClick={() => removeStaff(idx)}
                      >
                        <Xmark className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          {saving && <div className="text-sm text-default-600">Saving...</div>}
        </ModalBody>

        <ModalFooter>
          <Button
            className="w-full font-medium"
            variant="bordered"
            onPress={onClose}
          >
            Close
          </Button>
          <Button
            className="w-full font-medium"
            color="primary"
            isDisabled={saving}
            onPress={save}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
