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
import { Select, SelectItem } from "@heroui/select";

interface EditCoordinatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinator: any | null; // coordinator object returned from backend
  onSaved?: () => void;
}

export default function EditCoordinatorModal({
  isOpen,
  onClose,
  coordinator,
  onSaved,
}: EditCoordinatorModalProps) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [districts, setDistricts] = useState<any[]>([]);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [province, setProvince] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    if (!coordinator) return;
    // coordinator may have nested Staff and District based on backend
    const staff =
      coordinator.Staff || coordinator.staff || coordinator.staffData || {};

    setFirstName(staff.First_Name || staff.FirstName || staff.firstName || "");
    setMiddleName(
      staff.Middle_Name || staff.MiddleName || staff.middleName || "",
    );
    setLastName(staff.Last_Name || staff.LastName || staff.lastName || "");
    setEmail(staff.Email || staff.email || "");
    setPhoneNumber(
      staff.Phone_Number ||
        staff.Phone_Number ||
        staff.phoneNumber ||
        staff.phone ||
        "",
    );

    const dist =
      coordinator.District ||
      coordinator.District_ID ||
      coordinator.DistrictId ||
      coordinator.District ||
      coordinator.district ||
      null;
    // try to derive district id
    const dId =
      coordinator.District_ID ||
      coordinator.DistrictId ||
      coordinator.DistrictId ||
      coordinator.District?.District_ID ||
      dist;

    setDistrictId(dId || null);

    const prov =
      (coordinator.District &&
        (coordinator.District.Province_Name ||
          coordinator.District.Province)) ||
      coordinator.Province_Name ||
      coordinator.province ||
      "";

    setProvince(prov || "");
  }, [coordinator]);

  useEffect(() => {
    // fetch districts for the select dropdown
    (async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/api/districts?limit=1000`, {
          headers,
        });
        const text = await res.text();
        let body: any = null;

        try {
          body = JSON.parse(text);
        } catch (e) {
          body = { data: [] };
        }
        const data = body?.data || body || [];

        if (Array.isArray(data)) setDistricts(data);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    // when districtId changes, auto-fill province from list
    if (!districtId) return;
    const pick = districts.find(
      (d) =>
        d.District_ID ||
        d.id ||
        d._id ||
        String(d.District_ID) === String(districtId),
    );

    if (pick)
      setProvince(pick.Province_Name || pick.Province || pick.province || "");
  }, [districtId, districts]);

  if (!coordinator) return null;

  const handleSave = async () => {
    if (!coordinator) return;
    setIsSubmitting(true);
    setValidationErrors([]);
    try {
      const coordId =
        coordinator.Coordinator_ID ||
        coordinator.CoordinatorId ||
        coordinator.id ||
        coordinator._id;

      if (!coordId) throw new Error("Coordinator id not available");

      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Build flat payload expected by backend validator and service
      const payload: any = {};

      if (firstName) payload.First_Name = firstName;
      // allow empty string for middle name to clear
      if (middleName !== undefined) payload.Middle_Name = middleName;
      if (lastName) payload.Last_Name = lastName;
      if (email) payload.Email = email;
      if (phoneNumber) payload.Phone_Number = phoneNumber;
      if (districtId) payload.District_ID = districtId;
      if (province !== undefined) payload.Province_Name = province;

      const res = await fetch(`${API_URL}/api/coordinators/${coordId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let resp: any = null;

      try {
        resp = JSON.parse(text);
      } catch (e) {
        resp = { message: text };
      }
      if (!res.ok) {
        if (resp && resp.errors && Array.isArray(resp.errors)) {
          setValidationErrors(resp.errors);

          return;
        }
        throw new Error(resp.message || "Failed to update coordinator");
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      console.error("EditCoordinatorModal save error", err);
      setValidationErrors([err?.message || "Failed to save changes"]);
    } finally {
      setIsSubmitting(false);
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
        <ModalHeader className="flex items-center gap-3 pb-4">
          <div>
            <h2 className="text-xl font-semibold">Edit coordinator</h2>
            <p className="text-xs text-default-500">Edit coordinator details</p>
          </div>
        </ModalHeader>
        <ModalBody className="py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm font-medium">First name</label>
                <Input
                  classNames={{ inputWrapper: "h-10" }}
                  type="text"
                  value={firstName}
                  variant="bordered"
                  onChange={(e) =>
                    setFirstName((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Middle name</label>
                <Input
                  classNames={{ inputWrapper: "h-10" }}
                  type="text"
                  value={middleName}
                  variant="bordered"
                  onChange={(e) =>
                    setMiddleName((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last name</label>
                <Input
                  classNames={{ inputWrapper: "h-10" }}
                  type="text"
                  value={lastName}
                  variant="bordered"
                  onChange={(e) =>
                    setLastName((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Contact Email</label>
                <Input
                  classNames={{ inputWrapper: "h-10" }}
                  type="email"
                  value={email}
                  variant="bordered"
                  onChange={(e) =>
                    setEmail((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contact Number</label>
                <Input
                  classNames={{ inputWrapper: "h-10" }}
                  type="tel"
                  value={phoneNumber}
                  variant="bordered"
                  onChange={(e) =>
                    setPhoneNumber((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">District</label>
                <Select
                  placeholder="Select district"
                  selectedKeys={districtId ? [String(districtId)] : []}
                  onSelectionChange={(keys: any) => {
                    const id = Array.from(keys)[0] as string;

                    setDistrictId(id);
                    const pick = districts.find(
                      (d) =>
                        String(d.District_ID) === String(id) ||
                        String(d.id) === String(id) ||
                        String(d._id) === String(id),
                    );

                    if (pick)
                      setProvince(
                        pick.Province_Name ||
                          pick.Province ||
                          pick.province ||
                          "",
                      );
                  }}
                >
                  {(districts || []).map((d) => (
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
                  type="text"
                  value={province}
                  variant="bordered"
                />
              </div>
            </div>

            {validationErrors && validationErrors.length > 0 && (
              <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded">
                <h4 className="text-sm font-semibold">Validation error</h4>
                <ul className="text-xs mt-2 list-disc list-inside">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-black text-white"
            color="default"
            disabled={isSubmitting}
            onPress={handleSave}
          >
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
