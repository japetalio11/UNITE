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
  onSaved?: (requestId?: string, updateData?: any) => void | Promise<void>;
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [initialStartTime, setInitialStartTime] = useState("");
  const [initialEndTime, setInitialEndTime] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    if (!request || !isOpen) return;
    
    let mounted = true;

    (async () => {
      try {
        // Get event ID from request
        const eventId = 
          request.Event_ID || 
          request.eventId || 
          (request.event && request.event.Event_ID) ||
          null;

        let eventData = request.event || {};
        let categoryData = request.category || {};

        // Fetch full event details from separate endpoint if eventId is available
        if (eventId) {
          try {
            const token =
              typeof window !== "undefined"
                ? localStorage.getItem("unite_token") ||
                  sessionStorage.getItem("unite_token")
                : null;
            const headers: any = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(
              `${API_URL}/api/events/${encodeURIComponent(eventId)}`,
              { headers, credentials: "include" }
            );
            const body = await res.json();

            if (res.ok && body.data) {
              // New API format: { success, data: { event, ... } }
              const fetchedEvent = body.data.event || body.data || body;
              eventData = { ...eventData, ...fetchedEvent };
              
              // Also check for category-specific data
              if (body.data.categoryData) {
                categoryData = { ...categoryData, ...body.data.categoryData };
              }
            }
          } catch (e) {
            console.warn("Failed to fetch event details, using request data:", e);
            // Continue with request data if fetch fails
          }
        }

        if (!mounted) return;

        // Extract fields from request-level or event-level (request fields take precedence)
        const title = request.Event_Title || eventData.Event_Title || eventData.title || "";
        const location = request.Location || eventData.Location || eventData.location || "";
        const email = request.Email || eventData.Email || "";
        const contactNumber = request.Phone_Number || eventData.Phone_Number || eventData.contactNumber || "";
        const description = request.Event_Description || eventData.Event_Description || eventData.Description || "";

        setTitle(title);
        setLocation(location);
        setEmail(email);
        setContactNumber(contactNumber);
        setDescription(description);

        // Prefill times from Start_Date/End_Date but keep date portion unchanged
        const startDate = request.Start_Date || request.Date || eventData.Start_Date || eventData.Date;
        const endDate = request.End_Date || eventData.End_Date;

        try {
          if (startDate) {
            const s = new Date(startDate);
            if (!isNaN(s.getTime())) {
              const sh = String(s.getHours()).padStart(2, "0");
              const sm = String(s.getMinutes()).padStart(2, "0");
              const st = `${sh}:${sm}`;
              setStartTime(st);
              setInitialStartTime(st);
            }
          }
          if (endDate) {
            const e = new Date(endDate);
            if (!isNaN(e.getTime())) {
              const eh = String(e.getHours()).padStart(2, "0");
              const em = String(e.getMinutes()).padStart(2, "0");
              const et = `${eh}:${em}`;
              setEndTime(et);
              setInitialEndTime(et);
            }
          }
        } catch (e) {
          // ignore parse errors
        }

        // Prefill category-specific fields (check both request and event/category data)
        setTrainingType(
          request.TrainingType || 
          categoryData.TrainingType || 
          eventData.TrainingType || 
          ""
        );
        setMaxParticipants(
          (request.MaxParticipants || 
           categoryData.MaxParticipants || 
           eventData.MaxParticipants || 
           "")?.toString() || ""
        );
        setGoalCount(
          (request.Target_Donation || 
           categoryData.Target_Donation || 
           eventData.Target_Donation || 
           "")?.toString() || ""
        );
        setAudienceType(
          request.TargetAudience || 
          categoryData.TargetAudience || 
          eventData.TargetAudience || 
          ""
        );
        setExpectedAudienceSize(
          (request.ExpectedAudienceSize ||
           categoryData.ExpectedAudienceSize ||
           eventData.ExpectedAudienceSize ||
           "")?.toString() || ""
        );

        // Topic field for Advocacy
        if (request.Topic || eventData.Topic) {
          // Topic is handled in the save function, no state needed for display
        }
      } catch (e) {
        console.error("Error loading event data:", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [request, isOpen, API_URL]);

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
      // Extract Request_ID from various possible locations
      // The backend _formatRequest returns 'requestId' (lowercase), but the model uses 'Request_ID'
      const requestId = 
        request.Request_ID || 
        request.RequestId || 
        request.requestId ||
        request._id ||
        (request.request && (request.request.Request_ID || request.request.RequestId || request.request.requestId || request.request._id)) ||
        (request.data && (request.data.Request_ID || request.data.RequestId || request.data.requestId || request.data._id)) ||
        null;

      if (!requestId) {
        console.error("EditEventModal: Request_ID not found in request object:", {
          hasRequest: !!request,
          requestKeys: request ? Object.keys(request) : [],
          requestSample: request ? {
            Request_ID: request.Request_ID,
            RequestId: request.RequestId,
            requestId: request.requestId,
            _id: request._id
          } : null
        });
        setValidationErrors(["Request ID not found. Cannot update event."]);
        setIsSubmitting(false);
        return;
      }


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

      // Combine Date + Start_Time into Start_Date, and Date + End_Time into End_Date
      // The event has one Date, with Start_Time and End_Time on that same date
      try {
        // Get the event date (from Date field, or Start_Date, or event.Start_Date)
        const eventDateValue = request.Date || request.Start_Date || (request.event && (request.event.Date || request.event.Start_Date));
        const eventDate = eventDateValue ? new Date(eventDateValue) : null;

        if (eventDate && !isNaN(eventDate.getTime())) {
          // Extract just the date portion (no time) for the Date field
          const dateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
          updateData.Date = dateOnly.toISOString();
          
          // Combine Date + Start_Time into Start_Date
          if (startTime) {
            const [sh, sm] = startTime
              .split(":")
              .map((v: string) => parseInt(v, 10));
            const startDateTime = new Date(eventDate);
            startDateTime.setHours(
              isNaN(sh) ? 0 : sh,
              isNaN(sm) ? 0 : sm,
              0,
              0,
            );
            updateData.Start_Date = startDateTime.toISOString();
          } else if (request.Start_Date || (request.event && request.event.Start_Date)) {
            // Keep existing Start_Date if time not provided
            const existingStart = request.Start_Date || (request.event && request.event.Start_Date);
            updateData.Start_Date = new Date(existingStart).toISOString();
          }
          
          // Combine Date + End_Time into End_Date (same date, different time)
          if (endTime) {
            const [eh, em] = endTime
              .split(":")
              .map((v: string) => parseInt(v, 10));
            const endDateTime = new Date(eventDate);
            endDateTime.setHours(
              isNaN(eh) ? 0 : eh,
              isNaN(em) ? 0 : em,
              0,
              0,
            );
            updateData.End_Date = endDateTime.toISOString();
          } else if (request.End_Date || (request.event && request.event.End_Date)) {
            // Keep existing End_Date if time not provided
            const existingEnd = request.End_Date || (request.event && request.event.End_Date);
            updateData.End_Date = new Date(existingEnd).toISOString();
          } else if (startTime) {
            // If no end time but we have start time, default to 2 hours after start
            const [sh, sm] = startTime
              .split(":")
              .map((v: string) => parseInt(v, 10));
            const defaultEnd = new Date(eventDate);
            defaultEnd.setHours(
              (isNaN(sh) ? 0 : sh) + 2,
              isNaN(sm) ? 0 : sm,
              0,
              0,
            );
            updateData.End_Date = defaultEnd.toISOString();
          }
        }
      } catch (e) {
        console.error("Error processing dates:", e);
        // ignore
      }

      // Get category from request or event (new API structure)
      const categoryType =
        request.Category ||
        request.category ||
        (request.event && (request.event.Category || request.event.category)) ||
        "";

      const categoryLower = String(categoryType || "").toLowerCase();

      if (categoryLower.includes("training")) {
        updateData.TrainingType = trainingType;
        updateData.MaxParticipants = maxParticipants
          ? parseInt(maxParticipants, 10)
          : undefined;
      }

      if (categoryLower.includes("blood")) {
        if (isAdmin) {
          updateData.Target_Donation = goalCount
            ? parseInt(goalCount, 10)
            : undefined;
        }
      }

      if (categoryLower.includes("advocacy")) {
        updateData.TargetAudience = audienceType;
        updateData.ExpectedAudienceSize = expectedAudienceSize
          ? parseInt(expectedAudienceSize, 10)
          : undefined;
        // Topic field if available
        if (request.Topic || (request.event && request.event.Topic)) {
          // Topic can be included if it was in the original data
        }
      }

      // Determine if this is a major change that requires review
      const hasMajorChanges = (() => {
        if (!isStakeholder) return false; // Admins/coordinators can make any changes directly

        // Check if dates changed
        if (startTime !== initialStartTime || endTime !== initialEndTime)
          return true;

        // Check if target donation changed (for blood drives)
        const categoryLower = String(categoryType || "").toLowerCase();
        if (categoryLower.includes("blood")) {
          const originalGoal =
            (
              request.Target_Donation ||
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
        // Backend derives user ID from token, no need to include in body
        const body = { ...updateData };

        // Ensure requestId is a string and properly encoded
        const encodedRequestId = encodeURIComponent(String(requestId));
        const url = `${API_URL}/api/event-requests/${encodedRequestId}`;
        
        // Close modal immediately so user can see loading animation on card
        onClose();

        // Dispatch loading event for EventCard to show loading animation
        const requestIdForRefresh = requestId || request?.Request_ID || request?.RequestId || request?._id;
        if (typeof window !== "undefined" && requestIdForRefresh) {
          window.dispatchEvent(
            new CustomEvent("unite:request-editing", {
              detail: {
                requestId: requestIdForRefresh,
                isEditing: true,
              },
            })
          );
        }
        
        // Fire the request (don't wait for response)
        fetch(url, {
          method: "PUT",
          headers,
          body: JSON.stringify(body),
        }).catch((err) => {
          console.warn("[EditEventModal] ⚠️ Fetch error (non-blocking):", err?.message);
          // Don't block - we'll refresh anyway
        });

        // Start parent refresh IMMEDIATELY so data is ready when loading animation ends
        // Pass requestId and updateData for optimistic updates
        if (onSaved) {
          try {
            const result = onSaved(requestId, updateData) as any;
            if (result && result instanceof Promise) {
              result.catch((err: any) => console.error("[EditEventModal] Error in onSaved:", err));
            }
          } catch (err: any) {
            console.error("[EditEventModal] Error in onSaved:", err);
          }
        }

        // Dispatch force refresh event immediately
        if (typeof window !== "undefined" && requestIdForRefresh) {
          window.dispatchEvent(
            new CustomEvent("unite:force-refresh-requests", {
              detail: {
                requestId: requestIdForRefresh,
                forceRefresh: true,
                cacheKeysToInvalidate: [`/api/event-requests/${requestIdForRefresh}`, "/api/event-requests"],
              },
            })
          );
        }

        // DON'T clear loading state here - let EventCard polling clear it when it detects the change
        // This ensures the loading animation stays active until the card is actually updated
        setIsSubmitting(false);

        // Backup refresh after 2 seconds in case backend is slow
        setTimeout(() => {
          if (typeof window !== "undefined" && requestIdForRefresh) {
            window.dispatchEvent(
              new CustomEvent("unite:force-refresh-requests", {
                detail: {
                  requestId: requestIdForRefresh,
                  forceRefresh: true,
                  cacheKeysToInvalidate: [`/api/event-requests/${requestIdForRefresh}`, "/api/event-requests"],
                },
              })
            );
          }
          if (onSaved) {
            try {
              const result = onSaved(requestId, updateData) as any;
              if (result && result instanceof Promise) {
                result.catch((err: any) => console.error("[EditEventModal] Backup refresh error:", err));
              }
            } catch (err: any) {
              console.error("[EditEventModal] Backup refresh error:", err);
            }
          }
        }, 2000);
      } else {
        // Major changes - update request (backend handles review workflow)
        // Ensure Start_Date/End_Date are present in the payload
        let payloadStartDate: string | undefined = undefined;
        let payloadEndDate: string | undefined = undefined;

        try {
          if (updateData.Start_Date) {
            payloadStartDate = updateData.Start_Date;
          } else {
            // Use original date from request or event
            const originalStart = 
              request.Start_Date || 
              request.Date || 
              (request.event && request.event.Start_Date);
            if (originalStart) {
              payloadStartDate = new Date(originalStart).toISOString();
            }
          }
        } catch (e) {
          // leave undefined if parsing fails
        }
        try {
          if (updateData.End_Date) {
            payloadEndDate = updateData.End_Date;
          } else {
            const originalEnd = 
              request.End_Date || 
              (request.event && request.event.End_Date);
            if (originalEnd) {
              payloadEndDate = new Date(originalEnd).toISOString();
            }
          }
        } catch (e) {
          // leave undefined if parsing fails
        }

        // Build update payload - backend derives user from token
        const body: any = {
          ...updateData,
        };

        // include times/date if present
        if (payloadStartDate) body.Start_Date = payloadStartDate;
        if (payloadEndDate) body.End_Date = payloadEndDate;

        // Ensure requestId is a string and properly encoded
        const encodedRequestId = encodeURIComponent(String(requestId));
        const url = `${API_URL}/api/event-requests/${encodedRequestId}`;
        
        // Close modal immediately so user can see loading animation on card
        onClose();

        // Dispatch loading event for EventCard to show loading animation
        const requestIdForRefresh = requestId || request?.Request_ID || request?.RequestId || request?._id;
        if (typeof window !== "undefined" && requestIdForRefresh) {
          window.dispatchEvent(
            new CustomEvent("unite:request-editing", {
              detail: {
                requestId: requestIdForRefresh,
                isEditing: true,
              },
            })
          );
        }
        
        // Fire the request (don't wait for response)
        fetch(url, {
          method: "PUT",
          headers,
          body: JSON.stringify(body),
        }).catch((err) => {
          console.warn("[EditEventModal] ⚠️ Fetch error (non-blocking, major changes):", err?.message);
          // Don't block - we'll refresh anyway
        });

        // Start parent refresh IMMEDIATELY so data is ready when loading animation ends
        // Pass requestId and updateData (body) for optimistic updates
        if (onSaved) {
          try {
            const result = onSaved(requestId, body) as any;
            if (result && result instanceof Promise) {
              result.catch((err: any) => console.error("[EditEventModal] Error in onSaved (major changes):", err));
            }
          } catch (err: any) {
            console.error("[EditEventModal] Error in onSaved (major changes):", err);
          }
        }

        // Dispatch force refresh event immediately
        if (typeof window !== "undefined" && requestIdForRefresh) {
          window.dispatchEvent(
            new CustomEvent("unite:force-refresh-requests", {
              detail: {
                requestId: requestIdForRefresh,
                forceRefresh: true,
                cacheKeysToInvalidate: [`/api/event-requests/${requestIdForRefresh}`, "/api/event-requests"],
              },
            })
          );
        }

        // DON'T clear loading state here - let EventCard polling clear it when it detects the change
        // This ensures the loading animation stays active until the card is actually updated
        setIsSubmitting(false);

        // Backup refresh after 2 seconds in case backend is slow
        setTimeout(() => {
          if (typeof window !== "undefined" && requestIdForRefresh) {
            window.dispatchEvent(
              new CustomEvent("unite:force-refresh-requests", {
                detail: {
                  requestId: requestIdForRefresh,
                  forceRefresh: true,
                  cacheKeysToInvalidate: [`/api/event-requests/${requestIdForRefresh}`, "/api/event-requests"],
                },
              })
            );
          }
          if (onSaved) {
            try {
              const result = onSaved(requestId, body) as any;
              if (result && result instanceof Promise) {
                result.catch((err: any) => console.error("[EditEventModal] Backup refresh error (major changes):", err));
              }
            } catch (err: any) {
              console.error("[EditEventModal] Backup refresh error (major changes):", err);
            }
          }
        }, 2000);
      }
    } catch (err: any) {
      console.error("EditEventModal save error", err);
      // If modal is still open, show errors in modal
      // Otherwise, errors are handled in the async block above
      if (isOpen) {
        const msg = err?.message || "Failed to save changes";
        setValidationErrors([msg]);
        setIsSubmitting(false);
      }
    }
  };

  // render modal content with inputs; date fields intentionally shown but disabled
  const cat =
    request.Category ||
    request.category ||
    (request.event && (request.event.Category || request.event.category)) ||
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
          request.Target_Donation ||
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
                String(cat).toLowerCase().includes("blood") ? (
                  <Droplet />
                ) : String(cat).toLowerCase().includes("advocacy") ? (
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
                    (request.Start_Date || request.Date || request.event?.Start_Date)
                      ? new Date(
                          request.Start_Date || 
                          request.Date || 
                          request.event.Start_Date
                        ).toLocaleDateString(
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
