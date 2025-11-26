"use client";
import React from "react";
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
import { Chip } from "@heroui/chip";
import { Persons as Users, Droplet, Megaphone } from "@gravity-ui/icons";

interface EventViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  request?: any;
}

const safe = (v: any) => (v === undefined || v === null ? "" : String(v));

export const EventViewModal: React.FC<EventViewModalProps> = ({
  isOpen,
  onClose,
  request,
}) => {
  React.useEffect(() => {
    // logging removed
  }, [isOpen, request]);

  const event = request?.event || request || {};
  // category-specific document may come from several shapes depending on API:
  // - service returns event.categoryData (and event.category)
  // - other shapes may use request.category or request.categoryData
  const categoryData =
    event?.categoryData || request?.categoryData || request?.category || {};

  const title = event.Event_Title || event.title || "Untitled";
  const categoryRaw =
    event.Category || event.categoryType || event.category || "";
  const catKey = String(categoryRaw || "").toLowerCase();
  let category = "Event";

  if (catKey.includes("blood")) category = "Blood Drive";
  else if (catKey.includes("training")) category = "Training";
  else if (catKey.includes("advocacy")) category = "Advocacy";

  const location = event.Location || event.location || "";
  const startRaw = event.Start_Date || event.start || "";
  const endRaw = event.End_Date || event.end || "";

  const parseDate = (v: any) => {
    if (!v) return null;
    try {
      // Mongo export shape: { $date: { $numberLong: '...' } } or { $date: '2025-...' }
      if (typeof v === "object") {
        if (v.$date) {
          const d = v.$date;

          if (typeof d === "object" && d.$numberLong)
            return new Date(Number(d.$numberLong));

          return new Date(d as any);
        }
        // sometimes stored as { $numberLong: '...' }
        if (v.$numberLong) return new Date(Number(v.$numberLong));

        // fallback: try to stringify and parse
        return new Date(String(v));
      }

      return new Date(v as any);
    } catch (e) {
      return null;
    }
  };

  const startDateObj = parseDate(startRaw);
  const endDateObj = parseDate(endRaw);

  const formatDate = (d?: Date | null) => {
    if (!d) return "";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  };

  const formatTime = (d?: Date | null) => {
    if (!d) return "";

    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  };

  const dateDisplay = startDateObj ? formatDate(startDateObj) : "";
  const timeDisplay = startDateObj
    ? `${formatTime(startDateObj)}${endDateObj ? " - " + formatTime(endDateObj) : ""}`
    : "";

  // Common variants for numeric / target fields used by different backends
  // Prefer values from the category document (categoryData) if present, otherwise fallback to event-level fields
  const participants =
    categoryData?.MaxParticipants ||
    categoryData?.Max_Participants ||
    categoryData?.numberOfParticipants ||
    categoryData?.ExpectedAudienceSize ||
    categoryData?.Expected_Audience_Size ||
    event.MaxParticipants ||
    event.Max_Participants ||
    event.numberOfParticipants ||
    event.expectedAudienceSize ||
    event.ExpectedAudienceSize ||
    event.Expected_Audience_Size ||
    "";
  const goal =
    categoryData?.Target_Donation ||
    categoryData?.TargetDonation ||
    categoryData?.Target_Donation_Count ||
    categoryData?.TargetDonationCount ||
    event.Target_Donation ||
    event.TargetDonation ||
    event.goalCount ||
    event.TargetDonationCount ||
    "";
  const audience =
    categoryData?.TargetAudience ||
    categoryData?.audienceType ||
    categoryData?.AudienceType ||
    categoryData?.ExpectedAudience ||
    event.TargetAudience ||
    event.audienceType ||
    event.AudienceType ||
    event.ExpectedAudience ||
    "";

  // Additional category-specific metadata (only those captured by creation modals)
  const trainingType =
    categoryData?.TrainingType ||
    categoryData?.trainingType ||
    categoryData?.Training_Type ||
    event.TrainingType ||
    event.trainingType ||
    event.Training_Type ||
    "";

  // Description may appear under several keys depending on the backend shape
  const description =
    event.Event_Description ||
    event.EventDescription ||
    event.Description ||
    event.eventDescription ||
    event.description ||
    request?.Event_Description ||
    request?.EventDescription ||
    request?.Description ||
    request?.description ||
    event.request?.Event_Description ||
    event.raw?.Event_Description ||
    "";

  // description fallback logic present; logging removed

  const contactEmail = event.Email || event.email || event.ContactEmail || "";
  const contactNumber =
    event.Phone_Number || event.PhoneNumber || event.contactNumber || "";

  // Coordinator display: API may return coordinator with `name` or nested `staff` object
  let coordinatorLabel = "";
  const coord = event?.coordinator || request?.coordinator || null;

  if (coord) {
    if (typeof coord === "string") {
      coordinatorLabel = coord;
    } else if (coord.name) {
      coordinatorLabel = coord.name;
    } else if (coord.staff) {
      const s = coord.staff;

      coordinatorLabel = [s.First_Name, s.Middle_Name, s.Last_Name]
        .filter(Boolean)
        .join(" ");
    } else if (coord.First_Name || coord.Last_Name) {
      coordinatorLabel = [coord.First_Name, coord.Middle_Name, coord.Last_Name]
        .filter(Boolean)
        .join(" ");
    }
  } else if (request?.MadeByStakeholderID) {
    coordinatorLabel = safe(request.MadeByStakeholderID);
  }

  return (
    <Modal
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="2xl"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex items-start gap-4 pb-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-default-100">
            {category === "Blood Drive" ? (
              <Droplet className="w-6 h-6 text-default-600" />
            ) : category === "Advocacy" ? (
              <Megaphone className="w-6 h-6 text-default-600" />
            ) : (
              <Users className="w-6 h-6 text-default-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{title}</h2>
            </div>
            <div className="mt-1">
              <Chip className="px-2 py-0.5" size="sm" variant="faded">
                {category}
              </Chip>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="py-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-default-700">Coordinator</label>
              <Input
                disabled
                classNames={{
                  inputWrapper: "h-10 bg-default-100",
                  input: "text-sm",
                }}
                value={coordinatorLabel}
                variant="bordered"
              />
            </div>

            <div>
              <label className="text-xs text-default-700">Location</label>
              <Input
                disabled
                classNames={{
                  inputWrapper: "h-10 bg-default-100",
                  input: "text-sm",
                }}
                value={location}
                variant="bordered"
              />
            </div>

            <div>
              <label className="text-xs text-default-700">Date</label>
              <Input
                disabled
                classNames={{
                  inputWrapper: "h-10 bg-default-100",
                  input: "text-sm",
                }}
                value={dateDisplay}
                variant="bordered"
              />
            </div>

            <div>
              <label className="text-xs text-default-700">Time</label>
              <Input
                disabled
                classNames={{
                  inputWrapper: "h-10 bg-default-100",
                  input: "text-sm",
                }}
                value={timeDisplay}
                variant="bordered"
              />
            </div>

            {/* Dynamic fields: show relevant metadata per category */}
            {category === "Training" && (
              <>
                <div>
                  <label className="text-xs text-default-700">
                    Type of training
                  </label>
                  <Input
                    disabled
                    classNames={{
                      inputWrapper: "h-10 bg-default-100",
                      input: "text-sm",
                    }}
                    value={trainingType || ""}
                    variant="bordered"
                  />
                </div>
                <div>
                  <label className="text-xs text-default-700">
                    Max participants
                  </label>
                  <Input
                    disabled
                    classNames={{
                      inputWrapper: "h-10 bg-default-100",
                      input: "text-sm",
                    }}
                    value={safe(participants)}
                    variant="bordered"
                  />
                </div>
              </>
            )}

            {category === "Blood Drive" && (
              <div>
                <label className="text-xs text-default-700">
                  Target donation
                </label>
                <Input
                  disabled
                  classNames={{
                    inputWrapper: "h-10 bg-default-100",
                    input: "text-sm",
                  }}
                  value={safe(goal)}
                  variant="bordered"
                />
              </div>
            )}

            {category === "Advocacy" && (
              <>
                <div>
                  <label className="text-xs text-default-700">
                    Target audience
                  </label>
                  <Input
                    disabled
                    classNames={{
                      inputWrapper: "h-10 bg-default-100",
                      input: "text-sm",
                    }}
                    value={audience || ""}
                    variant="bordered"
                  />
                </div>
                <div>
                  <label className="text-xs text-default-700">
                    Target number
                  </label>
                  <Input
                    disabled
                    classNames={{
                      inputWrapper: "h-10 bg-default-100",
                      input: "text-sm",
                    }}
                    value={safe(participants)}
                    variant="bordered"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs text-default-700">Contact Email</label>
              <Input
                disabled
                classNames={{
                  inputWrapper: "h-10 bg-default-100",
                  input: "text-sm",
                }}
                value={contactEmail}
                variant="bordered"
              />
            </div>

            <div>
              <label className="text-xs text-default-700">Contact Number</label>
              <Input
                disabled
                classNames={{
                  inputWrapper: "h-10 bg-default-100",
                  input: "text-sm",
                }}
                value={contactNumber}
                variant="bordered"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-default-700">Description</label>
              <Textarea
                disabled
                className="mt-1"
                minRows={4}
                value={description}
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button className="font-medium" variant="bordered" onPress={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EventViewModal;
