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
import { DatePicker } from "@heroui/date-picker";
import { Avatar } from "@heroui/avatar";
import { Clock } from "@gravity-ui/icons";
import { Textarea } from "@heroui/input";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentDate?: string;
  onConfirm: (
    currentDate: string,
    rescheduledDateISO: string,
    note: string,
  ) => Promise<void> | void;
}

const RescheduleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentDate,
  onConfirm,
}) => {
  const [rescheduledDate, setRescheduledDate] = React.useState<any>(null);
  const [note, setNote] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );

  const handleConfirm = async () => {
    setValidationError(null);
    if (!rescheduledDate) {
      setValidationError("Please choose a new date");
      return;
    }

    try {
      const rs = new Date(rescheduledDate);
      rs.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (rs.getTime() < today.getTime()) {
        setValidationError("Rescheduled date cannot be before today");
        return;
      }
    } catch (e) {
      setValidationError("Invalid date selected");
      return;
    }

    if (!note || note.trim().length === 0) {
      setValidationError("Please provide a reason for rescheduling");
      return;
    }

    const newDateISO =
      typeof rescheduledDate === "string"
        ? new Date(rescheduledDate).toISOString()
        : rescheduledDate instanceof Date
          ? rescheduledDate.toISOString()
          : new Date(rescheduledDate).toISOString();

    await onConfirm(currentDate || "", newDateISO, note.trim());

    setRescheduledDate(null);
    setNote("");
    setValidationError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} placement="center" size="md" onClose={onClose}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Avatar
              className="bg-default-100 border-1 border-default"
              icon={<Clock />}
            />
          </div>
          <h3 className="text-sm font-semibold py-2">Reschedule Event</h3>
          <p className="text-xs font-normal">
            Choose a new date and provide a reason.
          </p>
        </ModalHeader>
        <ModalBody className="py-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">New Date</label>
              <DatePicker
                classNames={{
                  inputWrapper: "border-default-200 h-9",
                }}
                radius="md"
                size="sm"
                value={rescheduledDate}
                variant="bordered"
                onChange={(d: any) => setRescheduledDate(d)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Reason</label>
              <Textarea
                classNames={{
                  inputWrapper: "border-default-200",
                }}
                radius="md"
                size="sm"
                value={note}
                variant="bordered"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            {validationError ? (
              <div className="text-sm text-danger">{validationError}</div>
            ) : null}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button className="w-full" variant="bordered" onPress={onClose}>
            Cancel
          </Button>
          <Button className="w-full" color="primary" onPress={handleConfirm}>
            Reschedule
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RescheduleModal;
