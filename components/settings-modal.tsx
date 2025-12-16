"use client";

import { useState, useEffect } from "react";
import { getUserInfo } from "../utils/getUserInfo";
import { useRouter } from "next/navigation";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Input } from "@heroui/input";
import { DatePicker } from "@heroui/date-picker";
import { DateValue } from "@react-types/datepicker";
import { CheckboxGroup, Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { Xmark, TrashBin } from "@gravity-ui/icons";
import { parseDate } from "@internationalized/date";
import { fetchJsonWithAuth } from "../utils/fetchWithAuth";

interface Settings {
  notificationsEnabled: boolean;
  maxPendingRequests: number;
  maxEventsPerDay: number;
  maxBloodBagsPerDay: number;
  advanceBookingDays: number;
  blockedWeekdays: number[];
  blockedDates: string[];
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    notificationsEnabled: true,
    maxPendingRequests: 100,
    maxEventsPerDay: 3,
    maxBloodBagsPerDay: 200,
    advanceBookingDays: 30,
    blockedWeekdays: [1, 0, 0, 0, 0, 0, 1], // Sun and Sat blocked
    blockedDates: [],
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadSettings();
    }
  }, [isOpen]);

  // determine admin status on mount
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const info = getUserInfo();
      const raw = info?.raw || info || null;
      const staffType =
        raw?.StaffType ||
        raw?.Staff_Type ||
        raw?.staff_type ||
        raw?.role ||
        null;
      const roleStr = (info?.role || "").toString().toLowerCase();
      const staffLower = staffType ? String(staffType).toLowerCase() : "";

      const detected = Boolean(
        (info && info.isAdmin) ||
          staffLower === "admin" ||
          roleStr === "admin" ||
          (roleStr.includes("sys") && roleStr.includes("admin")),
      );

      setIsAdmin(Boolean(detected));
    } catch (e) {
      setIsAdmin(false);
    }
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetchJsonWithAuth("/api/settings");

      if (response.success) {
        setSettings({
          notificationsEnabled: response.data.notificationsEnabled ?? true,
          maxPendingRequests: response.data.maxPendingRequests ?? 100,
          maxEventsPerDay: response.data.maxEventsPerDay ?? 3,
          maxBloodBagsPerDay: response.data.maxBloodBagsPerDay ?? 200,
          advanceBookingDays: response.data.advanceBookingDays ?? 30,
          blockedWeekdays:
            response.data.blockedWeekdays ?? [1, 0, 0, 0, 0, 0, 1],
          blockedDates: response.data.blockedDates ?? [],
        });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("unite_token");
    sessionStorage.removeItem("unite_token");
    onClose();
    router.push("/");
  };

  const updateSettings = async (updates: Partial<Settings>) => {
    try {
      const newSettings = { ...settings, ...updates };

      setSettings(newSettings);
      await fetchJsonWithAuth("/api/settings", {
        method: "POST",
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error("Failed to update settings:", error);
      // Revert on error
      setSettings(settings);
    }
  };

  const handleBlockedDateAdd = (date: DateValue | null) => {
    if (date) {
      const dateStr = `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;

      if (!settings.blockedDates.includes(dateStr)) {
        updateSettings({ blockedDates: [...settings.blockedDates, dateStr] });
      }
    }
  };

  const handleBlockedDateRemove = (dateStr: string) => {
    updateSettings({
      blockedDates: settings.blockedDates.filter((d) => d !== dateStr),
    });
  };

  const handleWeekdayChange = (selected: string[]) => {
    const weekdays = [0, 1, 2, 3, 4, 5, 6].map((day) =>
      selected.includes(
        ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][day],
      )
        ? 1
        : 0,
    );

    updateSettings({ blockedWeekdays: weekdays });
  };

  const selectedWeekdays = settings.blockedWeekdays
    .map((blocked, index) =>
      blocked
        ? ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][index]
        : null,
    )
    .filter(Boolean) as string[];

  const blockedDateValues = settings.blockedDates.map((dateStr) => {
    const [year, month, day] = dateStr.split("-").map(Number);

    return parseDate(`${year}-${month}-${day}`);
  });

  const renderField = (
    label: string,
    description: string,
    value: number,
    key: keyof Settings,
    hasRefresh = false,
  ) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-2 md:gap-0">
      <div className="flex-1 pr-0 md:pr-8">
        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
        <p className="text-sm text-gray-500 mt-1 md:mt-0">{description}</p>
      </div>
      <div className="w-full md:w-auto mt-2 md:mt-0">
        <Input
          aria-label={label}
          className="w-full md:w-48"
          type="number"
          value={value.toString()}
          onChange={(e) =>
            updateSettings({ [key]: parseInt(e.target.value) || 0 })
          }
          endContent={
            hasRefresh ? (
              <Button isIconOnly size="sm" variant="light">
                <TrashBin className="h-4 w-4 text-gray-500" />
              </Button>
            ) : undefined
          }
        />
      </div>
    </div>
  );

  return (
    <Modal
      backdrop="opaque"
      isOpen={isOpen}
      scrollBehavior="inside"
      size="5xl"
      // Force full screen on mobile, but revert to "auto" sizing logic on desktop
      // so 'size="5xl"' takes precedence again.
      classNames={{
        base: "!m-0 !p-0 !w-full !h-full !max-h-full !max-w-none !rounded-none md:!rounded-xl md:!h-auto md:!m-auto md:!w-auto",
        wrapper: "!p-0 md:!p-10",
      }}
      onClose={onClose}
    >
      <ModalContent className="h-full md:h-auto min-h-full md:min-h-0">
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-semibold">Settings</h2>
            </ModalHeader>
            <ModalBody className="p-0 md:p-6 overflow-y-auto">
              {isAdmin ? (
                // Switch flex direction on mobile, keep row on desktop
                <div className="flex flex-col md:flex-row min-h-full">
                  {/* Sidebar: Full width on top (mobile) vs w-64 on left (desktop) */}
                  <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 p-4 md:p-6 bg-gray-50 md:bg-transparent shrink-0">
                    <nav className="space-y-1">
                      <a
                        href="#"
                        className="block rounded-md bg-white md:bg-gray-100 border md:border-none border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 text-center md:text-left shadow-sm md:shadow-none"
                      >
                        General
                      </a>
                    </nav>
                    {/* Hide desktop logout on mobile to save space at top, move to bottom */}
                    <div className="mt-4 hidden md:block">
                      <Button
                        color="danger"
                        variant="light"
                        onClick={handleLogout}
                        className="w-full justify-start"
                      >
                        Log Out
                      </Button>
                    </div>
                  </div>

                  {/* Right Content */}
                  <div className="flex-1 p-4 md:p-8 pb-10 md:pb-8">
                    <div className="max-w-full md:max-w-3xl mx-auto">
                      {/* Notifications Section */}
                      <section>
                        <div className="flex items-center justify-between pb-6 border-b border-gray-200 gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">
                              Notifications
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                              Enable or disable application notifications.
                            </p>
                          </div>
                          <Switch
                            isSelected={settings.notificationsEnabled}
                            onValueChange={(isSelected) =>
                              updateSettings({
                                notificationsEnabled: isSelected,
                              })
                            }
                            aria-label="Enable notifications"
                          />
                        </div>
                      </section>

                      {/* Events Section */}
                      <section className="pt-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-2 md:mb-0">
                          Events
                        </h3>
                        <div className="divide-y divide-gray-200">
                          {renderField(
                            "Maximum pending requests allowed",
                            "Maximum number of pending requests a user can have.",
                            settings.maxPendingRequests,
                            "maxPendingRequests",
                            true,
                          )}
                          {renderField(
                            "Maximum events per day",
                            "The maximum number of separate events per day.",
                            settings.maxEventsPerDay,
                            "maxEventsPerDay",
                          )}
                          {renderField(
                            "Maximum blood bags per day",
                            "The maximum number of blood bags the facility can process.",
                            settings.maxBloodBagsPerDay,
                            "maxBloodBagsPerDay",
                          )}
                          {renderField(
                            "Minimum days in advance for a request",
                            "Days before an event a request must be made.",
                            settings.advanceBookingDays,
                            "advanceBookingDays",
                          )}
                        </div>
                      </section>

                      {/* Calendar Section */}
                      <section className="pt-6">
                        <h3 className="text-base font-semibold text-gray-900">
                          Calendar
                        </h3>
                        <div className="divide-y divide-gray-200">
                          {/* Blocked Operational Days */}
                          <div className="py-4">
                            <h4 className="text-sm font-medium text-gray-900">
                              Permanently blocked weekdays
                            </h4>
                            <p className="text-sm text-gray-500 mb-3 md:mb-0">
                              Select weekdays that should never be available.
                            </p>
                            <div className="overflow-x-auto pb-2 -mx-2 px-2 md:mx-0 md:px-0 md:pb-0">
                              <CheckboxGroup
                                className="mt-2 md:mt-4"
                                value={selectedWeekdays}
                                onChange={handleWeekdayChange}
                                orientation="horizontal"
                                classNames={{
                                  wrapper:
                                    "gap-4 md:gap-2 flex-nowrap md:flex-wrap",
                                }}
                              >
                                <Checkbox value="sun">Sun</Checkbox>
                                <Checkbox value="mon">Mon</Checkbox>
                                <Checkbox value="tue">Tue</Checkbox>
                                <Checkbox value="wed">Wed</Checkbox>
                                <Checkbox value="thu">Thu</Checkbox>
                                <Checkbox value="fri">Fri</Checkbox>
                                <Checkbox value="sat">Sat</Checkbox>
                              </CheckboxGroup>
                            </div>
                          </div>

                          {/* Specified Blocked Dates */}
                          <div className="py-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">
                                  Specific blocked dates
                                </h4>
                                <p className="text-sm text-gray-500">
                                  Add specific calendar dates (one-off).
                                </p>
                              </div>
                              <DatePicker
                                aria-label="Pick a date"
                                className="w-full md:w-auto min-w-[200px]"
                                hideTimeZone
                                label={null}
                                showMonthAndYearPickers
                                variant="bordered"
                                onChange={handleBlockedDateAdd}
                              />
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {blockedDateValues.map((date) => (
                                <Chip
                                  key={date.toString()}
                                  color="danger"
                                  endContent={<TrashBin className="h-4 w-4" />}
                                  variant="flat"
                                  onClose={() =>
                                    handleBlockedDateRemove(
                                      `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`,
                                    )
                                  }
                                >
                                  {new Date(
                                    date.year,
                                    date.month - 1,
                                    date.day,
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </Chip>
                              ))}
                              {blockedDateValues.length === 0 && (
                                <span className="text-xs text-gray-400 italic">
                                  No dates blocked
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Mobile Logout (visible only on mobile) */}
                      <div className="mt-8 md:hidden border-t border-gray-200 pt-6">
                        <Button
                          color="danger"
                          variant="flat"
                          onClick={handleLogout}
                          className="w-full"
                          size="lg"
                        >
                          Log Out
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 h-full flex flex-col justify-center">
                  <p className="text-sm text-gray-600 mb-6">
                    You are not allowed to change settings. Only system
                    administrators can change settings.
                  </p>
                  <div className="flex justify-center">
                    <Button
                      color="danger"
                      variant="light"
                      onClick={handleLogout}
                    >
                      Log Out
                    </Button>
                  </div>
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}