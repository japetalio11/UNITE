"use client";

import React from "react";
import { Modal, ModalContent } from "@heroui/modal";
import { Pencil as Edit3, TrashBin as Trash2 } from "@gravity-ui/icons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  name?: string;
}

export default function CoordinatorActionModal({
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  name,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      onClose={onClose}
    >
      <ModalContent className="w-[320px]">
        {() => (
          <div className="p-2">
            <div className="px-3 py-2">
              <h3 className="text-sm font-semibold">Actions</h3>
              {name && (
                <p className="text-xs text-gray-500 mt-1 truncate">{name}</p>
              )}
            </div>

            <div className="divide-y divide-gray-100 bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-2">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50"
                  type="button"
                  onClick={() => {
                    onUpdate();
                    onClose();
                  }}
                >
                  <Edit3 className="w-5 h-5 text-gray-700" />
                  <div className="text-left">
                    <div className="text-sm text-gray-900">
                      Update coordinator
                    </div>
                    <div className="text-xs text-gray-500">
                      Edit the coordinator&apos;s details
                    </div>
                  </div>
                </button>
              </div>

              <div className="border-t mt-1" />

              <div className="p-2">
                <div className="text-xs text-gray-500 px-3 pb-2">
                  Danger zone
                </div>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50"
                  type="button"
                  onClick={() => {
                    onDelete();
                    onClose();
                  }}
                >
                  <div className="w-6 h-6 flex items-center justify-center rounded-md bg-red-100">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-red-600">
                      Delete coordinator
                    </div>
                    <div className="text-xs text-red-500">
                      Permanently remove this coordinator
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
