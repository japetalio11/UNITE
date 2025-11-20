"use client";
import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { DatePicker } from "@heroui/date-picker";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentDate?: string;
  onConfirm: (currentDate: string, rescheduledDateISO: string, note: string) => Promise<void> | void;
}

const RescheduleModal: React.FC<Props> = ({ isOpen, onClose, currentDate, onConfirm }) => {
  const [rescheduledDate, setRescheduledDate] = React.useState<any>(null);
  const [note, setNote] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    setValidationError(null);
    if (!rescheduledDate) {
      setValidationError("Please choose a new date");
      return;
    }

    try {
      const rs = new Date(rescheduledDate);
      rs.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
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

    const newDateISO = typeof rescheduledDate === "string" ? new Date(rescheduledDate).toISOString() : rescheduledDate instanceof Date ? rescheduledDate.toISOString() : new Date(rescheduledDate).toISOString();

    await onConfirm(currentDate || "", newDateISO, note.trim());

    setRescheduledDate(null);
    setNote("");
    setValidationError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} placement="center" size="md" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <span className="text-lg font-semibold">Reschedule Event</span>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-3">
            <div>
              <label className="text-xs">New Date</label>
              <DatePicker value={rescheduledDate} onChange={(d:any) => setRescheduledDate(d)} />
            </div>
            <div>
              <label className="text-xs">Reason</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-2 border rounded" />
            </div>
            {validationError ? <div className="text-sm text-danger">{validationError}</div> : null}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>Cancel</Button>
          <Button onPress={handleConfirm}>Reschedule</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RescheduleModal;
