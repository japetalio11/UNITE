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

interface DeleteCoordinatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinatorId: string | null;
  coordinatorName: string | null;
  onConfirmDelete: (id: string) => Promise<void>;
}

export default function DeleteCoordinatorModal({
  isOpen,
  onClose,
  coordinatorId,
  coordinatorName,
  onConfirmDelete,
}: DeleteCoordinatorModalProps) {
  const [typedName, setTypedName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTypedName("");
      setIsDeleting(false);
      setError(null);
    }
  }, [isOpen]);

  const matches = () => {
    if (!coordinatorName) return false;

    // Case-insensitive, trimmed comparison
    return (
      typedName.trim().toLowerCase() === coordinatorName.trim().toLowerCase()
    );
  };

  const handleDelete = async () => {
    if (!coordinatorId) return;
    if (!matches()) {
      setError("Typed name does not match");

      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirmDelete(coordinatorId);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to delete coordinator");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="md"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-3 pb-2">
          <div>
            <h2 className="text-lg font-semibold">Confirm delete</h2>
            <p className="text-xs text-default-500">
              Type the full name of the coordinator to confirm deletion.
            </p>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-3">
            <div>
              <p className="text-sm">Coordinator</p>
              <div className="text-sm font-medium text-gray-900">
                {coordinatorName || "—"}
              </div>
            </div>

            <div className="p-3 bg-danger-50 border border-danger-200 rounded">
              <p className="text-sm font-semibold text-danger">
                Irreversible action
              </p>
              <p className="text-xs text-danger">
                Deleting a coordinator is permanent and cannot be undone. All
                associated account data will be removed. Proceed only if you are
                sure.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">
                Type full name to confirm
              </label>
              <Input
                classNames={{ inputWrapper: "h-10" }}
                placeholder="Full name"
                value={typedName}
                variant="bordered"
                onChange={(e) =>
                  setTypedName((e.target as HTMLInputElement).value)
                }
              />
            </div>

            {error && <div className="text-sm text-danger">{error}</div>}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 text-white"
            color="danger"
            disabled={!matches() || isDeleting}
            onPress={handleDelete}
          >
            {isDeleting ? "Deleting..." : "Delete coordinator"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
