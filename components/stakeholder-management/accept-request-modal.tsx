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

interface AcceptRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function AcceptRequestModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: AcceptRequestModalProps) {
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
                Confirm Acceptance
              </h3>
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-gray-600">
                Are you sure you want to accept this signup request? This will create a 
                stakeholder account and send a confirmation email to the user.
              </p>
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
                className="bg-green-600 text-white"
                color="success"
                isLoading={isLoading}
                onPress={onConfirm}
              >
                {isLoading ? "Accepting..." : "Accept Request"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}