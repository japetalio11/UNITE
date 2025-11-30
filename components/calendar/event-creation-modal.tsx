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
import { Select, SelectItem } from "@heroui/select";
import { DatePicker } from "@heroui/date-picker";
import { Avatar } from "@heroui/avatar";
import { Person, Droplet, Megaphone } from "@gravity-ui/icons";

import { getUserInfo } from "@/utils/getUserInfo";
import { decodeJwt } from "@/utils/decodeJwt";

interface CreateTrainingEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

type Variant = "training" | "blood-drive" | "advocacy";

interface GenericCreateEventModalProps extends CreateTrainingEventModalProps {
  variant?: Variant;
}

const GenericCreateEventModal: React.FC<GenericCreateEventModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  error,
  variant = "training",
}) => {
  const [coordinator, setCoordinator] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [trainingType, setTrainingType] = useState("");
  const [date, setDate] = useState<any>(null);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [numberOfParticipants, setNumberOfParticipants] = useState("");
  const [goalCount, setGoalCount] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [localSubmitting, setLocalSubmitting] = useState(false);

  const [coordinatorOptions, setCoordinatorOptions] = useState<
    { key: string; label: string }[]
  >([]);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    const fetchCoordinators = async () => {
      try {
        const rawUser = localStorage.getItem("unite_user");
        const token =
          localStorage.getItem("unite_token") ||
          sessionStorage.getItem("unite_token");
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const user = rawUser ? JSON.parse(rawUser) : null;
        const info = (() => {
          try {
            return getUserInfo();
          } catch (e) {
            return null;
          }
        })();
        // robust admin detection (handle different property shapes/casing)
        const isAdmin = !!(
          // central getUserInfo flag takes precedence
          (
            (info && info.isAdmin) ||
            (user &&
              ((user.staff_type &&
                String(user.staff_type).toLowerCase().includes("admin")) ||
                (user.role &&
                  String(user.role).toLowerCase().includes("admin"))))
          )
        );

        if (user && isAdmin) {
          const res = await fetch(`${API_URL}/api/coordinators`, {
            headers,
            credentials: "include",
          });
          const body = await res.json();

          if (res.ok) {
            const list = body.data || body.coordinators || body;
            const opts = (Array.isArray(list) ? list : []).map((c: any) => {
              const staff = c.Staff || c.staff || null;
              const district = c.District || c.district || null;
              const fullName = staff
                ? [staff.First_Name, staff.Middle_Name, staff.Last_Name]
                    .filter(Boolean)
                    .join(" ")
                    .trim()
                : c.StaffName || c.label || "";
              const districtLabel = district?.District_Number
                ? `District ${district.District_Number}`
                : district?.District_Name || "";

              return {
                key: c.Coordinator_ID || (staff && staff.ID) || c.id,
                label: `${fullName}${districtLabel ? " - " + districtLabel : ""}`,
              };
            });

            setCoordinatorOptions(opts);
          }
        } else if (user) {
          // For coordinators/stakeholders derive coordinator id from a number of possible user fields
          // Preserve backwards compatibility by trying common fields in order
          const candidateIds = [] as Array<string | number | undefined>;

          // If user is explicitly a Coordinator (staff_type) or role indicates coordinator, use their own id
          if (
            (user.staff_type &&
              String(user.staff_type).toLowerCase().includes("coordinator")) ||
            (info &&
              String(info.role || "")
                .toLowerCase()
                .includes("coordinator"))
          )
            candidateIds.push(user.id || info?.raw?.id);
          // Common fields where coordinator id may be stored
          candidateIds.push(
            user.Coordinator_ID,
            user.CoordinatorId,
            user.CoordinatorID,
            user.role_data?.coordinator_id,
            user.MadeByCoordinatorID,
            info?.raw?.Coordinator_ID,
            info?.raw?.CoordinatorId,
          );
          // Also accept IDs that look like COORD_... as the coordinator id
          if (
            !candidateIds.some(Boolean) &&
            user &&
            user.id &&
            String(user.id).toLowerCase().startsWith("coord_")
          )
            candidateIds.push(user.id);
          let coordId = candidateIds.find(Boolean) as string | undefined;

          // Fallback: inspect token payload for id/role/coordinator info
          if (!coordId) {
            try {
              const t =
                token ||
                (typeof window !== "undefined"
                  ? localStorage.getItem("unite_token") ||
                    sessionStorage.getItem("unite_token")
                  : null);
              const payload = decodeJwt(t);

              if (payload) {
                coordId =
                  payload.id ||
                  payload.ID ||
                  payload.Coordinator_ID ||
                  payload.coordinator_id ||
                  coordId;
              }
            } catch (e) {}
          }

          if (coordId) {
            try {
              // If the resolved id looks like a stakeholder id (STKH_), fetch the stakeholder
              // to obtain the actual Coordinator_ID, then fetch that coordinator.
              let resolvedCoordId = String(coordId);

              if (/^stkh_/i.test(resolvedCoordId)) {
                try {
                  const stRes = await fetch(
                    `${API_URL}/api/stakeholders/${encodeURIComponent(resolvedCoordId)}`,
                    { headers, credentials: "include" },
                  );
                  const stBody = await stRes.json();

                  if (stRes.ok && stBody.data) {
                    const stakeholder = stBody.data;

                    resolvedCoordId =
                      stakeholder.Coordinator_ID ||
                      stakeholder.CoordinatorId ||
                      stakeholder.coordinator_id ||
                      resolvedCoordId;
                  }
                } catch (e) {
                  console.warn(
                    "Failed to fetch stakeholder to resolve coordinator id",
                    resolvedCoordId,
                    e,
                  );
                }
              }

              // Try coordinators endpoint with the resolved coordinator id
              const res = await fetch(
                `${API_URL}/api/coordinators/${encodeURIComponent(resolvedCoordId)}`,
                { headers, credentials: "include" },
              );
              const body = await res.json();

              if (res.ok && body.data) {
                const coord =
                  body.data.coordinator ||
                  body.data ||
                  body.coordinator ||
                  body;
                const staff = coord?.Staff || null;
                const fullName = staff
                  ? [staff.First_Name, staff.Middle_Name, staff.Last_Name]
                      .filter(Boolean)
                      .join(" ")
                      .trim()
                  : "";
                const districtLabel = coord?.District?.District_Number
                  ? `District ${coord.District.District_Number}`
                  : coord?.District?.District_Name || "";
                const name = `${fullName}${districtLabel ? " - " + districtLabel : ""}`;

                setCoordinatorOptions([
                  {
                    key: coord?.Coordinator_ID || resolvedCoordId,
                    label: name,
                  },
                ]);
                setCoordinator(coord?.Coordinator_ID || resolvedCoordId);
              }
            } catch (e) {
              // swallow individual fetch errors but keep trying other flows
              console.error("Failed to fetch coordinator by id", coordId, e);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch coordinators", err);
      }
    };

    // Diagnostics: print centralized user info and raw stored user when modal opens
    if (isOpen) {
      try {
        const infoOuter = (() => {
          try {
            return getUserInfo();
          } catch (e) {
            return null;
          }
        })();

        // eslint-disable-next-line no-console
        console.log("[CreateEventModal] getUserInfo():", infoOuter);
        const rawUserOuter =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_user")
            : null;

        // eslint-disable-next-line no-console
        console.log(
          "[CreateEventModal] raw unite_user (truncated):",
          rawUserOuter ? String(rawUserOuter).slice(0, 300) : null,
        );
      } catch (e) {
        /* ignore */
      }
      fetchCoordinators();
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (date) {
      const selected = new Date(date);

      selected.setHours(0, 0, 0, 0);
      const today = new Date();

      today.setHours(0, 0, 0, 0);
      if (selected.getTime() < today.getTime()) {
        setErrorMessage("Event date cannot be in the past");

        return;
      }
    }

    let startISO = "";
    let endISO = "";

    if (date) {
      const d = new Date(date);

      if (startTime) {
        const [sh, sm] = startTime.split(":").map((s) => parseInt(s, 10));

        d.setHours(sh || 0, sm || 0, 0, 0);
        startISO = d.toISOString();
      }
      if (endTime) {
        const e = new Date(date);
        const [eh, em] = endTime.split(":").map((s) => parseInt(s, 10));

        e.setHours(eh || 0, em || 0, 0, 0);
        endISO = e.toISOString();
      }
    }

    setErrorMessage(null);
    setFieldErrors({});

    const base: any = {
      eventTitle,
      coordinator,
      date: date ? new Date(date).toDateString() : "",
      startTime: startISO,
      endTime: endISO,
      eventDescription,
      location,
      email,
      contactNumber,
    };

    if (variant === "training") {
      base.trainingType = trainingType;
      base.numberOfParticipants = numberOfParticipants;
    } else if (variant === "blood-drive") {
      base.goalCount = goalCount;
    } else if (variant === "advocacy") {
      base.audienceType = audienceType;
      base.numberOfParticipants = numberOfParticipants;
    }

    // simple client-side validation for required fields used by backend
    const newFieldErrors: Record<string, string> = {};

    if (!base.eventTitle || !String(base.eventTitle).trim())
      newFieldErrors["eventTitle"] = "Event title is required.";
    if (!base.email || !String(base.email).trim())
      newFieldErrors["email"] = "Email is required.";
    else {
      // basic email format check
      const em = String(base.email).trim();

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))
        newFieldErrors["email"] = "Please enter a valid email address.";
    }
    if (!base.contactNumber || !String(base.contactNumber).trim())
      newFieldErrors["contactNumber"] = "Phone number is required.";

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setErrorMessage("Please fix the highlighted fields.");

      return;
    }

    // call parent handler and show inline errors if it fails
    setLocalSubmitting(true);
    try {
      await onConfirm(base);
    } catch (err: any) {
      // parse error message into friendly text
      const msg = err?.message || String(err || "Failed to create event");
      // look for Mongoose style "Path `Email` is required" occurrences
      const re = /Path `([^`]+)` is required/g;
      const missing: string[] = [];
      let m: RegExpExecArray | null;

      while ((m = re.exec(msg)) !== null) {
        const field = m[1];

        if (/email/i.test(field)) {
          missing.push("email");
          setFieldErrors((prev) => ({ ...prev, email: "Email is required." }));
        } else if (/phone|Phone_Number|PhoneNumber/i.test(field)) {
          missing.push("phone number");
          setFieldErrors((prev) => ({
            ...prev,
            contactNumber: "Phone number is required.",
          }));
        } else {
          missing.push(field);
          setFieldErrors((prev) => ({
            ...prev,
            [field]: `${field} is required.`,
          }));
        }
      }
      if (missing.length > 0) {
        setErrorMessage("Missing " + missing.join(" and "));
      } else {
        // fallback: present shorter english message
        setErrorMessage(
          msg
            .replace(/Path `([^`]+)` is required,?/g, "")
            .replace(/Event validation failed:?\s*/i, "")
            .trim() || "Failed to create event",
        );
      }
      setLocalSubmitting(false);

      return;
    } finally {
      setLocalSubmitting(false);
    }
  };

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
                variant === "training" ? (
                  <Person />
                ) : variant === "blood-drive" ? (
                  <Droplet />
                ) : (
                  <Megaphone />
                )
              }
            />
          </div>
          <h3 className="text-sm font-semibold py-2">
            {variant === "training"
              ? "Create a training event"
              : variant === "blood-drive"
                ? "Create a blood drive event"
                : "Create an advocacy event"}
          </h3>
          <p className="text-xs font-normal">
            Start providing your information by selecting your blood type. Add
            details below to proceed.
          </p>
        </ModalHeader>

        <ModalBody className="py-6">
          <div className="space-y-5">
            {errorMessage && (
              <div className="rounded-md bg-red-50 border border-red-100 p-3 text-sm text-red-800">
                {errorMessage}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium">Coordinator</label>
              {(() => {
                const rawUser =
                  typeof window !== "undefined"
                    ? localStorage.getItem("unite_user")
                    : null;
                const user = rawUser ? JSON.parse(rawUser) : null;
                const isAdmin = !!(
                  user &&
                  ((user.staff_type &&
                    String(user.staff_type).toLowerCase().includes("admin")) ||
                    (user.role &&
                      String(user.role).toLowerCase().includes("admin")))
                );

                if (isAdmin) {
                  return (
                    <Select
                      classNames={{
                        trigger: "border-default-200 h-9",
                      }}
                      placeholder="Select one"
                      radius="md"
                      selectedKeys={coordinator ? [coordinator] : []}
                      size="sm"
                      variant="bordered"
                      onSelectionChange={(keys) =>
                        setCoordinator(Array.from(keys)[0] as string)
                      }
                    >
                      {(coordinatorOptions.length
                        ? coordinatorOptions
                        : []
                      ).map((coord) => (
                        <SelectItem key={coord.key}>{coord.label}</SelectItem>
                      ))}
                    </Select>
                  );
                }

                const selected = coordinatorOptions[0];

                return (
                  <Input
                    disabled
                    classNames={{
                      inputWrapper: "border-default-200 h-9 bg-default-100",
                    }}
                    radius="md"
                    size="sm"
                    type="text"
                    value={selected?.label || ""}
                    variant="bordered"
                  />
                );
              })()}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">
                Event Title<span className="text-danger ml-1">*</span>
              </label>
              <Input
                classNames={{
                  inputWrapper: "border-default-200 h-9",
                }}
                placeholder="Enter event title"
                radius="md"
                size="sm"
                type="text"
                value={eventTitle}
                variant="bordered"
                onBlur={() => setTitleTouched(true)}
                onChange={(e) =>
                  setEventTitle((e.target as HTMLInputElement).value)
                }
              />
              {titleTouched && !eventTitle.trim() && (
                <p className="text-danger text-xs mt-1">
                  Event title is required.
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="col-span-1 space-y-1">
                <label className="text-xs font-medium">Date</label>
                <DatePicker
                  hideTimeZone
                  classNames={{
                    base: "w-full",
                    inputWrapper: "border-default-200 h-9",
                  }}
                  granularity="day"
                  radius="md"
                  size="sm"
                  value={date}
                  variant="bordered"
                  onChange={setDate}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Start time</label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
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
                <label className="text-xs font-medium">End time</label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
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

            {/* Variant-specific fields */}
            {variant === "training" && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Training Type</label>
                  <Input
                    classNames={{
                      inputWrapper: "border-default-200 h-9",
                    }}
                    placeholder="e.g. Basic Life Support"
                    radius="md"
                    size="sm"
                    type="text"
                    value={trainingType}
                    variant="bordered"
                    onChange={(e) => setTrainingType(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Participant Count
                  </label>
                  <Input
                    classNames={{
                      inputWrapper: "border-default-200 h-9",
                    }}
                    placeholder="200"
                    radius="md"
                    size="sm"
                    type="text"
                    value={numberOfParticipants}
                    variant="bordered"
                    onChange={(e) => setNumberOfParticipants(e.target.value)}
                  />
                </div>
              </div>
            )}
            {variant === "blood-drive" && (
              <div className="space-y-1">
                <label className="text-xs font-medium">Goal Count</label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
                  placeholder="e.g. 100"
                  radius="md"
                  size="sm"
                  type="text"
                  value={goalCount}
                  variant="bordered"
                  onChange={(e) => setGoalCount(e.target.value)}
                />
              </div>
            )}
            {variant === "advocacy" && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Audience Type</label>
                  <Input
                    classNames={{
                      inputWrapper: "border-default-200 h-9",
                    }}
                    placeholder="e.g. Students"
                    radius="md"
                    size="sm"
                    type="text"
                    value={audienceType}
                    variant="bordered"
                    onChange={(e) => setAudienceType(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Expected Audience
                  </label>
                  <Input
                    classNames={{
                      inputWrapper: "border-default-200 h-9",
                    }}
                    placeholder="200"
                    radius="md"
                    size="sm"
                    type="text"
                    value={numberOfParticipants}
                    variant="bordered"
                    onChange={(e) => setNumberOfParticipants(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium">Event Description</label>
              <Textarea
                classNames={{
                  inputWrapper: "border-default-200",
                }}
                minRows={4}
                placeholder="The event is about..."
                radius="md"
                size="sm"
                value={eventDescription}
                variant="bordered"
                onChange={(e) => setEventDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">
                Location<span className="text-danger ml-1">*</span>
              </label>
              <Input
                classNames={{
                  inputWrapper: "border-default-200 h-9",
                }}
                placeholder="Enter location"
                radius="md"
                size="sm"
                type="text"
                value={location}
                variant="bordered"
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            {/* Contact fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Email<span className="text-danger ml-1">*</span>
                </label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
                  placeholder="name@domain.com"
                  radius="md"
                  size="sm"
                  type="email"
                  value={email}
                  variant="bordered"
                  onChange={(e) =>
                    setEmail((e.target as HTMLInputElement).value)
                  }
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-600 mt-1">
                    {fieldErrors.email}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Phone<span className="text-danger ml-1">*</span>
                </label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
                  placeholder="e.g. +63 912 345 6789"
                  radius="md"
                  size="sm"
                  type="text"
                  value={contactNumber}
                  variant="bordered"
                  onChange={(e) =>
                    setContactNumber((e.target as HTMLInputElement).value)
                  }
                />
                {fieldErrors.contactNumber && (
                  <p className="text-xs text-red-600 mt-1">
                    {fieldErrors.contactNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
          {/* Parent/passed-in error message (display near bottom like campaign modal) */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-danger-50 border border-danger-200">
              <p className="text-sm text-danger font-medium">Error</p>
              <p className="text-sm text-danger-700 mt-1">{error}</p>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button className="font-medium" variant="bordered" onPress={onClose}>
            Cancel
          </Button>
          <Button
            aria-busy={!!(isSubmitting || localSubmitting)}
            className={`bg-black text-white font-medium ${!eventTitle.trim() || isSubmitting || localSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            color="default"
            disabled={!eventTitle.trim() || !!(isSubmitting || localSubmitting)}
            onPress={handleCreate}
          >
            {isSubmitting || localSubmitting ? "Creating..." : "Create Event"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export const CreateTrainingEventModal = (
  props: CreateTrainingEventModalProps,
) => <GenericCreateEventModal {...props} variant="training" />;
export const CreateBloodDriveEventModal = (
  props: CreateTrainingEventModalProps,
) => <GenericCreateEventModal {...props} variant="blood-drive" />;
export const CreateAdvocacyEventModal = (
  props: CreateTrainingEventModalProps,
) => <GenericCreateEventModal {...props} variant="advocacy" />;

export default function EventCreationModalsPlaceholder() {
  return null;
}
