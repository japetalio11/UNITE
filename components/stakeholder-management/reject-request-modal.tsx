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
import { Textarea } from "@heroui/input";

interface RejectRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export default function RejectRequestModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: RejectRequestModalProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      placement="center"
      size="md"
      onClose={onClose}
      hideCloseButton={isLoading}
      isDismissable={!isLoading}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Rejection
              </h3>
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-gray-600 mb-2">
                Are you sure you want to reject this signup request? This action 
                cannot be undone and the request will be permanently deleted.
              </p>
              
              <Textarea
                label="Reason for rejection (optional)"
                labelPlacement="outside"
                placeholder="Please provide a reason for rejection..."
                minRows={3}
                variant="bordered"
                value={reason}
                onValueChange={setReason}
                isDisabled={isLoading}
                classNames={{
                  input: "text-sm",
                  label: "text-sm font-medium text-gray-700 mb-2"
                }}
              />
            </ModalBody>
            <ModalFooter>
              <Button
                isDisabled={isLoading}
                variant="bordered"
                onPress={onClose}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 text-white"
                color="danger"
                isLoading={isLoading}
                onPress={() => onConfirm(reason)}
              >
                {isLoading ? "Rejecting..." : "Reject Request"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}