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

// debug logger removed from demo
import { useEventUserData } from "@/hooks/useEventUserData";
import AppointmentDatePicker from "@/components/tools/appointment-date-picker";
import { getUserAuthority } from "@/utils/getUserAuthority";

interface CreateTrainingEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: TrainingEventData) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

interface TrainingEventData {
  coordinator: string;
  stakeholder?: string;
  eventTitle: string;
  trainingType: string;
  date: string;
  startTime?: string;
  endTime?: string;
  numberOfParticipants: string;
  eventDescription: string;
  location: string;
  email?: string;
  contactNumber?: string;
}

/**
 * CreateTrainingEventModal Component
 * Modal for creating a training event
 */
export const CreateTrainingEventModal: React.FC<
  CreateTrainingEventModalProps
> = ({ isOpen, onClose, onConfirm, isSubmitting, error }) => {
  const [eventTitle, setEventTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [trainingType, setTrainingType] = useState("");
  const [date, setDate] = useState<any>(null);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  // default times: 08:00 AM and 04:00 PM; inputs are editable by the user
  const [numberOfParticipants, setNumberOfParticipants] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [dateError, setDateError] = useState("");
  const [userAuthority, setUserAuthority] = useState<number | null>(null);
  const [isStakeholder, setIsStakeholder] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Use custom hook for all backend logic (coordinators, stakeholders, loading states)
  const {
    coordinator,
    coordinatorOptions,
    setCoordinator,
    loadingCoordinators,
    coordinatorError,
    stakeholder,
    stakeholderOptions,
    setStakeholder,
    loadingStakeholders,
    stakeholderError,
    isSysAdmin,
  } = useEventUserData(isOpen, API_URL);

  // All coordinator and stakeholder fetching logic is now handled by useEventUserData hook

  // Fetch user data to auto-fill email and phone, and determine if user is stakeholder
  useEffect(() => {
    if (isOpen) {
      const fetchUserData = async () => {
        try {
          const rawUser = typeof window !== "undefined" ? localStorage.getItem("unite_user") : null;
          const user = rawUser ? JSON.parse(rawUser) : null;
          const userId = user?.id || user?._id || null;
          
          if (!userId) return;

          // Get user authority to determine if stakeholder
          const authority = await getUserAuthority(userId);
          setUserAuthority(authority);
          setIsStakeholder(authority !== null && authority < 60);

          // Fetch full user data for email and phone
          const token = typeof window !== "undefined"
            ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
            : null;
          
          if (!token) return;

          const headers: HeadersInit = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          };

          const userRes = await fetch(`${API_URL}/api/users/${userId}`, {
            headers,
            credentials: "include",
          });

          if (userRes.ok) {
            const userData = await userRes.json();
            const userObj = userData.data || userData;
            
            // Auto-fill email and phone if not already set
            if (!email && userObj.email) {
              setEmail(userObj.email);
            }
            if (!contactNumber && userObj.phoneNumber) {
              setContactNumber(userObj.phoneNumber);
            } else if (!contactNumber && userObj.phone) {
              setContactNumber(userObj.phone);
            } else if (!contactNumber && userObj.contactNumber) {
              setContactNumber(userObj.contactNumber);
            }
          }
        } catch (err) {
          console.error("[CreateTrainingEventModal] Failed to fetch user data:", err);
        }
      };

      fetchUserData();
    }
  }, [isOpen, API_URL]);

  // Validate date when it changes
  useEffect(() => {
    if (date) {
      const selected = new Date(date);

      selected.setHours(0, 0, 0, 0);
      const today = new Date();

      today.setHours(0, 0, 0, 0);
      if (selected.getTime() < today.getTime()) {
        setDateError("Event date cannot be in the past");
      } else {
        setDateError("");
      }
    } else {
      setDateError("");
    }
  }, [date]);

  const handleCreate = () => {
    // Validate required fields
    if (!eventTitle.trim()) {
      setTitleTouched(true);
      return;
    }

    // Validate coordinator is set
    if (!coordinator || coordinator.trim() === "") {
      console.error("[handleCreate] Coordinator is required but not set");
      return;
    }

    // Check for date errors
    if (dateError) {
      return;
    }

    // Build ISO datetime strings if date and times are provided
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

    const eventData: TrainingEventData = {
      eventTitle,
      coordinator,
      stakeholder,
      trainingType,
      date: date ? new Date(date).toDateString() : "",
      startTime: startISO,
      endTime: endISO,
      numberOfParticipants,
      eventDescription,
      location,
      email,
      contactNumber,
    };

    onConfirm(eventData);
    // parent will close modal after create completes (to avoid closing before async create finishes)
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
              icon={<Person />}
            />
          </div>
          <h3 className="text-sm font-semibold py-2">
            Create a training event
          </h3>
          <p className="text-xs font-normal">
            Start providing your information by selecting your blood type. Add
            details below to proceed.
          </p>
        </ModalHeader>

        <ModalBody className="py-6">
          <div className="space-y-5">
            {/* Coordinator */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Coordinator</label>
              {/* Coordinator selection: admin -> dropdown, coordinator/stakeholder -> locked input */}
              {(() => {
                // Use isSysAdmin from hook (authority-based)
                if (isSysAdmin) {
                  // If there are no coordinator options at all, show a disabled message
                  const availableCount = (coordinatorOptions?.length || 0);

                  if (availableCount === 0) {
                    return (
                      <Input
                        disabled
                        classNames={{
                          inputWrapper: "border-default-200 h-9 bg-default-100",
                        }}
                        radius="md"
                        size="sm"
                        type="text"
                        value={"No coordinators available"}
                        variant="bordered"
                      />
                    );
                  }

                  return (
                    <Select
                      classNames={{
                        trigger:
                          "border-default-200 hover:border-default-400 h-10",
                        value: "text-sm",
                      }}
                      placeholder="Select one"
                      selectedKeys={coordinator ? [coordinator] : []}
                      variant="bordered"
                      onSelectionChange={(keys) =>
                        setCoordinator(Array.from(keys)[0] as string)
                      }
                    >
                      {coordinatorOptions.map((coord) => (
                        <SelectItem key={coord.key}>{coord.label}</SelectItem>
                      ))}
                    </Select>
                  );
                }

                // Non-admin: show locked input with coordinator full name if available
                if ((coordinatorOptions?.length || 0) === 0) {
                  return (
                    <Input
                      disabled
                      classNames={{
                        inputWrapper: "border-default-200 h-9 bg-default-100",
                      }}
                      radius="md"
                      size="sm"
                      type="text"
                      value={"No coordinators available"}
                      variant="bordered"
                    />
                  )
                }

                const selected = coordinatorOptions.find((c) => c.key === coordinator) || coordinatorOptions[0]

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

            {/* Stakeholder - appears immediately below Coordinator */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Stakeholder</label>
              {(() => {
                // Use authority-based check (not legacy fields)
                // Stakeholder = authority < 60
                if (isStakeholder) {
                  const selectedStakeholder = stakeholderOptions.find((s) => s.key === stakeholder) || stakeholderOptions[0];
                  const displayName = selectedStakeholder?.label || "Stakeholder";

                  return (
                    <Input
                      disabled
                      classNames={{
                        inputWrapper: "border-default-200 h-9 bg-default-100",
                      }}
                      radius="md"
                      size="sm"
                      type="text"
                      value={displayName}
                      variant="bordered"
                    />
                  );
                }

                if (!coordinator) {
                  return (
                    <Input
                      disabled
                      classNames={{
                        inputWrapper: "border-default-200 h-9 bg-default-100",
                      }}
                      radius="md"
                      size="sm"
                      type="text"
                      value={"Select a coordinator first"}
                      variant="bordered"
                    />
                  );
                }

                const available = stakeholderOptions.length;

                if (available === 0) {
                  return (
                    <Input
                      disabled
                      classNames={{
                        inputWrapper: "border-default-200 h-9 bg-default-100",
                      }}
                      radius="md"
                      size="sm"
                      type="text"
                      value={"No stakeholders available"}
                      variant="bordered"
                    />
                  );
                }

                return (
                  <Select
                    classNames={{
                      trigger: "border-default-200 h-9",
                    }}
                    placeholder="Select one (optional)"
                    radius="md"
                    selectedKeys={stakeholder ? [stakeholder] : []}
                    size="sm"
                    variant="bordered"
                    onSelectionChange={(keys) =>
                      setStakeholder(Array.from(keys)[0] as string)
                    }
                  >
                    {stakeholderOptions.map((s) => (
                      <SelectItem key={s.key}>{s.label}</SelectItem>
                    ))}
                  </Select>
                );
              })()}
            </div>

            {/* (duplicate Stakeholder removed) */}

            {/* Event Title */}
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Event Title
                <span className="text-danger ml-1">*</span>
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

            {/* Type of training */}
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Type of training
                <span className="text-danger ml-1">*</span>
              </label>
              <Input
                classNames={{
                  inputWrapper: "border-default-200 h-9",
                }}
                placeholder="e.g. Basic Life Support, Infection Control"
                radius="md"
                size="sm"
                type="text"
                value={trainingType}
                variant="bordered"
                onChange={(e) => setTrainingType(e.target.value)}
              />
            </div>

            {/* Date */}
            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="col-span-1 space-y-1">
                <label className="text-xs font-medium">Date</label>
                {isSysAdmin ? (
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
                ) : (
                  <AppointmentDatePicker
                    value={date}
                    onChange={setDate}
                  />
                )}
                {dateError && (
                  <p className="text-danger text-xs mt-1">{dateError}</p>
                )}
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

            {/* Max participants */}
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Max participants
                <span className="text-danger ml-1">*</span>
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

            {/* Event Description */}
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

            {/* Location */}
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Location
                <span className="text-danger ml-1">*</span>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Contact Email<span className="text-danger ml-1">*</span>
                </label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
                  placeholder="email@example.com"
                  radius="md"
                  size="sm"
                  type="email"
                  value={email}
                  variant="bordered"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Contact Number<span className="text-danger ml-1">*</span>
                </label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
                  placeholder="09xxxxxxxxx"
                  radius="md"
                  size="sm"
                  type="tel"
                  value={contactNumber}
                  variant="bordered"
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </div>
            </div>
          </div>
          {/* Error Message Display - at bottom of modal body */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-danger-50 border border-danger-200">
              <p className="text-sm text-danger font-medium">Error</p>
              <p className="text-sm text-danger-700 mt-1">{error}</p>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button className="font-medium" variant="bordered" radius="md" onPress={onClose}>
            Cancel
          </Button>
          <Button
            aria-busy={!!isSubmitting}
            className={`bg-black text-white font-medium ${!eventTitle.trim() || !coordinator || dateError || isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            color="default"
            disabled={!eventTitle.trim() || !coordinator || !!dateError || !!isSubmitting}
            onPress={handleCreate}
          >
            {isSubmitting ? "Creating..." : "Create Event"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

interface CreateBloodDriveEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: BloodDriveEventData) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

interface BloodDriveEventData {
  coordinator: string;
  stakeholder?: string;
  eventTitle: string;
  date: string;
  startTime?: string;
  endTime?: string;
  goalCount: string;
  eventDescription: string;
  location: string;
  email?: string;
  contactNumber?: string;
}

/**
 * CreateBloodDriveEventModal Component
 * Modal for creating a blood drive event
 */
export const CreateBloodDriveEventModal: React.FC<
  CreateBloodDriveEventModalProps
> = ({ isOpen, onClose, onConfirm, isSubmitting, error }) => {
  const [eventTitle, setEventTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [date, setDate] = useState<any>(null);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [goalCount, setGoalCount] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [dateError, setDateError] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Use custom hook for all backend logic (coordinators, stakeholders, loading states)
  const {
    coordinator,
    coordinatorOptions,
    setCoordinator,
    loadingCoordinators,
    coordinatorError,
    stakeholder,
    stakeholderOptions,
    setStakeholder,
    loadingStakeholders,
    stakeholderError,
    isSysAdmin,
  } = useEventUserData(isOpen, API_URL);

  // All coordinator and stakeholder fetching logic is now handled by useEventUserData hook

  // Validate date when it changes
  useEffect(() => {
    if (date) {
      const selected = new Date(date);

      selected.setHours(0, 0, 0, 0);
      const today = new Date();

      today.setHours(0, 0, 0, 0);
      if (selected.getTime() < today.getTime()) {
        setDateError("Event date cannot be in the past");
      } else {
        setDateError("");
      }
    } else {
      setDateError("");
    }
  }, [date]);

  const handleCreate = () => {
    // Validate required fields
    if (!eventTitle.trim()) {
      setTitleTouched(true);

      return;
    }

    // Check for date errors
    if (dateError) {
      return;
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

    const eventData: BloodDriveEventData = {
      eventTitle,
      coordinator,
      stakeholder,
      date: date ? new Date(date).toDateString() : "",
      startTime: startISO,
      endTime: endISO,
      goalCount,
      eventDescription,
      location,
      email,
      contactNumber,
    };

    onConfirm(eventData);
    // parent will close modal after create completes
  };

  // isSysAdmin is now handled by useEventUserData hook

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
              icon={<Droplet />}
            />
          </div>
          <h3 className="text-sm font-semibold py-2">
            Create a blood drive event
          </h3>
          <p className="text-xs font-normal">
            Start providing your information by selecting your blood type. Add
            details below to proceed.
          </p>
        </ModalHeader>

        <ModalBody className="py-6">
          <div className="space-y-5">
            {/* Coordinator */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Coordinator</label>
              {loadingCoordinators ? (
                <Input disabled value="Loading coordinators..." variant="bordered" />
              ) : coordinatorError ? (
                <Input disabled value={`Error: ${coordinatorError}`} variant="bordered" />
              ) : isSysAdmin ? (
                <Select
                  classNames={{ trigger: "border-default-200 hover:border-default-400 h-10", value: "text-sm" }}
                  placeholder="Select one"
                  selectedKeys={coordinator ? [coordinator] : []}
                  variant="bordered"
                  onSelectionChange={(keys) => setCoordinator(Array.from(keys)[0] as string)}
                >
                  {coordinatorOptions.map((coord) => (
                    <SelectItem key={coord.key}>{coord.label}</SelectItem>
                  ))}
                </Select>
              ) : (
                <Input
                  disabled
                  classNames={{ inputWrapper: "border-default-200 h-9 bg-default-100" }}
                  radius="md"
                  size="sm"
                  type="text"
                  value={coordinatorOptions.find((c) => c.key === coordinator)?.label || "No coordinators available"}
                  variant="bordered"
                />
              )}
            </div>

            {/* Stakeholder - appears immediately below Coordinator */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Stakeholder</label>
              {loadingStakeholders ? (
                <Input disabled value="Loading stakeholders..." variant="bordered" />
              ) : stakeholderError ? (
                <Input disabled value={`Error: ${stakeholderError}`} variant="bordered" />
              ) : isSysAdmin || (coordinator && coordinatorOptions.length > 0) ? (
                <Select
                  classNames={{ trigger: "border-default-200 hover:border-default-400 h-10", value: "text-sm" }}
                  placeholder="Select one"
                  selectedKeys={stakeholder ? [stakeholder] : []}
                  variant="bordered"
                  onSelectionChange={(keys) => setStakeholder(Array.from(keys)[0] as string)}
                  isDisabled={!coordinator}
                >
                  {stakeholderOptions.map((s) => (
                    <SelectItem key={s.key}>{s.label}</SelectItem>
                  ))}
                </Select>
              ) : (
                <Input
                  disabled
                  classNames={{ inputWrapper: "border-default-200 h-9 bg-default-100" }}
                  radius="md"
                  size="sm"
                  type="text"
                  value={stakeholderOptions.find((s) => s.key === stakeholder)?.label || "No stakeholders available"}
                  variant="bordered"
                />
              )}
            </div>

            {/* Event Title */}
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Event Title
                <span className="text-danger ml-1">*</span>
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
                {isSysAdmin ? (
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
                ) : (
                  <AppointmentDatePicker
                    value={date}
                    onChange={setDate}
                  />
                )}
                {dateError && (
                  <p className="text-danger text-xs mt-1">{dateError}</p>
                )}
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

            {/* Goal Count */}
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Goal Count
                <span className="text-danger ml-1">*</span>
              </label>
              <Input
                classNames={{
                  inputWrapper: "border-default-200 h-9",
                }}
                placeholder="Enter goal count"
                radius="md"
                size="sm"
                type="text"
                value={goalCount}
                variant="bordered"
                onChange={(e) => setGoalCount(e.target.value)}
              />
            </div>

            {/* Event Description */}
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

            {/* Location */}
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Location
                <span className="text-danger ml-1">*</span>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Contact Email<span className="text-danger ml-1">*</span>
                </label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
                  placeholder="email@example.com"
                  radius="md"
                  size="sm"
                  type="email"
                  value={email}
                  variant="bordered"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Contact Number<span className="text-danger ml-1">*</span>
                </label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
                  placeholder="09xxxxxxxxx"
                  radius="md"
                  size="sm"
                  type="tel"
                  value={contactNumber}
                  variant="bordered"
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </div>
            </div>
          </div>
          {/* Error Message Display - at bottom of modal body */}
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
            aria-busy={!!isSubmitting}
            className={`bg-black text-white font-medium ${!eventTitle.trim() || dateError || isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            color="default"
            disabled={!eventTitle.trim() || !!dateError || !!isSubmitting}
            onPress={handleCreate}
          >
            {isSubmitting ? "Creating..." : "Create Event"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

interface CreateAdvocacyEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: AdvocacyEventData) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

interface AdvocacyEventData {
  coordinator: string;
  stakeholder?: string;
  eventTitle: string;
  audienceType: string;
  date: string;
  startTime?: string;
  endTime?: string;
  numberOfParticipants: string;
  eventDescription: string;
  location: string;
  email?: string;
  contactNumber?: string;
}

/**
 * CreateAdvocacyEventModal Component
 * Modal for creating an advocacy event
 */
export const CreateAdvocacyEventModal: React.FC<
  CreateAdvocacyEventModalProps
> = ({ isOpen, onClose, onConfirm, isSubmitting, error }) => {
  const [eventTitle, setEventTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [audienceType, setAudienceType] = useState("");
  const [date, setDate] = useState<any>(null);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [numberOfParticipants, setNumberOfParticipants] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [dateError, setDateError] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Use custom hook for all backend logic (coordinators, stakeholders, loading states)
  const {
    coordinator,
    coordinatorOptions,
    setCoordinator,
    loadingCoordinators,
    coordinatorError,
    stakeholder,
    stakeholderOptions,
    setStakeholder,
    loadingStakeholders,
    stakeholderError,
    isSysAdmin,
  } = useEventUserData(isOpen, API_URL);

  // All coordinator and stakeholder fetching logic is now handled by useEventUserData hook

  // Validate date when it changes
  useEffect(() => {
    if (date) {
      const selected = new Date(date);

      selected.setHours(0, 0, 0, 0);
      const today = new Date();

      today.setHours(0, 0, 0, 0);
      if (selected.getTime() < today.getTime()) {
        setDateError("Event date cannot be in the past");
      } else {
        setDateError("");
      }
    } else {
      setDateError("");
    }
  }, [date]);

  // audienceTypes list is kept for suggestions but we will allow free input
  const audienceTypes = [
    { key: "students", label: "Students" },
    { key: "professionals", label: "Professionals" },
    { key: "general", label: "General Public" },
  ];

  const handleCreate = () => {
    // Validate required fields
    if (!eventTitle.trim()) {
      setTitleTouched(true);

      return;
    }

    // Check for date errors
    if (dateError) {
      return;
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

    const eventData: AdvocacyEventData = {
      eventTitle,
      coordinator,
      stakeholder,
      audienceType,
      date: date ? new Date(date).toDateString() : "",
      startTime: startISO,
      endTime: endISO,
      numberOfParticipants,
      eventDescription,
      location,
      email,
      contactNumber,
    };

    onConfirm(eventData);
    // parent will close modal after create completes
  };

  // isSysAdmin is now handled by useEventUserData hook

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
              icon={<Megaphone />}
            />
          </div>
          <h3 className="text-sm font-semibold py-2">
            Create an advocacy event
          </h3>
          <p className="text-xs font-normal">
            Start providing your information by selecting your blood type. Add
            details below to proceed.
          </p>
        </ModalHeader>

        <ModalBody className="py-6">
          <div className="space-y-5">
            {/* Coordinator */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Coordinator</label>
              {loadingCoordinators ? (
                <Input disabled value="Loading coordinators..." variant="bordered" />
              ) : coordinatorError ? (
                <Input disabled value={`Error: ${coordinatorError}`} variant="bordered" />
              ) : isSysAdmin ? (
                <Select
                  classNames={{ trigger: "border-default-200 hover:border-default-400 h-10", value: "text-sm" }}
                  placeholder="Select one"
                  selectedKeys={coordinator ? [coordinator] : []}
                  variant="bordered"
                  onSelectionChange={(keys) => setCoordinator(Array.from(keys)[0] as string)}
                >
                  {coordinatorOptions.map((coord) => (
                    <SelectItem key={coord.key}>{coord.label}</SelectItem>
                  ))}
                </Select>
              ) : (
                <Input
                  disabled
                  classNames={{ inputWrapper: "border-default-200 h-9 bg-default-100" }}
                  radius="md"
                  size="sm"
                  type="text"
                  value={coordinatorOptions.find((c) => c.key === coordinator)?.label || "No coordinators available"}
                  variant="bordered"
                />
              )}
            </div>

            {/* Stakeholder - appears immediately below Coordinator */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Stakeholder</label>
              {loadingStakeholders ? (
                <Input disabled value="Loading stakeholders..." variant="bordered" />
              ) : stakeholderError ? (
                <Input disabled value={`Error: ${stakeholderError}`} variant="bordered" />
              ) : isSysAdmin || (coordinator && coordinatorOptions.length > 0) ? (
                <Select
                  classNames={{ trigger: "border-default-200 hover:border-default-400 h-10", value: "text-sm" }}
                  placeholder="Select one"
                  selectedKeys={stakeholder ? [stakeholder] : []}
                  variant="bordered"
                  onSelectionChange={(keys) => setStakeholder(Array.from(keys)[0] as string)}
                  isDisabled={!coordinator}
                >
                  {stakeholderOptions.map((s) => (
                    <SelectItem key={s.key}>{s.label}</SelectItem>
                  ))}
                </Select>
              ) : (
                <Input
                  disabled
                  classNames={{ inputWrapper: "border-default-200 h-9 bg-default-100" }}
                  radius="md"
                  size="sm"
                  type="text"
                  value={stakeholderOptions.find((s) => s.key === stakeholder)?.label || "No stakeholders available"}
                  variant="bordered"
                />
              )}
            </div>

            {/* Event Title */}
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Event Title
                <span className="text-danger ml-1">*</span>
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

            {/* Audience Type (free input) */}
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Audience Type
                <span className="text-danger ml-1">*</span>
              </label>
              <Input
                classNames={{
                  inputWrapper: "border-default-200 h-9",
                }}
                placeholder="e.g. Students, Farmers, Community Members"
                radius="md"
                size="sm"
                type="text"
                value={audienceType}
                variant="bordered"
                onChange={(e) => setAudienceType(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="col-span-1 space-y-1">
                <label className="text-xs font-medium">Date</label>
                {isSysAdmin ? (
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
                ) : (
                  <AppointmentDatePicker
                    value={date}
                    onChange={setDate}
                  />
                )}
                {dateError && (
                  <p className="text-danger text-xs mt-1">{dateError}</p>
                )}
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

            {/* Target number of audience */}
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Target number of audience
                <span className="text-danger ml-1">*</span>
              </label>
              <Input
                classNames={{
                  inputWrapper: "border-default-200 h-9",
                }}
                placeholder="e.g. 200"
                radius="md"
                size="sm"
                type="text"
                value={numberOfParticipants}
                variant="bordered"
                onChange={(e) => setNumberOfParticipants(e.target.value)}
              />
            </div>

            {/* Event Description */}
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

            {/* Location */}
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Location
                <span className="text-danger ml-1">*</span>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Contact Email<span className="text-danger ml-1">*</span>
                </label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
                  placeholder="email@example.com"
                  radius="md"
                  size="sm"
                  type="email"
                  value={email}
                  variant="bordered"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Contact Number<span className="text-danger ml-1">*</span>
                </label>
                <Input
                  classNames={{
                    inputWrapper: "border-default-200 h-9",
                  }}
                  placeholder="09xxxxxxxxx"
                  radius="md"
                  size="sm"
                  type="tel"
                  value={contactNumber}
                  variant="bordered"
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </div>
            </div>
          </div>
          {/* Error Message Display - at bottom of modal body */}
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
            aria-busy={!!isSubmitting}
            className={`bg-black text-white font-medium ${!eventTitle.trim() || dateError || isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            color="default"
            disabled={!eventTitle.trim() || !!dateError || !!isSubmitting}
            onPress={handleCreate}
          >
            {isSubmitting ? "Creating..." : "Create Event"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

/**
 * Demo Component showing all event creation modals
 * Remove this in production - only for demonstration
 */
export default function EventCreationModalsDemo() {
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [bloodDriveOpen, setBloodDriveOpen] = useState(false);
  const [advocacyOpen, setAdvocacyOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold mb-4">Event Creation Modals</h1>

      <div className="flex flex-wrap gap-3">
        <Button color="primary" onPress={() => setTrainingOpen(true)}>
          Create Training Event
        </Button>
        <Button color="danger" onPress={() => setBloodDriveOpen(true)}>
          Create Blood Drive Event
        </Button>
        <Button color="success" onPress={() => setAdvocacyOpen(true)}>
          Create Advocacy Event
        </Button>
      </div>

      <CreateTrainingEventModal
        isOpen={trainingOpen}
        onClose={() => setTrainingOpen(false)}
        onConfirm={(data) => {
          // no-op: demo handler removed logging
        }}
      />

      <CreateBloodDriveEventModal
        isOpen={bloodDriveOpen}
        onClose={() => setBloodDriveOpen(false)}
        onConfirm={(data) => {
          // no-op: demo handler removed logging
        }}
      />

      <CreateAdvocacyEventModal
        isOpen={advocacyOpen}
        onClose={() => setAdvocacyOpen(false)}
        onConfirm={(data) => {
          // no-op: demo handler removed logging
        }}
      />
    </div>
  );
}
