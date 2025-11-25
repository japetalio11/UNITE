"use client";
import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";

import { fetchWithAuth } from "@/utils/fetchWithAuth";

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any | null;
  onSaved?: () => void;
}

export default function EditEventModal({
  isOpen,
  onClose,
  request,
  onSaved,
}: EditEventModalProps) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  // category-specific
  const [trainingType, setTrainingType] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [goalCount, setGoalCount] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const [expectedAudienceSize, setExpectedAudienceSize] = useState("");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [initialStartTime, setInitialStartTime] = useState("");
  const [initialEndTime, setInitialEndTime] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    if (!request) return;
    // request may already be the event object (from /api/events/:id returns event)
    const event = request.event || request || {};
    const category =
      event.categoryData || request.categoryData || request.category || {};

    setTitle(event.Event_Title || event.title || "");
    setLocation(event.Location || event.location || "");
    setEmail(event.Email || "");
    setContactNumber(event.Phone_Number || event.contactNumber || "");
    setDescription(event.Event_Description || event.Description || "");

    // Prefill times from Start_Date/End_Date but keep date portion unchanged
    try {
      if (event.Start_Date) {
        const s = new Date(event.Start_Date);
        const sh = String(s.getHours()).padStart(2, "0");
        const sm = String(s.getMinutes()).padStart(2, "0");
        const st = `${sh}:${sm}`;

        setStartTime(st);
        setInitialStartTime(st);
      }
      if (event.End_Date) {
        const e = new Date(event.End_Date);
        const eh = String(e.getHours()).padStart(2, "0");
        const em = String(e.getMinutes()).padStart(2, "0");
        const et = `${eh}:${em}`;

        setEndTime(et);
        setInitialEndTime(et);
      }
    } catch (e) {
      // ignore parse errors
    }

    // Prefill category props when available (category may be in categoryData)
    setTrainingType(category.TrainingType || event.TrainingType || "");
    setMaxParticipants(
      (category.MaxParticipants || event.MaxParticipants || "")?.toString() ||
        "",
    );
    setGoalCount(
      (category.Target_Donation || event.Target_Donation || "")?.toString() ||
        "",
    );
    setAudienceType(category.TargetAudience || event.TargetAudience || "");
    setExpectedAudienceSize(
      (
        category.ExpectedAudienceSize ||
        event.ExpectedAudienceSize ||
        ""
      )?.toString() || "",
    );
  }, [request]);

  if (!request) return null;

  const userRaw =
    typeof window !== "undefined" ? localStorage.getItem("unite_user") : null;
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isAdminOrCoordinator = !!(
    user &&
    (user.staff_type === "Admin" || user.staff_type === "Coordinator")
  );

  // helper to show start date regardless of shape
  const rawStart =
    request?.event?.Start_Date ||
    request?.Start_Date ||
    request?.StartDate ||
    null;
  const displayStartDate = rawStart
    ? new Date(rawStart).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const handleSave = async () => {
    if (!request) return;
    setIsSubmitting(true);
    setValidationErrors([]);
    try {
      // requestId can appear in multiple shapes depending on where the modal was opened from
      const requestId =
        request?.Request_ID ||
        request?.RequestId ||
        request?._id ||
        request?.request?.Request_ID ||
        request?.request?.RequestId ||
        request?.event?.request?.Request_ID ||
        request?.event?.request?.RequestId ||
        request?.event?.Request_ID ||
        null;
      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Build update payload - editable fields. We'll compute Start_Date/End_Date ISO strings
      const updateData: any = {
        Event_Title: title,
        Location: location,
        Email: email,
        Phone_Number: contactNumber,
        Event_Description: description,
      };

      // If times were edited (or present), compute new ISO datetimes using the original date
      try {
        const originalStart = request.event?.Start_Date
          ? new Date(request.event.Start_Date)
          : null;

        // Only include Start_Date if the user actually changed the time
        if (originalStart && startTime && startTime !== initialStartTime) {
          const [sh, sm] = startTime
            .split(":")
            .map((v: string) => parseInt(v, 10));
          const newStart = new Date(originalStart);

          newStart.setHours(
            isNaN(sh) ? originalStart.getHours() : sh,
            isNaN(sm) ? originalStart.getMinutes() : sm,
            0,
            0,
          );
          updateData.Start_Date = newStart.toISOString();
        }
        const originalEnd = request.event?.End_Date
          ? new Date(request.event.End_Date)
          : null;

        // Only include End_Date if the user actually changed the time
        if (originalEnd && endTime && endTime !== initialEndTime) {
          const [eh, em] = endTime
            .split(":")
            .map((v: string) => parseInt(v, 10));
          const newEnd = new Date(originalEnd);

          newEnd.setHours(
            isNaN(eh) ? originalEnd.getHours() : eh,
            isNaN(em) ? originalEnd.getMinutes() : em,
            0,
            0,
          );
          updateData.End_Date = newEnd.toISOString();
        }
      } catch (e) {
        // ignore
      }

      const categoryType =
        (request.event &&
          (request.event.categoryType || request.event.Category)) ||
        (request.category && request.category.type) ||
        "";

      if (
        String(categoryType).toLowerCase().includes("training") ||
        String(request.category?.type || "")
          .toLowerCase()
          .includes("training")
      ) {
        updateData.TrainingType = trainingType;
        updateData.MaxParticipants = maxParticipants
          ? parseInt(maxParticipants, 10)
          : undefined;
      }

      if (
        String(categoryType).toLowerCase().includes("blood") ||
        String(request.category?.type || "")
          .toLowerCase()
          .includes("blood")
      ) {
        updateData.Target_Donation = goalCount
          ? parseInt(goalCount, 10)
          : undefined;
      }

      if (
        String(categoryType).toLowerCase().includes("advocacy") ||
        String(request.category?.type || "")
          .toLowerCase()
          .includes("advocacy")
      ) {
        updateData.TargetAudience = audienceType;
        updateData.ExpectedAudienceSize = expectedAudienceSize
          ? parseInt(expectedAudienceSize, 10)
          : undefined;
      }

      if (isAdminOrCoordinator) {
        // Token present on authenticated pages: prefer server-side actor resolution
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        let res;

        if (token) {
          // send only updateData; server will determine actor from token
          res = await fetchWithAuth(`${API_URL}/api/requests/${requestId}`, {
            method: "PUT",
            body: JSON.stringify(updateData),
          });
        } else {
          // legacy: include actor id in body
          const legacyBody = {
            ...updateData,
            ...(user.staff_type === "Admin"
              ? { adminId: user.id }
              : { coordinatorId: user.id }),
          };

          res = await fetch(`${API_URL}/api/requests/${requestId}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(legacyBody),
          });
        }
        const resp = await res.json();

        if (!res.ok) {
          if (resp && resp.errors && Array.isArray(resp.errors)) {
            setValidationErrors(resp.errors);

            return;
          }
          throw new Error(resp.message || "Failed to update request");
        }
        // refresh parent list
        if (onSaved) onSaved();
        onClose();
      } else {
        // Stakeholder: create a new change request instead (will be pending)
        // Use existing coordinator if present. If the modal was opened with a
        // trimmed/partial event object that lacks coordinator info, try to
        // fetch the full event details to derive the assigned coordinator.
        let coordinatorId =
          request.coordinator?.Coordinator_ID ||
          request.coordinator?.CoordinatorId ||
          request.MadeByCoordinatorID ||
          request.event?.MadeByCoordinatorID ||
          request.event?.coordinator?.Coordinator_ID ||
          request.event?.coordinator?.id ||
          null;

        const stakeholderId =
          user?.Stakeholder_ID || user?.StakeholderId || user?.id || null;

        // If coordinatorId is missing and we have an event id, fetch full event
        // details from the API to try to obtain the coordinator information.
        if (!coordinatorId) {
          try {
            const eventId =
              request?.event?.Event_ID ||
              request?.event?.EventId ||
              request?.Event_ID ||
              request?.EventId ||
              null;

            if (eventId) {
              const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
              const tokenLocal =
                typeof window !== "undefined"
                  ? localStorage.getItem("unite_token") ||
                    sessionStorage.getItem("unite_token")
                  : null;
              const res = tokenLocal
                ? await fetchWithAuth(
                    `${API_URL}/api/events/${encodeURIComponent(eventId)}`,
                    { method: "GET" },
                  )
                : await fetch(
                    `${API_URL}/api/events/${encodeURIComponent(eventId)}`,
                  );

              if (res && res.ok) {
                const j = await res.json();
                const data = j.data || j.event || j;
                const evt = data && data.event ? data.event : data;

                coordinatorId =
                  evt?.MadeByCoordinatorID ||
                  evt?.coordinator?.Coordinator_ID ||
                  evt?.coordinator?.id ||
                  coordinatorId;
              }
            }
          } catch (e) {
            // ignore fetch errors; we'll validate below and show a friendly error
          }
        }

        if (!coordinatorId) {
          throw new Error(
            "Coordinator is required to submit a change request.",
          );
        }

        // Ensure Start_Date/End_Date are present for stakeholder change requests.
        // The server validates these fields; when a stakeholder doesn't change
        // the time we must include the original event datetimes in ISO form.
        let payloadStartDate: string | undefined = undefined;
        let payloadEndDate: string | undefined = undefined;

        try {
          if (updateData.Start_Date) payloadStartDate = updateData.Start_Date;
          else if (request.event?.Start_Date)
            payloadStartDate = new Date(request.event.Start_Date).toISOString();
        } catch (e) {
          // leave undefined if parsing fails
        }
        try {
          if (updateData.End_Date) payloadEndDate = updateData.End_Date;
          else if (request.event?.End_Date)
            payloadEndDate = new Date(request.event.End_Date).toISOString();
        } catch (e) {
          // leave undefined if parsing fails
        }

        const body = {
          coordinatorId,
          MadeByStakeholderID: stakeholderId,
          Event_Title: title,
          Location: location,
          Email: email,
          Phone_Number: contactNumber,
          Event_Description: description,
          // include category fields
          ...(updateData.TrainingType
            ? { TrainingType: updateData.TrainingType }
            : {}),
          ...(updateData.MaxParticipants
            ? { MaxParticipants: updateData.MaxParticipants }
            : {}),
          ...(updateData.Target_Donation
            ? { Target_Donation: updateData.Target_Donation }
            : {}),
          ...(updateData.TargetAudience
            ? { TargetAudience: updateData.TargetAudience }
            : {}),
          ...(updateData.ExpectedAudienceSize
            ? { ExpectedAudienceSize: updateData.ExpectedAudienceSize }
            : {}),
          // include times/date if present
          ...(payloadStartDate ? { Start_Date: payloadStartDate } : {}),
          ...(payloadEndDate ? { End_Date: payloadEndDate } : {}),
        };

        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        let res;

        // Prefer updating the existing request (PUT) when we have a requestId
        if (requestId) {
          if (token) {
            res = await fetchWithAuth(
              `${API_URL}/api/requests/${encodeURIComponent(requestId)}`,
              { method: "PUT", body: JSON.stringify(body) },
            );
          } else {
            res = await fetch(
              `${API_URL}/api/requests/${encodeURIComponent(requestId)}`,
              { method: "PUT", headers, body: JSON.stringify(body) },
            );
          }
        } else {
          // No requestId: create a new request (POST)
          if (token) {
            res = await fetchWithAuth(`${API_URL}/api/requests`, {
              method: "POST",
              body: JSON.stringify(body),
            });
          } else {
            res = await fetch(`${API_URL}/api/requests`, {
              method: "POST",
              headers,
              body: JSON.stringify(body),
            });
          }
        }
        const resp = await res.json();

        if (!res.ok) {
          if (resp && resp.errors && Array.isArray(resp.errors)) {
            setValidationErrors(resp.errors);

            return;
          }
          throw new Error(resp.message || "Failed to create change request");
        }
        if (onSaved) onSaved();
        onClose();
      }
    } catch (err: any) {
      console.error("EditEventModal save error", err);
      // show errors in modal instead of alert
      const msg = err?.message || "Failed to save changes";

      setValidationErrors([msg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // render modal content with inputs; date fields intentionally shown but disabled
  return (
    <Modal
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="2xl"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-3 pb-4">
          <div>
            <h2 className="text-xl font-semibold">Edit event</h2>
            <p className="text-xs text-default-500">
              Edit details (date cannot be changed here)
            </p>
          </div>
        </ModalHeader>
        <ModalBody className="py-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Event Title</label>
              <Input
                classNames={{ inputWrapper: "h-10" }}
                type="text"
                value={title}
                variant="bordered"
                onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                classNames={{ inputWrapper: "h-10" }}
                type="text"
                value={location}
                variant="bordered"
                onChange={(e) =>
                  setLocation((e.target as HTMLInputElement).value)
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Contact Email</label>
                <Input
                  classNames={{ inputWrapper: "h-10" }}
                  type="email"
                  value={email}
                  variant="bordered"
                  onChange={(e) =>
                    setEmail((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contact Number</label>
                <Input
                  classNames={{ inputWrapper: "h-10" }}
                  type="tel"
                  value={contactNumber}
                  variant="bordered"
                  onChange={(e) =>
                    setContactNumber((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>

            {/* Category-specific fields */}
            {(() => {
              const cat =
                (request.category &&
                  (request.category.type || request.category.Type)) ||
                (request.event &&
                  (request.event.categoryType || request.event.Category)) ||
                "";
              const key = String(cat).toLowerCase();

              if (key.includes("training")) {
                return (
                  <>
                    <div>
                      <label className="text-sm font-medium">
                        Type of training
                      </label>
                      <Input
                        classNames={{ inputWrapper: "h-10" }}
                        type="text"
                        value={trainingType}
                        variant="bordered"
                        onChange={(e) =>
                          setTrainingType((e.target as HTMLInputElement).value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Max participants
                      </label>
                      <Input
                        classNames={{ inputWrapper: "h-10" }}
                        type="number"
                        value={maxParticipants}
                        variant="bordered"
                        onChange={(e) =>
                          setMaxParticipants(
                            (e.target as HTMLInputElement).value,
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        minRows={3}
                        value={description}
                        variant="bordered"
                        onChange={(e: any) => setDescription(e.target.value)}
                      />
                    </div>
                  </>
                );
              }
              if (key.includes("blood")) {
                return (
                  <>
                    <div>
                      <label className="text-sm font-medium">Goal count</label>
                      <Input
                        classNames={{ inputWrapper: "h-10" }}
                        type="number"
                        value={goalCount}
                        variant="bordered"
                        onChange={(e) =>
                          setGoalCount((e.target as HTMLInputElement).value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        minRows={3}
                        value={description}
                        variant="bordered"
                        onChange={(e: any) => setDescription(e.target.value)}
                      />
                    </div>
                  </>
                );
              }
              if (key.includes("advocacy")) {
                return (
                  <>
                    <div>
                      <label className="text-sm font-medium">
                        Audience Type
                      </label>
                      <Input
                        classNames={{ inputWrapper: "h-10" }}
                        type="text"
                        value={audienceType}
                        variant="bordered"
                        onChange={(e) =>
                          setAudienceType((e.target as HTMLInputElement).value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Target number of audience
                      </label>
                      <Input
                        classNames={{ inputWrapper: "h-10" }}
                        type="number"
                        value={expectedAudienceSize}
                        variant="bordered"
                        onChange={(e) =>
                          setExpectedAudienceSize(
                            (e.target as HTMLInputElement).value,
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        minRows={3}
                        value={description}
                        variant="bordered"
                        onChange={(e: any) => setDescription(e.target.value)}
                      />
                    </div>
                  </>
                );
              }

              return null;
            })()}

            {/* Show date but disabled to indicate not editable here (End Date intentionally omitted) */}
            <div className="grid grid-cols-1 gap-3 mt-2 items-end">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  disabled
                  classNames={{ inputWrapper: "h-10 bg-default-100" }}
                  type="text"
                  value={displayStartDate}
                  variant="bordered"
                />
              </div>
            </div>

            {/* Time inputs: allow editing times while keeping date unchanged */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  classNames={{ inputWrapper: "h-10" }}
                  type="time"
                  value={startTime}
                  variant="bordered"
                  onChange={(e) =>
                    setStartTime((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input
                  classNames={{ inputWrapper: "h-10" }}
                  type="time"
                  value={endTime}
                  variant="bordered"
                  onChange={(e) =>
                    setEndTime((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>

            {/* Validation / error box */}
            {validationErrors && validationErrors.length > 0 && (
              <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded">
                <h4 className="text-sm font-semibold">Validation error</h4>
                <ul className="text-xs mt-2 list-disc list-inside">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-black text-white"
            color="default"
            disabled={isSubmitting}
            onPress={handleSave}
          >
            {isSubmitting
              ? isAdminOrCoordinator
                ? "Saving..."
                : "Submitting request..."
              : isAdminOrCoordinator
                ? "Save changes"
                : "Submit change request"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
