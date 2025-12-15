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
import { getUserInfo } from "@/utils/getUserInfo";
import { decodeJwt } from "@/utils/decodeJwt";
import AppointmentDatePicker from "@/components/tools/appointment-date-picker";

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
  const [coordinator, setCoordinator] = useState("");
  const [stakeholder, setStakeholder] = useState("");
  const [stakeholderOptions, setStakeholderOptions] = useState<
    { key: string; label: string }[]
  >([]);
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
  // no placeholder coordinators; real options come from `coordinatorOptions`
  const coordinators: { key: string; label: string }[] = [];

  const [coordinatorOptions, setCoordinatorOptions] = useState<
    { key: string; label: string }[]
  >([]);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const [isSysAdmin, setIsSysAdmin] = useState(false);

  // Load stakeholders for selected coordinator's district when coordinator changes
  useEffect(() => {
    const fetchStakeholdersForCoordinator = async () => {
      try {
        if (!coordinator) {
          setStakeholderOptions([]);

          return;
        }

        const token =
          localStorage.getItem("unite_token") ||
          sessionStorage.getItem("unite_token");
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Fetch coordinator details to get district id
        let districtId: any = null;

        try {
          const coordRes = await fetch(
            `${API_URL}/api/coordinators/${encodeURIComponent(coordinator)}`,
            { headers, credentials: "include" },
          );
          const coordBody = await coordRes.json();

          const coordData = coordBody?.data || coordBody;

          districtId =
            coordData?.District_ID ||
            coordData?.District?.District_ID ||
            coordData?.District_Id ||
            coordData?.district_id ||
            coordData?.district ||
            null;
        } catch (e) {
          // ignore
        }

        if (!districtId) {
          setStakeholderOptions([]);

          return;
        }

        const stRes = await fetch(
          `${API_URL}/api/stakeholders?district_id=${encodeURIComponent(String(districtId))}`,
          { headers, credentials: "include" },
        );
        const stBody = await stRes.json();

        if (stRes.ok && Array.isArray(stBody.data)) {
          const opts = (stBody.data || []).map((s: any) => ({
            key: s.Stakeholder_ID || s.StakeholderId || s.id,
            label:
              `${s.firstName || s.First_Name || ""} ${s.lastName || s.Last_Name || ""}`.trim(),
          }));

          setStakeholderOptions(opts);
          if (stakeholder && !opts.find((o: any) => o.key === stakeholder)) {
            setStakeholder("");
          }
        } else {
          setStakeholderOptions([]);
        }
      } catch (err) {
        console.warn("Failed to load stakeholders", err);
        setStakeholderOptions([]);
      }
    };

    fetchStakeholdersForCoordinator();
  }, [coordinator]);

  useEffect(() => {
    // fetch coordinators when modal opens - robust handling for admin/coordinator/stakeholder
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

        const isAdmin = !!(
          (info && info.isAdmin) ||
          (user &&
            ((user.staff_type &&
              String(user.staff_type).toLowerCase().includes("admin")) ||
              (user.role && String(user.role).toLowerCase().includes("admin"))))
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

            // Prefill stakeholder field if the authenticated user is a stakeholder
            try {
              const raw = localStorage.getItem("unite_user");
              const u = raw ? JSON.parse(raw) : null;
              const roleStr = String(
                u?.staff_type || u?.role || "",
              ).toLowerCase();

              if (u && roleStr.includes("stakeholder")) {
                const sid = u.Stakeholder_ID || u.StakeholderId || u.id;

                if (sid) {
                  setStakeholder(String(sid));
                  setStakeholderOptions([
                    {
                      key: String(sid),
                      label:
                        `${u.firstName || u.First_Name || ""} ${u.lastName || u.Last_Name || ""}`.trim(),
                    },
                  ]);
                }
              }
            } catch (e) {}

            return;
          }
        }

        // Special handling for stakeholders: auto-select their coordinator and themselves
        const roleStr = String(
          info?.role || user?.staff_type || user?.role || "",
        ).toLowerCase();

        // diagnostic removed
        if (
          user &&
          (user.Stakeholder_ID ||
            (user.id && user.id.toLowerCase().startsWith("stkh_")))
        ) {
          const sid =
            info?.raw?.id ||
            user.Stakeholder_ID ||
            user.StakeholderId ||
            user.id;

          // diagnostic removed
          if (sid) {
            try {
              const stRes = await fetch(
                `${API_URL}/api/stakeholders/${encodeURIComponent(sid)}`,
                { headers, credentials: "include" },
              );
              const stBody = await stRes.json();

              // diagnostic removed
              if (stRes.ok && stBody.data) {
                const st = stBody.data;
                const districtId = st.district;

                // diagnostic removed
                if (districtId) {
                  const coordRes = await fetch(
                    `${API_URL}/api/coordinators?district_id=${encodeURIComponent(districtId)}`,
                    { headers, credentials: "include" },
                  );
                  const coordBody = await coordRes.json();

                  // diagnostic removed
                  if (
                    coordRes.ok &&
                    coordBody.data &&
                    Array.isArray(coordBody.data) &&
                    coordBody.data.length > 0
                  ) {
                    const coordOpts = coordBody.data.map((c: any) => {
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

                    setCoordinatorOptions(coordOpts);
                    if (coordOpts.length > 0) {
                      setCoordinator(coordOpts[0].key);
                    }
                  } else {
                    console.error(
                      "No coordinators found for district:",
                      districtId,
                    );
                  }
                } else {
                  console.error("No district ID found for stakeholder");
                }
                // Set stakeholder to themselves
                setStakeholder(String(sid));
                setStakeholderOptions([
                  {
                    key: String(sid),
                    label:
                      `${st.firstName || st.First_Name || ""} ${st.lastName || st.Last_Name || ""}`.trim(),
                  },
                ]);
                // diagnostic removed
              }
            } catch (e) {
              console.error("Failed to fetch for stakeholder", e);
            }
          }

          return;
        }

        // non-admin flows: try to derive coordinator id from user or token
        if (user) {
          const candidateIds: Array<string | number | undefined> = [];

          if (
            (user.staff_type &&
              String(user.staff_type).toLowerCase().includes("coordinator")) ||
            (info &&
              String(info.role || "")
                .toLowerCase()
                .includes("coordinator"))
          )
            candidateIds.push(user.id || info?.raw?.id);
          candidateIds.push(
            user.Coordinator_ID,
            user.CoordinatorId,
            user.CoordinatorID,
            user.role_data?.coordinator_id,
            user.MadeByCoordinatorID,
            info?.raw?.Coordinator_ID,
            info?.raw?.CoordinatorId,
          );

          let coordId = candidateIds.find(Boolean) as string | undefined;

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
            } catch (e) {
              /* ignore */
            }
          }

          if (coordId) {
            try {
              let resolvedCoordId = String(coordId);

              if (/^stkh_/i.test(resolvedCoordId)) {
                // try to resolve stakeholder -> coordinator id; if that fails, fall back to any Coordinator_ID present
                let resolvedFromStakeholder = false;

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
                    resolvedFromStakeholder = !!(
                      stakeholder.Coordinator_ID ||
                      stakeholder.CoordinatorId ||
                      stakeholder.coordinator_id
                    );
                  }
                } catch (e) {
                  console.warn(
                    "Failed to fetch stakeholder to resolve coordinator id",
                    resolvedCoordId,
                    e,
                  );
                }

                if (!resolvedFromStakeholder) {
                  // try local user fields and token payload for coordinator id
                  const fallback =
                    user?.Coordinator_ID ||
                    user?.CoordinatorId ||
                    user?.CoordinatorId ||
                    info?.raw?.Coordinator_ID ||
                    info?.raw?.CoordinatorId;

                  if (fallback) {
                    resolvedCoordId = fallback;
                  } else {
                    // nothing to resolve - bail out early
                    return;
                  }
                }
              }

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

                return;
              }
            } catch (e) {
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

        // diagnostic removed
        const rawUserOuter =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_user")
            : null;

        // diagnostic removed
      } catch (e) {
        /* ignore */
      }
      fetchCoordinators();
    }
  }, [isOpen]);

  // Set isSysAdmin based on user role
  useEffect(() => {
    if (isOpen) {
      const rawUser = localStorage.getItem("unite_user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      const info = (() => {
        try {
          return getUserInfo();
        } catch (e) {
          return null;
        }
      })();

      const isAdmin = !!(
        (info && info.isAdmin) ||
        (user &&
          ((user.staff_type &&
            String(user.staff_type).toLowerCase().includes("admin")) ||
            (user.role && String(user.role).toLowerCase().includes("admin"))))
      );

      setIsSysAdmin(isAdmin);
    }
  }, [isOpen]);

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
                // determine user role robustly (handle different shapes/casing)
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
                const rawUser =
                  typeof window !== "undefined"
                    ? localStorage.getItem("unite_user")
                    : null;
                const user = rawUser ? JSON.parse(rawUser) : null;
                const isStakeholder = !!(
                  user?.Stakeholder_ID ||
                  (user?.id && user.id.toLowerCase().startsWith("stkh_"))
                );

                if (isStakeholder) {
                  const fullName =
                    `${user?.firstName || user?.First_Name || ""} ${user?.lastName || user?.Last_Name || ""}`.trim();

                  return (
                    <Input
                      disabled
                      classNames={{
                        inputWrapper: "border-default-200 h-9 bg-default-100",
                      }}
                      radius="md"
                      size="sm"
                      type="text"
                      value={fullName || "Stakeholder"}
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
  const [coordinator, setCoordinator] = useState("");
  const [stakeholder, setStakeholder] = useState("");
  const [stakeholderOptions, setStakeholderOptions] = useState<
    { key: string; label: string }[]
  >([]);
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
  const [isSysAdmin, setIsSysAdmin] = useState(false);

  const coordinators = [
    { key: "john", label: "John Doe" },
    { key: "jane", label: "Jane Smith" },
    { key: "bob", label: "Bob Johnson" },
  ];

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

        const isAdmin = !!(
          (info && info.isAdmin) ||
          (user &&
            ((user.staff_type &&
              String(user.staff_type).toLowerCase().includes("admin")) ||
              (user.role && String(user.role).toLowerCase().includes("admin"))))
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

            return;
          }
        }

        // Special handling for stakeholders: auto-select their coordinator and themselves
        const roleStr = String(
          info?.role || user?.staff_type || user?.role || "",
        ).toLowerCase();

        // diagnostic removed
        if (
          user &&
          (user.Stakeholder_ID ||
            (user.id && user.id.toLowerCase().startsWith("stkh_")))
        ) {
          const sid =
            info?.raw?.id ||
            user.Stakeholder_ID ||
            user.StakeholderId ||
            user.id;

          // diagnostic removed
          if (sid) {
            try {
              const stRes = await fetch(
                `${API_URL}/api/stakeholders/${encodeURIComponent(sid)}`,
                { headers, credentials: "include" },
              );
              const stBody = await stRes.json();

              // diagnostic removed
              if (stRes.ok && stBody.data) {
                const st = stBody.data;
                const districtId = st.district;

                // diagnostic removed
                if (districtId) {
                  const coordRes = await fetch(
                    `${API_URL}/api/coordinators?district_id=${encodeURIComponent(districtId)}`,
                    { headers, credentials: "include" },
                  );
                  const coordBody = await coordRes.json();

                  // diagnostic removed
                  if (
                    coordRes.ok &&
                    coordBody.data &&
                    Array.isArray(coordBody.data) &&
                    coordBody.data.length > 0
                  ) {
                    const coordOpts = coordBody.data.map((c: any) => {
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

                    setCoordinatorOptions(coordOpts);
                      if (coordOpts.length > 0) {
                      setCoordinator(coordOpts[0].key);
                    }
                  } else {
                    console.error(
                      "No coordinators found for district:",
                      districtId,
                    );
                  }
                } else {
                  console.error("No district ID found for stakeholder");
                }
                // Set stakeholder to themselves
                setStakeholder(String(sid));
                setStakeholderOptions([
                  {
                    key: String(sid),
                    label:
                      `${st.firstName || st.First_Name || ""} ${st.lastName || st.Last_Name || ""}`.trim(),
                  },
                ]);
                console.log("Set stakeholder for stakeholder user");
              }
            } catch (e) {
              console.error("Failed to fetch for stakeholder", e);
            }
          }

          return;
        }

        if (user) {
          const candidateIds: Array<string | number | undefined> = [];

          if (
            (user.staff_type &&
              String(user.staff_type).toLowerCase().includes("coordinator")) ||
            (info &&
              String(info.role || "")
                .toLowerCase()
                .includes("coordinator"))
          )
            candidateIds.push(user.id || info?.raw?.id);
          candidateIds.push(
            user.Coordinator_ID,
            user.CoordinatorId,
            user.CoordinatorID,
            user.role_data?.coordinator_id,
            user.MadeByCoordinatorID,
            info?.raw?.Coordinator_ID,
            info?.raw?.CoordinatorId,
          );

          let coordId = candidateIds.find(Boolean) as string | undefined;

          if (!coordId) {
            try {
              const t =
                token ||
                (typeof window !== "undefined"
                  ? localStorage.getItem("unite_token") ||
                    sessionStorage.getItem("unite_token")
                  : null);
              const payload = decodeJwt(t);

              if (payload)
                coordId =
                  payload.id ||
                  payload.ID ||
                  payload.Coordinator_ID ||
                  payload.coordinator_id ||
                  coordId;
            } catch (e) {}
          }

          if (coordId) {
            try {
              let resolvedCoordId = String(coordId);

              if (/^stkh_/i.test(resolvedCoordId)) {
                // try to resolve stakeholder -> coordinator id; if that fails, fall back to any Coordinator_ID present
                let resolvedFromStakeholder = false;

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
                    resolvedFromStakeholder = !!(
                      stakeholder.Coordinator_ID ||
                      stakeholder.CoordinatorId ||
                      stakeholder.coordinator_id
                    );
                  }
                } catch (e) {
                  console.warn(
                    "Failed to fetch stakeholder to resolve coordinator id",
                    resolvedCoordId,
                    e,
                  );
                }

                if (!resolvedFromStakeholder) {
                  // try local user fields and token payload for coordinator id
                  const fallback =
                    user?.Coordinator_ID ||
                    user?.CoordinatorId ||
                    user?.CoordinatorID ||
                    info?.raw?.Coordinator_ID ||
                    info?.raw?.CoordinatorId;

                  if (fallback) {
                    resolvedCoordId = fallback;
                  } else {
                    // nothing to resolve - bail out early
                    return;
                  }
                }
              }

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
                // If current auth user is a stakeholder, prefill stakeholder values
                try {
                  const raw = localStorage.getItem("unite_user");
                  const u = raw ? JSON.parse(raw) : null;
                  const roleStr = String(
                    u?.staff_type || u?.role || "",
                  ).toLowerCase();

                  if (u && roleStr.includes("stakeholder")) {
                    const sid = u.Stakeholder_ID || u.StakeholderId || u.id;

                    if (sid) {
                      setStakeholder(String(sid));
                      setStakeholderOptions([
                        {
                          key: String(sid),
                          label:
                            `${u.firstName || u.First_Name || ""} ${u.lastName || u.Last_Name || ""}`.trim(),
                        },
                      ]);
                    }
                  }
                } catch (e) {}
                setCoordinator(coord?.Coordinator_ID || resolvedCoordId);
              }
            } catch (e) {
              console.error("Failed to fetch coordinator by id", coordId, e);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch coordinators", err);
      }
    };

    if (isOpen) fetchCoordinators();
  }, [isOpen]);

  // Load stakeholders for selected coordinator's district when coordinator changes
  useEffect(() => {
    const fetchStakeholdersForCoordinator = async () => {
      try {
        if (!coordinator) {
          setStakeholderOptions([]);

          return;
        }

        const token =
          localStorage.getItem("unite_token") ||
          sessionStorage.getItem("unite_token");
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Fetch coordinator details to get district id
        let districtId: any = null;

        try {
          const coordRes = await fetch(
            `${API_URL}/api/coordinators/${encodeURIComponent(coordinator)}`,
            { headers, credentials: "include" },
          );
          const coordBody = await coordRes.json();

          const coordData = coordBody?.data || coordBody;

          districtId =
            coordData?.District_ID ||
            coordData?.District?.District_ID ||
            coordData?.District_Id ||
            coordData?.district_id ||
            coordData?.district ||
            null;
        } catch (e) {
          // ignore
        }

        if (!districtId) {
          setStakeholderOptions([]);

          return;
        }

        const stRes = await fetch(
          `${API_URL}/api/stakeholders?district_id=${encodeURIComponent(String(districtId))}`,
          { headers, credentials: "include" },
        );
        const stBody = await stRes.json();

        if (stRes.ok && Array.isArray(stBody.data)) {
          const opts = (stBody.data || []).map((s: any) => ({
            key: s.Stakeholder_ID || s.StakeholderId || s.id,
            label:
              `${s.firstName || s.First_Name || ""} ${s.lastName || s.Last_Name || ""}`.trim(),
          }));

          setStakeholderOptions(opts);
          if (stakeholder && !opts.find((o: any) => o.key === stakeholder)) {
            setStakeholder("");
          }
        } else {
          setStakeholderOptions([]);
        }
      } catch (err) {
        console.warn("Failed to load stakeholders", err);
        setStakeholderOptions([]);
      }
    };

    fetchStakeholdersForCoordinator();
  }, [coordinator]);

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

  // Set isSysAdmin based on user role
  useEffect(() => {
    if (isOpen) {
      const rawUser = localStorage.getItem("unite_user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      const info = (() => {
        try {
          return getUserInfo();
        } catch (e) {
          return null;
        }
      })();

      const isAdmin = !!(
        (info && info.isAdmin) ||
        (user &&
          ((user.staff_type &&
            String(user.staff_type).toLowerCase().includes("admin")) ||
            (user.role && String(user.role).toLowerCase().includes("admin"))))
      );

      setIsSysAdmin(isAdmin);
    }
  }, [isOpen]);

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
                      {coordinatorOptions.map((coord) => (
                        <SelectItem key={coord.key}>{coord.label}</SelectItem>
                      ))}
                    </Select>
                  );
                }

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
                const rawUser =
                  typeof window !== "undefined"
                    ? localStorage.getItem("unite_user")
                    : null;
                const user = rawUser ? JSON.parse(rawUser) : null;
                const isStakeholder = !!(
                  user?.Stakeholder_ID ||
                  (user?.id && user.id.toLowerCase().startsWith("stkh_"))
                );

                if (isStakeholder) {
                  const fullName =
                    `${user?.firstName || user?.First_Name || ""} ${user?.lastName || user?.Last_Name || ""}`.trim();

                  return (
                    <Input
                      disabled
                      classNames={{
                        inputWrapper: "border-default-200 h-9 bg-default-100",
                      }}
                      radius="md"
                      size="sm"
                      type="text"
                      value={fullName || "Stakeholder"}
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
  const [coordinator, setCoordinator] = useState("");
  const [stakeholder, setStakeholder] = useState("");
  const [stakeholderOptions, setStakeholderOptions] = useState<
    { key: string; label: string }[]
  >([]);
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
  const [isSysAdmin, setIsSysAdmin] = useState(false);

  const coordinators = [
    { key: "john", label: "John Doe" },
    { key: "jane", label: "Jane Smith" },
    { key: "bob", label: "Bob Johnson" },
  ];

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

        const isAdmin = !!(
          (info && info.isAdmin) ||
          (user &&
            ((user.staff_type &&
              String(user.staff_type).toLowerCase().includes("admin")) ||
              (user.role && String(user.role).toLowerCase().includes("admin"))))
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

            // Prefill stakeholder if the authenticated user is a stakeholder
            try {
              const raw = localStorage.getItem("unite_user");
              const u = raw ? JSON.parse(raw) : null;
              const roleStr = String(
                u?.staff_type || u?.role || "",
              ).toLowerCase();

              if (u && roleStr.includes("stakeholder")) {
                const sid = u.Stakeholder_ID || u.StakeholderId || u.id;

                if (sid) {
                  setStakeholder(String(sid));
                  setStakeholderOptions([
                    {
                      key: String(sid),
                      label:
                        `${u.firstName || u.First_Name || ""} ${u.lastName || u.Last_Name || ""}`.trim(),
                    },
                  ]);
                }
              }
            } catch (e) {}

            return;
          }
        }

        // Special handling for stakeholders: auto-select their coordinator and themselves
        const isStakeholder = !!(
          user?.Stakeholder_ID ||
          (user?.id && user.id.toLowerCase().startsWith("stkh_"))
        );

        // diagnostic removed
        if (user && isStakeholder) {
          const sid =
            info?.raw?.id ||
            user.Stakeholder_ID ||
            user.StakeholderId ||
            user.id;

          // diagnostic removed
          if (sid) {
            try {
              const stRes = await fetch(
                `${API_URL}/api/stakeholders/${encodeURIComponent(sid)}`,
                { headers, credentials: "include" },
              );
              const stBody = await stRes.json();

              // diagnostic removed
              if (stRes.ok && stBody.data) {
                const st = stBody.data;
                const districtId = st.district;

                // diagnostic removed
                if (districtId) {
                  const coordRes = await fetch(
                    `${API_URL}/api/coordinators?district_id=${encodeURIComponent(districtId)}`,
                    { headers, credentials: "include" },
                  );
                  const coordBody = await coordRes.json();

                  // diagnostic removed
                  if (
                    coordRes.ok &&
                    coordBody.data &&
                    Array.isArray(coordBody.data) &&
                    coordBody.data.length > 0
                  ) {
                    const coordOpts = coordBody.data.map((c: any) => {
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

                    setCoordinatorOptions(coordOpts);
                    if (coordOpts.length > 0) {
                      setCoordinator(coordOpts[0].key);
                    }
                  } else {
                    console.error(
                      "No coordinators found for district:",
                      districtId,
                    );
                  }
                } else {
                  console.error("No district ID found for stakeholder");
                }
                // Set stakeholder to themselves
                setStakeholder(String(sid));
                setStakeholderOptions([
                  {
                    key: String(sid),
                    label:
                      `${st.firstName || st.First_Name || ""} ${st.lastName || st.Last_Name || ""}`.trim(),
                  },
                ]);
                // diagnostic removed
              }
            } catch (e) {
              console.error("Failed to fetch for stakeholder", e);
            }
          }

          return;
        }

        if (user) {
          const candidateIds: Array<string | number | undefined> = [];

          if (
            (user.staff_type &&
              String(user.staff_type).toLowerCase().includes("coordinator")) ||
            (info &&
              String(info.role || "")
                .toLowerCase()
                .includes("coordinator"))
          )
            candidateIds.push(user.id || info?.raw?.id);
          candidateIds.push(
            user.Coordinator_ID,
            user.CoordinatorId,
            user.CoordinatorID,
            user.role_data?.coordinator_id,
            user.MadeByCoordinatorID,
            info?.raw?.Coordinator_ID,
            info?.raw?.CoordinatorId,
          );

          let coordId = candidateIds.find(Boolean) as string | undefined;

          if (!coordId) {
            try {
              const t =
                token ||
                (typeof window !== "undefined"
                  ? localStorage.getItem("unite_token") ||
                    sessionStorage.getItem("unite_token")
                  : null);
              const payload = decodeJwt(t);

              if (payload)
                coordId =
                  payload.id ||
                  payload.ID ||
                  payload.Coordinator_ID ||
                  payload.coordinator_id ||
                  coordId;
            } catch (e) {}
          }

          if (coordId) {
            try {
              let resolvedCoordId = String(coordId);

              if (/^stkh_/i.test(resolvedCoordId)) {
                // try to resolve stakeholder -> coordinator id; if that fails, fall back to any Coordinator_ID present
                let resolvedFromStakeholder = false;

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
                    resolvedFromStakeholder = !!(
                      stakeholder.Coordinator_ID ||
                      stakeholder.CoordinatorId ||
                      stakeholder.coordinator_id
                    );
                  }
                } catch (e) {
                  console.warn(
                    "Failed to fetch stakeholder to resolve coordinator id",
                    resolvedCoordId,
                    e,
                  );
                }

                if (!resolvedFromStakeholder) {
                  // try local user fields and token payload for coordinator id
                  const fallback =
                    user?.Coordinator_ID ||
                    user?.CoordinatorId ||
                    user?.CoordinatorID ||
                    info?.raw?.Coordinator_ID ||
                    info?.raw?.CoordinatorId;

                  if (fallback) {
                    resolvedCoordId = fallback;
                  } else {
                    // nothing to resolve - bail out early
                    return;
                  }
                }
              }

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
              console.error("Failed to fetch coordinator by id", coordId, e);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch coordinators", err);
      }
    };

    if (isOpen) fetchCoordinators();
  }, [isOpen]);

  // Load stakeholders for selected coordinator's district when coordinator changes
  useEffect(() => {
    const fetchStakeholdersForCoordinator = async () => {
      try {
        if (!coordinator) {
          setStakeholderOptions([]);

          return;
        }

        const token =
          localStorage.getItem("unite_token") ||
          sessionStorage.getItem("unite_token");
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Fetch coordinator details to get district id
        let districtId: any = null;

        try {
          const coordRes = await fetch(
            `${API_URL}/api/coordinators/${encodeURIComponent(coordinator)}`,
            { headers, credentials: "include" },
          );
          const coordBody = await coordRes.json();

          const coordData = coordBody?.data || coordBody;

          districtId =
            coordData?.District_ID ||
            coordData?.District?.District_ID ||
            coordData?.District_Id ||
            coordData?.district_id ||
            coordData?.district ||
            null;
        } catch (e) {
          // ignore
        }

        if (!districtId) {
          setStakeholderOptions([]);

          return;
        }

        const stRes = await fetch(
          `${API_URL}/api/stakeholders?district_id=${encodeURIComponent(String(districtId))}`,
          { headers, credentials: "include" },
        );
        const stBody = await stRes.json();

        if (stRes.ok && Array.isArray(stBody.data)) {
          const opts = (stBody.data || []).map((s: any) => ({
            key: s.Stakeholder_ID || s.StakeholderId || s.id,
            label:
              `${s.firstName || s.First_Name || ""} ${s.lastName || s.Last_Name || ""}`.trim(),
          }));

          setStakeholderOptions(opts);
          if (stakeholder && !opts.find((o: any) => o.key === stakeholder)) {
            setStakeholder("");
          }
        } else {
          setStakeholderOptions([]);
        }
      } catch (err) {
        console.warn("Failed to load stakeholders", err);
        setStakeholderOptions([]);
      }
    };

    fetchStakeholdersForCoordinator();
  }, [coordinator]);

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

  // Set isSysAdmin based on user role
  useEffect(() => {
    if (isOpen) {
      const rawUser = localStorage.getItem("unite_user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      const info = (() => {
        try {
          return getUserInfo();
        } catch (e) {
          return null;
        }
      })();

      const isAdmin = !!(
        (info && info.isAdmin) ||
        (user &&
          ((user.staff_type &&
            String(user.staff_type).toLowerCase().includes("admin")) ||
            (user.role && String(user.role).toLowerCase().includes("admin"))))
      );

      setIsSysAdmin(isAdmin);
    }
  }, [isOpen]);

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
                  const availableCount =
                    (coordinatorOptions?.length || 0) +
                    (coordinators?.length || 0);

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
                        : coordinators
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

            {/* Stakeholder - appears immediately below Coordinator */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Stakeholder</label>
              {(() => {
                const rawUser =
                  typeof window !== "undefined"
                    ? localStorage.getItem("unite_user")
                    : null;
                const user = rawUser ? JSON.parse(rawUser) : null;
                const isStakeholder = !!(
                  user?.Stakeholder_ID ||
                  (user?.id && user.id.toLowerCase().startsWith("stkh_"))
                );

                if (isStakeholder) {
                  const fullName =
                    `${user?.firstName || user?.First_Name || ""} ${user?.lastName || user?.Last_Name || ""}`.trim();

                  return (
                    <Input
                      disabled
                      classNames={{
                        inputWrapper: "border-default-200 h-9 bg-default-100",
                      }}
                      radius="md"
                      size="sm"
                      type="text"
                      value={fullName || "Stakeholder"}
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
