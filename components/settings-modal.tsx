"use client";

import { useState } from "react";
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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [blockedDates, setBlockedDates] = useState<DateValue[]>([
    parseDate("2026-01-26"),
    parseDate("2026-01-14"),
  ]);

  const removeBlockedDate = (dateToRemove: DateValue) => {
    setBlockedDates(
      blockedDates.filter(
        (date) => date.toString() !== dateToRemove.toString(),
      ),
    );
  };

  const handleDateChange = (date: DateValue | null) => {
    // Prevent adding duplicate dates
    if (date && !blockedDates.some((d) => d.toString() === date.toString())) {
      setBlockedDates([...blockedDates, date]);
    }
  };

  const renderField = (
    label: string,
    description: string,
    hasRefresh = false,
  ) => (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 pr-8">
        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <Input
        aria-label={label}
        className="w-48"
        defaultValue="210"
        endContent={
          hasRefresh ? (
            <Button isIconOnly size="sm" variant="light">
                <TrashBin className="h-4 w-4 text-gray-500" />
            </Button>
          ) : undefined
        }
        type="number"
      />
    </div>
  );

  return (
    <Modal
      backdrop="opaque"
      isOpen={isOpen}
      scrollBehavior="inside"
      size="5xl"
      onClose={onClose}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Settings</h2>
            </ModalHeader>
            <ModalBody className="p-0">
              <div className="flex">
                {/* Left Sidebar */}
                <div className="w-64 border-r border-gray-200 p-6">
                  <nav className="space-y-1">
                    <a
                      href="#"
                      className="block rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900"
                    >
                      General
                    </a>
                  </nav>
                </div>

                {/* Right Content */}
                <div className="flex-1 p-8">
                  <div className="max-w-3xl">
                    {/* Notifications Section */}
                    <section>
                      <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            Notifications
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Start providing your information by selecting your
                            blood type. Add details below to proceed.
                          </p>
                        </div>
                        <Switch
                          defaultSelected
                          aria-label="Enable notifications"
                        />
                      </div>
                    </section>

                    {/* Events Section */}
                    <section className="pt-6">
                      <h3 className="text-base font-semibold text-gray-900">
                        Events
                      </h3>
                      <div className="divide-y divide-gray-200">
                        {renderField(
                          "Maximum number of participants",
                          "Start providing your information by selecting your blood type. Add details below to proceed.",
                          true,
                        )}
                        {renderField(
                          "Maximum event slot",
                          "Start providing your information by selecting your blood type. Add details below to proceed.",
                        )}
                        {renderField(
                          "Maximum blood bags per day",
                          "Start providing your information by selecting your blood type. Add details below to proceed.",
                        )}
                        {renderField(
                          "Minimum days in advance for a request",
                          "Start providing your information by selecting your blood type. Add details below to proceed.",
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
                            Blocked operational days
                          </h4>
                          <p className="text-sm text-gray-500">
                            Start providing your information by selecting your
                            blood type. Add details below to proceed.
                          </p>
                          <CheckboxGroup
                            className="mt-4"
                            defaultValue={["sun", "sat"]}
                            orientation="horizontal"
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

                        {/* Specified Blocked Dates */}
                        <div className="py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">
                                Specified blocked dates
                              </h4>
                              <p className="text-sm text-gray-500">
                                Start providing your information by selecting
                                your blood type. Add details below to proceed.
                              </p>
                            </div>
                            <DatePicker
                              aria-label="Pick a date"
                              hideTimeZone
                              label={null}
                              placeholder="Pick a date"
                              showMonthAndYearPickers
                              variant="bordered"
                              onChange={handleDateChange}
                            />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {blockedDates.map((date) => (
                              <Chip
                                key={date.toString()}
                                color="danger"
                                endContent={<TrashBin className="h-4 w-4" />}
                                variant="flat"
                                onClose={() => removeBlockedDate(date)}
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
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
