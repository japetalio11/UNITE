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
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";

interface AdvancedFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
}

export default function AdvancedFilterModal({
  isOpen,
  onClose,
  onApply,
}: AdvancedFilterModalProps) {
  const [districts, setDistricts] = useState<any[]>([]);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

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

  const handleApply = () => {
    const filters: any = {};

    if (organization) filters.organization = organization;
    if (name) filters.name = name;
    if (email) filters.email = email;
    if (phone) filters.phone = phone;
    if (districtId) filters.districtId = districtId;
    if (type) filters.type = type;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    setOrganization("");
    setName("");
    setEmail("");
    setPhone("");
    setDistrictId(null);
    setType("");
    setDateFrom("");
    setDateTo("");
    // do not auto-apply; caller can choose to clear
  };

  return (
    <Modal isOpen={isOpen} placement="center" size="xl" onClose={onClose}>
      <ModalContent className="w-full max-w-[1100px]">
        <ModalHeader className="pb-2">
          <h3 className="text-lg font-semibold">Advanced Filter</h3>
          <p className="text-xs text-default-500">
            Combine multiple conditions (AND) to refine results
          </p>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Organization</label>
                <Input
                  className="w-full"
                  classNames={{ inputWrapper: "h-10 w-full" }}
                  placeholder="Organization"
                  value={organization}
                  variant="bordered"
                  onChange={(e) =>
                    setOrganization((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Stakeholder Name</label>
                <Input
                  className="w-full"
                  classNames={{ inputWrapper: "h-10 w-full" }}
                  placeholder="Full or partial name"
                  value={name}
                  variant="bordered"
                  onChange={(e) =>
                    setName((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  className="w-full"
                  classNames={{ inputWrapper: "h-10 w-full" }}
                  placeholder="Email"
                  value={email}
                  variant="bordered"
                  onChange={(e) =>
                    setEmail((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  className="w-full"
                  classNames={{ inputWrapper: "h-10 w-full" }}
                  placeholder="Phone"
                  value={phone}
                  variant="bordered"
                  onChange={(e) =>
                    setPhone((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Stakeholder Type</label>
                <Input
                  className="w-full"
                  classNames={{ inputWrapper: "h-10 w-full" }}
                  placeholder="Type"
                  value={type}
                  variant="bordered"
                  onChange={(e) =>
                    setType((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">District</label>
                <Select
                  className="w-full"
                  classNames={{ trigger: "w-full" }}
                  placeholder="Select district"
                  selectedKeys={districtId ? [String(districtId)] : []}
                  onSelectionChange={(keys: any) =>
                    setDistrictId(Array.from(keys)[0] as string)
                  }
                >
                  <SelectItem key="">Any district</SelectItem>
                  {
                    // cast mapped items to any to avoid CollectionElement typing complaints
                    districts.map((d) => (
                      <SelectItem key={d.District_ID || d.id || d._id}>
                        {d.District_Name || d.District_Number || d.District_ID}
                      </SelectItem>
                    )) as unknown as any
                  }
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  Date Created (from / to)
                </label>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    classNames={{ inputWrapper: "h-10 w-full" }}
                    type="date"
                    value={dateFrom}
                    variant="bordered"
                    onChange={(e) =>
                      setDateFrom((e.target as HTMLInputElement).value)
                    }
                  />
                  <Input
                    className="flex-1"
                    classNames={{ inputWrapper: "h-10 w-full" }}
                    type="date"
                    value={dateTo}
                    variant="bordered"
                    onChange={(e) =>
                      setDateTo((e.target as HTMLInputElement).value)
                    }
                  />
                </div>
              </div>
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
