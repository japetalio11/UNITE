"use client";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import { Input } from "@heroui/input";

interface QuickFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: { province?: string; districtId?: string }) => void;
}

export default function QuickFilterModal({
  isOpen,
  onClose,
  onApply,
}: QuickFilterModalProps) {
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    null,
  );
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/districts?limit=1000`
          : `/api/districts?limit=1000`;
        const res = await fetch(url);
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        const items = json?.data || [];

        setDistricts(items);
      } catch (e) {
        setDistricts([]);
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!selectedDistrictId) return;
    const pick = districts.find(
      (d) =>
        String(d.District_ID) === String(selectedDistrictId) ||
        String(d.id) === String(selectedDistrictId) ||
        String(d._id) === String(selectedDistrictId),
    );

    if (pick) setSelectedProvince(pick.Province_Name || pick.province || "");
  }, [selectedDistrictId, districts]);

  const handleApply = () => {
    onApply({
      province: selectedProvince || undefined,
      districtId: selectedDistrictId || undefined,
    });
    onClose();
  };

  const handleClear = () => {
    setSelectedDistrictId(null);
    setSelectedProvince(null);
  };

  return (
    <Modal isOpen={isOpen} placement="center" size="sm" onClose={onClose}>
      <ModalContent>
        <ModalHeader className="pb-2">
          <h3 className="text-lg font-semibold">Quick Filter</h3>
          <p className="text-xs text-default-500">
            Fast filters for coordinators
          </p>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">District</label>
              <Select
                placeholder="Select district"
                selectedKeys={
                  selectedDistrictId ? [String(selectedDistrictId)] : []
                }
                onSelectionChange={(keys: any) =>
                  setSelectedDistrictId(Array.from(keys)[0] as string)
                }
              >
                {districts.map((d) => (
                  <SelectItem key={d.District_ID || d.id || d._id}>
                    {d.District_Name || d.District_Number || d.District_ID}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Province</label>
              <Input
                disabled
                classNames={{ inputWrapper: "h-10 bg-default-100" }}
                value={selectedProvince || ""}
                variant="bordered"
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            onPress={() => {
              handleClear();
            }}
          >
            Clear
          </Button>
          <Button
            className="bg-black text-white"
            color="default"
            onPress={handleApply}
          >
            Apply
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
