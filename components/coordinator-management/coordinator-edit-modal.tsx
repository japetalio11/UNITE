"use client";
import React, { useState, useEffect } from "react";
import { Eye, EyeSlash as EyeOff } from "@gravity-ui/icons";
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
  const [accountType, setAccountType] = useState("");

  const [districts, setDistricts] = useState<any[]>([]);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [province, setProvince] = useState<string>("");
  const [provinces, setProvinces] = useState<any[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(
    null,
  );
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // When coordinator prop changes, populate form fields and try to resolve province/district ids
  useEffect(() => {
    if (!coordinator) return;
    const staff =
      coordinator.Staff || coordinator.staff || coordinator.staffData || {};

    setFirstName(staff.First_Name || staff.FirstName || staff.firstName || "");
    setMiddleName(
      staff.Middle_Name || staff.MiddleName || staff.middleName || "",
    );
    setLastName(staff.Last_Name || staff.LastName || staff.lastName || "");
    setEmail(staff.Email || staff.email || "");
    setPhoneNumber(
      staff.Phone_Number || staff.phoneNumber || staff.phone || "",
    );
    setAccountType(coordinator.accountType || "");

    // Try to derive province and district ids or fallback to legacy names/ids
    const districtObj = coordinator.District || null;
    const legacyDistrictId =
      coordinator.District_ID ||
      coordinator.DistrictId ||
      (districtObj &&
        (districtObj.District_ID || districtObj.id || districtObj._id)) ||
      null;
    const legacyProvinceName =
      coordinator.Province_Name ||
      (districtObj &&
        (districtObj.Province_Name ||
          districtObj.province ||
          districtObj.Province)) ||
      coordinator.province ||
      null;

    setDistrictId(legacyDistrictId || null);
    setProvince(legacyProvinceName || "");

    // If coordinator already has a province ObjectId, select it directly
    if (coordinator.province) {
      setSelectedProvinceId(String(coordinator.province));
    }

    // We'll try to map province name to a province id after provinces load (effect below)
  }, [coordinator]);

  // Fetch provinces and try to resolve selected province id
  useEffect(() => {
    const fetchProvinces = async () => {
      setProvincesLoading(true);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_URL || ""}/api/locations/provinces`, {
          headers,
        });
        const text = await res.text();
        let body: any = null;

        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = null;
        }
        const items = (body && (body.data || body.provinces)) || [];
        const normalized = Array.isArray(items)
          ? items.map((p: any) => ({
              id: p._id || p.id || p.code || p.name,
              name: p.name || p.Province_Name || p.Name,
            }))
          : [];

        setProvinces(normalized);

        // If coordinator had a province name, try to find matching province id
        if (province) {
          const match = normalized.find(
            (p: any) =>
              String(p.name).toLowerCase() === String(province).toLowerCase(),
          );

          if (match) setSelectedProvinceId(match.id);
        }
      } catch (e) {
        // ignore
      } finally {
        setProvincesLoading(false);
      }
    };

    fetchProvinces();
  }, [province]);

  // When selectedProvinceId changes, fetch districts for that province
  useEffect(() => {
    if (!selectedProvinceId) return;
    const fetchDistricts = async () => {
      setDistrictsLoading(true);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(
          `${API_URL || ""}/api/locations/provinces/${encodeURIComponent(selectedProvinceId)}/districts?limit=1000`,
          { headers },
        );
        const text = await res.text();
        let body: any = null;

        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = null;
        }
        const items = (body && (body.data || body.districts)) || [];
        const normalized = Array.isArray(items)
          ? items.map((d: any) => ({
              id: d._id || d.id || d.District_ID,
              name: d.name || d.District_Name || d.District_Number,
              legacyId: d.District_ID,
            }))
          : [];

        setDistricts(normalized);

        // If coordinator had a legacy district id, try to select it
        if (districtId) {
          const match = normalized.find(
            (x: any) => String(x.legacyId || x.id) === String(districtId),
          );

          if (match) setDistrictId(match.id);
        }
      } catch (e) {
        // ignore
      } finally {
        setDistrictsLoading(false);
      }
    };

    fetchDistricts();
  }, [selectedProvinceId]);

  useEffect(() => {
    // when districtId changes, auto-fill province name if possible
    if (!districtId || districts.length === 0) return;
    const pick = districts.find(
      (d) =>
        String(d.id) === String(districtId) ||
        String(d.legacyId) === String(districtId),
    );

    if (pick) {
      setProvince(pick.name || province || "");
    }
  }, [districtId, districts]);

  if (!coordinator) return null;

  const displayedProvinceName =
    (provinces &&
      provinces.find((p) => String(p.id) === String(selectedProvinceId))
        ?.name) ||
    province ||
    "";

  const displayedDistrictName =
    (districts &&
      districts.find((d) => String(d.id) === String(districtId))?.name) ||
    (coordinator.District &&
      (coordinator.District.District_Name ||
        coordinator.District.name ||
        coordinator.District.District_ID)) ||
    "";

  const coordinatorName =
    coordinator.Staff &&
    (coordinator.Staff.First_Name || coordinator.Staff.firstName)
      ? `${coordinator.Staff.First_Name || coordinator.Staff.firstName} ${coordinator.Staff.Last_Name || coordinator.Staff.lastName || ""}`
      : coordinator.name || "";

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

      // Client-side validation: require province and district selection
      if (!selectedProvinceId || !districtId) {
        setValidationErrors([
          "Please select both Province and District before saving.",
        ]);
        setIsSubmitting(false);

        return;
      }

      // Validate account type selection
      if (!accountType) {
        setValidationErrors([
          "Please select an Assignment before saving.",
        ]);
        setIsSubmitting(false);

        return;
      }

      // Build payload: include both new refs and legacy fields for compatibility
      const payload: any = {};

      if (firstName) payload.First_Name = firstName;
      if (middleName !== undefined) payload.Middle_Name = middleName;
      if (lastName) payload.Last_Name = lastName;
      if (email) payload.Email = email;
      if (phoneNumber) payload.Phone_Number = phoneNumber;

      // New normalized fields (ObjectId refs)
      payload.district = districtId;
      payload.province = selectedProvinceId;
      payload.accountType = accountType;

      // Legacy compatibility fields
      payload.District_ID = districtId;
      payload.Province_Name = displayedProvinceName;
      // Optional password change
      if (newPassword && newPassword.length > 0) {
        payload.Password = newPassword;
      }

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
      size="xl"
      onClose={onClose}
    >
      <ModalContent className="max-w-3xl rounded-xl">
        <ModalHeader className="flex items-start gap-4 pb-2">
          <div className="w-12 h-12 rounded-full bg-default-100 flex items-center justify-center">
            <svg
              fill="none"
              height="20"
              viewBox="0 0 24 24"
              width="20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"
                stroke="#333"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.2"
              />
              <path
                d="M4 20c0-2.21 3.58-4 8-4s8 1.79 8 4"
                stroke="#333"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.2"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">Edit Coordinator</h2>
            <p className="text-sm text-default-500">
              Start providing your information by selecting your blood type. Add
              details below to proceed.
            </p>
          </div>
        </ModalHeader>
        <ModalBody className="py-4">
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">First name</label>
                <Input
                  classNames={{ inputWrapper: "h-12" }}
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
                  classNames={{ inputWrapper: "h-12" }}
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
                  classNames={{ inputWrapper: "h-12" }}
                  type="text"
                  value={lastName}
                  variant="bordered"
                  onChange={(e) =>
                    setLastName((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  classNames={{ inputWrapper: "h-12" }}
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
                  classNames={{ inputWrapper: "h-12" }}
                  type="tel"
                  value={phoneNumber}
                  variant="bordered"
                  onChange={(e) =>
                    setPhoneNumber((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Assignment</label>
              <Select
                placeholder="Select assignment"
                selectedKeys={accountType ? [accountType] : []}
                onSelectionChange={(keys: any) => {
                  const type = Array.from(keys)[0] as string;
                  setAccountType(type);
                }}
              >
                <SelectItem key="LGU" textValue="LGU">
                  LGU
                </SelectItem>
                <SelectItem key="Others" textValue="Others">
                  Others
                </SelectItem>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Province</label>
                <Select
                  placeholder={
                    provincesLoading ? "Loading..." : "Select province"
                  }
                  selectedKeys={
                    selectedProvinceId ? [String(selectedProvinceId)] : []
                  }
                  onSelectionChange={(keys: any) => {
                    const id = Array.from(keys)[0] as string;

                    setSelectedProvinceId(id);
                    // clear previous district selection when province changes
                    setDistrictId(null);
                  }}
                >
                  {(provinces || []).map((p) => (
                    <SelectItem key={String(p.id)} textValue={String(p.name)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">District</label>
                <Select
                  disabled={!selectedProvinceId}
                  placeholder={
                    selectedProvinceId
                      ? districtsLoading
                        ? "Loading..."
                        : "Select district"
                      : "Select province first"
                  }
                  selectedKeys={districtId ? [String(districtId)] : []}
                  onSelectionChange={(keys: any) => {
                    const id = Array.from(keys)[0] as string;

                    setDistrictId(id);
                  }}
                >
                  {(districts || []).map((d) => (
                    <SelectItem key={String(d.id)} textValue={String(d.name)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Change Password</label>
              <Input
                classNames={{ inputWrapper: "h-12" }}
                endContent={
                  <button
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="focus:outline-none"
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? (
                      <Eye
                        className="text-default-800 pointer-events-none w-5 h-5"
                      />
                    ) : (
                      <EyeOff
                        className="text-default-800 pointer-events-none w-5 h-5"
                      />
                    )}
                  </button>
                }
                placeholder="Leave blank to keep current password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                variant="bordered"
                onChange={(e) =>
                  setNewPassword((e.target as HTMLInputElement).value)
                }
              />
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
        <ModalFooter className="gap-3">
          <Button className="px-6" variant="bordered" onPress={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-black text-white px-6"
            color="default"
            disabled={isSubmitting}
            onPress={handleSave}
          >
            {isSubmitting ? "Saving..." : "Edit Coordinator"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
