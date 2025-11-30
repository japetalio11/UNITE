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
import { Avatar } from "@heroui/avatar";
import { Person, Droplet, Megaphone } from "@gravity-ui/icons";

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any | null;
  onSaved?: () => void;
}

/**
 * EditEventModal
 * - Allows Admins and Coordinators to update event details (except date).
 * - For Stakeholders, it will create a change request (new request) which will be pending.
 */
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
  const [stakeholder, setStakeholder] = useState("");
  const [stakeholderOptions, setStakeholderOptions] = useState<
    { key: string; label: string }[]
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [initialStartTime, setInitialStartTime] = useState("");
  const [initialEndTime, setInitialEndTime] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    if (!request) return;
    const event = request.event || {};
    const category = request.category || {};

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

    // Prefill category props when available
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

    // Prefill stakeholder selection when editing
    try {
      const sid =
        request.MadeByStakeholderID ||
        request.madeByStakeholderID ||
        (request.event &&
          (request.event.MadeByStakeholderID ||
            request.event.madeByStakeholderID)) ||
        request.stakeholder ||
        null;

      if (sid) {
        setStakeholder(String(sid));
        setStakeholderOptions([{ key: String(sid), label: String(sid) }]);
      } else {
        setStakeholder("");
        setStakeholderOptions([]);
      }
    } catch (e) {}
  }, [request]);

  if (!request) return null;

  const userRaw =
    typeof window !== "undefined" ? localStorage.getItem("unite_user") : null;
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isAdminOrCoordinator = !!(
    user &&
    (user.staff_type === "Admin" || user.staff_type === "Coordinator")
  );
  const isAdmin = user && user.staff_type === "Admin";

  const isStakeholder = user && user.staff_type === "Stakeholder";

  const handleSave = async () => {
    if (!request) return;
    setIsSubmitting(true);
    setValidationErrors([]);
    try {
      const requestId = request.Request_ID || request.RequestId || request._id;
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
        if (isAdmin) {
          updateData.Target_Donation = goalCount
            ? parseInt(goalCount, 10)
            : undefined;
        }
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

      // Determine if this is a major change that requires review
      const hasMajorChanges = (() => {
        if (!isStakeholder) return false; // Admins/coordinators can make any changes directly

        // Check if dates changed
        if (startTime !== initialStartTime || endTime !== initialEndTime)
          return true;

        // Check if target donation changed (for blood drives)
        if (String(categoryType).toLowerCase().includes("blood")) {
          const originalGoal =
            (
              request.event?.Target_Donation ||
              request.event?.categoryData?.Target_Donation ||
              0
            )?.toString() || "";

          if (goalCount !== originalGoal) return true;
        }

        return false;
      })();

      if (!hasMajorChanges) {
        // Direct update - no review needed
        const body = {
          ...updateData,
          // include coordinatorId or adminId depending on role
          ...(user.staff_type === "Admin"
            ? { adminId: user.id }
            : user.staff_type === "Coordinator"
              ? { coordinatorId: user.id }
              : { MadeByStakeholderID: user.Stakeholder_ID || user.id }),
        };

        const res = await fetch(`${API_URL}/api/requests/${requestId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(body),
        });
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
        // Major changes - create a change request that needs review
        // Use existing coordinator if present
        const coordinatorId =
          request.coordinator?.Coordinator_ID ||
          request.coordinator?.CoordinatorId ||
          request.MadeByCoordinatorID ||
          request.event?.MadeByCoordinatorID;
        const stakeholderId =
          user?.Stakeholder_ID || user?.StakeholderId || user?.id || null;

        if (!coordinatorId) {
          throw new Error(
            "Coordinator is required to submit a change request.",
          );
        }

        // Ensure Start_Date/End_Date are present in the payload. The server requires Start_Date for validation
        // so when stakeholder does not change the date/time we must include the original event dates.
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

        // For change requests, update the existing request via PUT
        const body: any = {
          ...updateData,
        };

        // include times/date if present
        if (payloadStartDate) body.Start_Date = payloadStartDate;
        if (payloadEndDate) body.End_Date = payloadEndDate;

        // Include the requester id based on role
        if (isAdminOrCoordinator) {
          body.adminId = user.staff_type === "Admin" ? user.id : undefined;
          body.coordinatorId =
            user.staff_type === "Coordinator" ? user.id : undefined;
        } else {
          body.MadeByStakeholderID = stakeholderId;
        }

        // Determine if this edit requires review (only for stakeholders)
        const requiresReview = (() => {
          if (!isStakeholder) return false; // Admins/coordinators don't require review

          // Check if dates changed
          if (startTime !== initialStartTime || endTime !== initialEndTime)
            return true;

          // Check if target donation changed (for blood drives)
          if (isBlood) {
            const originalGoal =
              (
                request.event?.Target_Donation ||
                request.event?.categoryData?.Target_Donation ||
                0
              )?.toString() || "";

            if (goalCount !== originalGoal) return true;
          }

          return false;
        })();

        // Include the review requirement flag
        body.requiresReview = requiresReview;

        // PUT to update existing request
        const res = await fetch(`${API_URL}/api/requests/${requestId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(body),
        });
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
  const cat =
    (request.category && (request.category.type || request.category.Type)) ||
    (request.event && (request.event.categoryType || request.event.Category)) ||
    "";
  const isBlood = String(cat).toLowerCase().includes("blood");

  // Determine if this will be a direct save or require review
  const willRequireReview = (() => {
    if (!isStakeholder) return false; // Admins/coordinators don't require review

    // Check if dates changed
    if (startTime !== initialStartTime || endTime !== initialEndTime)
      return true;

    // Check if target donation changed (for blood drives)
    if (isBlood) {
      const originalGoal =
        (
          request.event?.Target_Donation ||
          request.event?.categoryData?.Target_Donation ||
          0
        )?.toString() || "";

      if (goalCount !== originalGoal) return true;
    }

    return false;
  })();

  const isDirectSave = !willRequireReview;

  return (
    <Modal
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="2xl"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Avatar
              className="bg-default-100 border-1 border-default"
              icon={
                String(
                  (request?.category &&
                    (request.category.type || request.category.Type)) ||
                    (request?.event &&
                      (request.event.categoryType || request.event.Category)) ||
                    "",
                )
                  .toLowerCase()
                  .includes("blood") ? (
                  <Droplet />
                ) : String(
                    (request?.category &&
                      (request.category.type || request.category.Type)) ||
                      (request?.event &&
                        (request.event.categoryType ||
                          request.event.Category)) ||
                      "",
                  )
                    .toLowerCase()
                    .includes("advocacy") ? (
                  <Megaphone />
                ) : (
                  <Person />
                )
              }
            />
          </div>
          <h3 className="text-sm font-semibold py-2">Edit Event</h3>
          <p className="text-xs font-normal">
            Edit details (date cannot be changed here)
          </p>
        </ModalHeader>
        <ModalBody className="py-4">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Event Title</label>
              <Input
                classNames={{ inputWrapper: "border-default-200 h-9" }}
                radius="md"
                size="sm"
                type="text"
                value={title}
                variant="bordered"
                onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Location</label>
              <Input
                classNames={{ inputWrapper: "border-default-200 h-9" }}
                radius="md"
                size="sm"
                type="text"
                value={location}
                variant="bordered"
                onChange={(e) =>
                  setLocation((e.target as HTMLInputElement).value)
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Contact Email</label>
                <Input
                  classNames={{ inputWrapper: "border-default-200 h-9" }}
                  radius="md"
                  size="sm"
                  type="email"
                  value={email}
                  variant="bordered"
                  onChange={(e) =>
                    setEmail((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Contact Number</label>
                <Input
                  classNames={{ inputWrapper: "border-default-200 h-9" }}
                  radius="md"
                  size="sm"
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
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        Type of training
                      </label>
                      <Input
                        classNames={{ inputWrapper: "border-default-200 h-9" }}
                        radius="md"
                        size="sm"
                        type="text"
                        value={trainingType}
                        variant="bordered"
                        onChange={(e) =>
                          setTrainingType((e.target as HTMLInputElement).value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        Max participants
                      </label>
                      <Input
                        classNames={{ inputWrapper: "border-default-200 h-9" }}
                        radius="md"
                        size="sm"
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
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Description</label>
                      <Textarea
                        classNames={{
                          inputWrapper: "border-default-200",
                        }}
                        minRows={3}
                        radius="md"
                        size="sm"
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
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Goal count</label>
                      <Input
                        classNames={{
                          inputWrapper: `border-default-200 h-9 ${!isAdmin ? "bg-default-100" : ""}`,
                        }}
                        disabled={!isAdmin}
                        radius="md"
                        size="sm"
                        type="number"
                        value={goalCount}
                        variant="bordered"
                        onChange={(e) =>
                          setGoalCount((e.target as HTMLInputElement).value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Description</label>
                      <Textarea
                        classNames={{
                          inputWrapper: "border-default-200",
                        }}
                        minRows={3}
                        radius="md"
                        size="sm"
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
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        Audience Type
                      </label>
                      <Input
                        classNames={{ inputWrapper: "border-default-200 h-9" }}
                        radius="md"
                        size="sm"
                        type="text"
                        value={audienceType}
                        variant="bordered"
                        onChange={(e) =>
                          setAudienceType((e.target as HTMLInputElement).value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        Target number of audience
                      </label>
                      <Input
                        classNames={{ inputWrapper: "border-default-200 h-9" }}
                        radius="md"
                        size="sm"
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
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Description</label>
                      <Textarea
                        classNames={{
                          inputWrapper: "border-default-200",
                        }}
                        minRows={3}
                        radius="md"
                        size="sm"
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
              <div className="space-y-1">
                <label className="text-xs font-medium">Start Date</label>
                <Input
                  disabled
                  classNames={{
                    inputWrapper: "border-default-200 h-9 bg-default-100",
                  }}
                  radius="md"
                  size="sm"
                  type="text"
                  value={
                    request.event?.Start_Date
                      ? new Date(request.event.Start_Date).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : ""
                  }
                  variant="bordered"
                />
              </div>
            </div>

            {/* Time inputs: allow editing times while keeping date unchanged */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Start Time</label>
                <Input
                  classNames={{ inputWrapper: "border-default-200 h-9" }}
                  radius="md"
                  size="sm"
                  type="time"
                  value={startTime}
                  variant="bordered"
                  onChange={(e) =>
                    setStartTime((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">End Time</label>
                <Input
                  classNames={{ inputWrapper: "border-default-200 h-9" }}
                  radius="md"
                  size="sm"
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
              ? isDirectSave
                ? "Saving..."
                : "Submitting request..."
              : isDirectSave
                ? "Save changes"
                : "Submit change request"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
