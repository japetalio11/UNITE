"use client";
import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  onConfirm: (note?: string) => Promise<void> | void;
  requireNote?: boolean;
}

const ConfirmModal: React.FC<Props> = ({ isOpen, onClose, title = "Confirm", message, confirmText = "Confirm", onConfirm, requireNote = false }) => {
  const [note, setNote] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    setValidationError(null);
    if (requireNote && (!note || note.trim().length === 0)) {
      setValidationError("Please provide a reason");
      return;
    }

    await onConfirm(note.trim());
    setNote("");
    setValidationError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} placement="center" size="md" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <span className="text-lg font-semibold">{title}</span>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-3">
            {message ? <p className="text-sm">{message}</p> : null}
            {requireNote ? (
              <div>
                <label className="text-xs">Note</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-2 border rounded" />
              </div>
            ) : null}
            {validationError ? <div className="text-sm text-danger">{validationError}</div> : null}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>Cancel</Button>
          <Button color="danger" onPress={handleConfirm}>{confirmText}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ConfirmModal;
