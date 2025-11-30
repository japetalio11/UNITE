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
import { Avatar } from "@heroui/avatar";
import { Persons, Droplet, Megaphone } from "@gravity-ui/icons";

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
  const event = request?.event || request || {};
  // category-specific document (Training/BloodDrive/Advocacy) attached by the backend
  const categoryData = request?.category || {};

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
    try {
      return v ? new Date(v) : null;
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

  const description =
    event.Event_Description ||
    event.Description ||
    event.eventDescription ||
    event.description ||
    "";

  const contactEmail = event.Email || event.email || event.ContactEmail || "";
  const contactNumber =
    event.Phone_Number || event.PhoneNumber || event.contactNumber || "";

  // Coordinator display
  let coordinatorLabel = "";

  if (request?.coordinator && request.coordinator.staff) {
    const s = request.coordinator.staff;

    coordinatorLabel = [s.First_Name, s.Middle_Name, s.Last_Name]
      .filter(Boolean)
      .join(" ");
  } else if (request?.MadeByStakeholderID) {
    coordinatorLabel = safe(request.MadeByStakeholderID);
  }

  // debug output to help trace missing fields (useful during development)

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
                category === "Blood Drive" ? (
                  <Droplet />
                ) : category === "Advocacy" ? (
                  <Megaphone />
                ) : (
                  <Persons />
                )
              }
            />
          </div>
          <h3 className="text-sm font-semibold py-2">{title}</h3>
          <div className="flex items-center">
            <Chip
              classNames={{ content: "text-xs font-medium" }}
              radius="sm"
              size="sm"
              variant="flat"
            >
              {category}
            </Chip>
          </div>
        </ModalHeader>

        <ModalBody className="py-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-medium">Coordinator</label>
              <Input
                disabled
                classNames={{
                  inputWrapper: "border-default-200 h-9 bg-default-100",
                }}
                radius="md"
                size="sm"
                value={coordinatorLabel}
                variant="bordered"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Location</label>
              <Input
                disabled
                classNames={{
                  inputWrapper: "border-default-200 h-9 bg-default-100",
                }}
                radius="md"
                size="sm"
                value={location}
                variant="bordered"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Date</label>
              <Input
                disabled
                classNames={{
                  inputWrapper: "border-default-200 h-9 bg-default-100",
                }}
                radius="md"
                size="sm"
                value={dateDisplay}
                variant="bordered"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Time</label>
              <Input
                disabled
                classNames={{
                  inputWrapper: "border-default-200 h-9 bg-default-100",
                }}
                radius="md"
                size="sm"
                value={timeDisplay}
                variant="bordered"
              />
            </div>

            {/* Dynamic fields: show relevant metadata per category */}
            {category === "Training" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Type of training
                  </label>
                  <Input
                    disabled
                    classNames={{
                      inputWrapper: "border-default-200 h-9 bg-default-100",
                    }}
                    radius="md"
                    size="sm"
                    value={trainingType || ""}
                    variant="bordered"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Max participants
                  </label>
                  <Input
                    disabled
                    classNames={{
                      inputWrapper: "border-default-200 h-9 bg-default-100",
                    }}
                    radius="md"
                    size="sm"
                    value={safe(participants)}
                    variant="bordered"
                  />
                </div>
              </>
            )}

            {category === "Blood Drive" && (
              <div className="space-y-1">
                <label className="text-xs font-medium">Target donation</label>
                <Input
                  disabled
                  classNames={{
                    inputWrapper: "border-default-200 h-9 bg-default-100",
                  }}
                  radius="md"
                  size="sm"
                  value={safe(goal)}
                  variant="bordered"
                />
              </div>
            )}

            {category === "Advocacy" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Target audience</label>
                  <Input
                    disabled
                    classNames={{
                      inputWrapper: "border-default-200 h-9 bg-default-100",
                    }}
                    radius="md"
                    size="sm"
                    value={audience || ""}
                    variant="bordered"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Target number</label>
                  <Input
                    disabled
                    classNames={{
                      inputWrapper: "border-default-200 h-9 bg-default-100",
                    }}
                    radius="md"
                    size="sm"
                    value={safe(participants)}
                    variant="bordered"
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium">Contact Email</label>
              <Input
                disabled
                classNames={{
                  inputWrapper: "border-default-200 h-9 bg-default-100",
                }}
                radius="md"
                size="sm"
                value={contactEmail}
                variant="bordered"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Contact Number</label>
              <Input
                disabled
                classNames={{
                  inputWrapper: "border-default-200 h-9 bg-default-100",
                }}
                radius="md"
                size="sm"
                value={contactNumber}
                variant="bordered"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium">Description</label>
              <Textarea
                disabled
                classNames={{
                  inputWrapper: "border-default-200 bg-default-100",
                }}
                minRows={4}
                radius="md"
                size="sm"
                value={description}
                variant="bordered"
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
