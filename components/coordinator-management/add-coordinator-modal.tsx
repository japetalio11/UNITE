"use client";

import { useState, useEffect } from "react";
import { Users, Eye, EyeOff } from "lucide-react";
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

interface AddCoordinatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CoordinatorFormData) => void;
  isSubmitting?: boolean;
}

interface CoordinatorFormData {
  firstName: string;
  middleName?: string;
  lastName: string;
  coordinatorName?: string; // optional assembled name
  coordinatorEmail: string;
  contactNumber: string;
  password: string;
  retypePassword: string;
  province: string;
  district: string;
  districtId?: string;
}

export default function AddCoordinatorModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: AddCoordinatorModalProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [provinces, setProvinces] = useState<any[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [provincesError, setProvincesError] = useState<string | null>(null);

  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [districtsError, setDistrictsError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const firstName = (formData.get("firstName") || "").toString();
    const middleName = (formData.get("middleName") || "").toString();
    const lastName = (formData.get("lastName") || "").toString();

    const data: CoordinatorFormData = {
      firstName,
      middleName,
      lastName,
      coordinatorName: [firstName, middleName, lastName]
        .filter(Boolean)
        .join(" "),
      coordinatorEmail: formData.get("coordinatorEmail") as string,
      contactNumber: formData.get("contactNumber") as string,
      password: formData.get("password") as string,
      retypePassword: formData.get("retypePassword") as string,
      province: selectedProvince,
      district: formData.get("district") as string,
      districtId: selectedDistrictId,
    };

    // Validate passwords match
    if (data.password !== data.retypePassword) {
      alert("Passwords do not match!");

      return;
    }

    // Validate province/district selected
    if (!data.province || !data.district) {
      alert("Please select a Province and District before submitting.");

      return;
    }

    onSubmit(data);
  };

  const handleProvinceChange = (keys: any) => {
    const province = Array.from(keys)[0] as string;

    setSelectedProvince(province);
  };

  // Fetch provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      setProvincesLoading(true);
      setProvincesError(null);
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/locations/provinces`
          : `/api/locations/provinces`;
        let token = null;

        try {
          token =
            localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token");
        } catch (e) {
          token = null;
        }
        const headers: any = {};

        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(url, { headers });
        const bodyText = await res.text();
        let body: any = null;

        try {
          body = bodyText ? JSON.parse(bodyText) : null;
        } catch {
          throw new Error("Invalid JSON from provinces endpoint");
        }
        if (!res.ok)
          throw new Error(
            body?.message || `Failed to fetch provinces (status ${res.status})`,
          );
        const items = body.data || body.provinces || [];
        // Normalize to { id, name }
        const normalized = items.map((p: any) => ({
          id: p._id || p.id || p._doc?._id || p.id,
          name: p.name || p.Name || p.Province_Name || p.Province_Name,
        }));

        setProvinces(normalized.filter(Boolean));
      } catch (err: any) {
        setProvincesError(err.message || "Failed to load provinces");
      } finally {
        setProvincesLoading(false);
      }
    };

    fetchProvinces();
  }, []);

  // Fetch districts for selected province
  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([]);
      setSelectedDistrictId("");

      return;
    }

    const fetchDistricts = async () => {
      setDistrictsLoading(true);
      setDistrictsError(null);
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/locations/provinces/${encodeURIComponent(selectedProvince)}/districts?limit=1000`
          : `/api/locations/provinces/${encodeURIComponent(selectedProvince)}/districts?limit=1000`;

        let token = null;

        try {
          token =
            localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token");
        } catch (e) {
          token = null;
        }

        const headers: any = {};

        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(url, { headers });
        const bodyText = await res.text();
        let body: any = null;

        try {
          body = bodyText ? JSON.parse(bodyText) : null;
        } catch {
          throw new Error("Invalid JSON from districts endpoint");
        }
        if (!res.ok)
          throw new Error(
            body?.message || `Failed to fetch districts (status ${res.status})`,
          );
        const items = body.data || body.districts || [];
        const normalized = items.map((d: any) => ({
          id: d._id || d.id || d.District_ID,
          name: d.name || d.Name || d.District_Name || d.District_Number,
        }));

        setDistricts(normalized.filter(Boolean));
      } catch (err: any) {
        setDistrictsError(err.message || "Failed to load districts");
      } finally {
        setDistrictsLoading(false);
      }
    };

    fetchDistricts();
  }, [selectedProvince]);

  return (
    <Modal
      classNames={{
        base: "max-h-[95vh]",
        body: "py-6",
      }}
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="4xl"
      onClose={onClose}
    >
      <ModalContent className="w-full max-w-[980px]">
        {(onClose) => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex flex-col gap-1 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gray-100 rounded-lg">
                    <Users className="w-5 h-5 text-gray-700" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Add Coordinator
                  </h2>
                </div>
              </div>
              <p className="text-sm font-normal text-gray-500 mt-2 ml-0">
                Please enter the coordinator&apos;s information below to add
                them to the system.
              </p>
            </ModalHeader>

            <ModalBody className="gap-5 py-6">
              {/* First / Middle / Last Name Inputs (middle optional) */}
              <div className="grid grid-cols-3 gap-4">
                <Input
                  isRequired
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    inputWrapper: "border-gray-200",
                  }}
                  label="First Name"
                  name="firstName"
                  placeholder="First name"
                  radius="md"
                  size="md"
                  type="text"
                  variant="bordered"
                />
                <Input
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    inputWrapper: "border-gray-200",
                  }}
                  isRequired={false}
                  label="Middle Name"
                  name="middleName"
                  placeholder="Middle name (optional)"
                  radius="md"
                  size="md"
                  type="text"
                  variant="bordered"
                />
                <Input
                  isRequired
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    inputWrapper: "border-gray-200",
                  }}
                  label="Last Name"
                  name="lastName"
                  placeholder="Last name"
                  radius="md"
                  size="md"
                  type="text"
                  variant="bordered"
                />
              </div>

              {/* Coordinator Email Input */}
              <Input
                isRequired
                classNames={{
                  label: "text-sm font-medium text-gray-900",
                  inputWrapper: "border-gray-200",
                }}
                label="Coordinator Email"
                name="coordinatorEmail"
                placeholder="Enter coordinator email"
                radius="md"
                size="md"
                type="email"
                variant="bordered"
              />

              {/* Contact Number Input */}
              <Input
                isRequired
                classNames={{
                  label: "text-sm font-medium text-gray-900",
                  inputWrapper: "border-gray-200",
                }}
                label="Contact Number"
                name="contactNumber"
                placeholder="Enter contact number"
                radius="md"
                size="md"
                type="tel"
                variant="bordered"
              />

              {/* Set Password Input */}
              <Input
                isRequired
                classNames={{
                  label: "text-sm font-medium text-gray-900",
                  inputWrapper: "border-gray-200",
                }}
                endContent={
                  <button
                    className="focus:outline-none"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                }
                label="Set Password"
                name="password"
                placeholder="Set password"
                radius="md"
                size="md"
                type={showPassword ? "text" : "password"}
                variant="bordered"
              />

              {/* Retype Password Input */}
              <Input
                isRequired
                classNames={{
                  label: "text-sm font-medium text-gray-900",
                  inputWrapper: "border-gray-200",
                }}
                endContent={
                  <button
                    className="focus:outline-none"
                    type="button"
                    onClick={() => setShowRetypePassword(!showRetypePassword)}
                  >
                    {showRetypePassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                }
                label="Retype Password"
                name="retypePassword"
                placeholder="Enter contact number"
                radius="md"
                size="md"
                type={showRetypePassword ? "text" : "password"}
                variant="bordered"
              />

              {/* Province first, then District dropdown filtered by province */}
              <div className="grid grid-cols-2 gap-4">
                <Select
                  isRequired
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    trigger: "border-gray-200",
                  }}
                  label="Province"
                  name="province"
                  placeholder={
                    provincesLoading
                      ? "Loading provinces..."
                      : "Choose Province"
                  }
                  radius="md"
                  selectedKeys={selectedProvince ? [selectedProvince] : []}
                  size="md"
                  variant="bordered"
                  onSelectionChange={(keys: any) => {
                    const id = Array.from(keys)[0] as string;

                    setSelectedProvince(id);
                  }}
                >
                  {provinces.map((prov) => (
                    <SelectItem
                      key={String(prov.id)}
                      textValue={String(prov.name)}
                    >
                      {String(prov.name)}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  isRequired
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    trigger: "border-gray-200",
                  }}
                  label="District"
                  name="district"
                  placeholder={
                    districtsLoading
                      ? "Loading districts..."
                      : selectedProvince
                        ? "Choose District"
                        : "Select province first"
                  }
                  radius="md"
                  selectedKeys={selectedDistrictId ? [selectedDistrictId] : []}
                  size="md"
                  variant="bordered"
                  onSelectionChange={(keys: any) => {
                    const id = Array.from(keys)[0] as string;

                    setSelectedDistrictId(id);
                  }}
                >
                  {districts.map((district) => (
                    <SelectItem
                      key={String(district.id)}
                      textValue={String(district.name)}
                    >
                      {String(district.name)}
                    </SelectItem>
                  ))}
                </Select>

                {/* Hidden inputs so FormData includes these values on submit (IDs) */}
                <input
                  name="district"
                  type="hidden"
                  value={selectedDistrictId}
                />
                <input name="province" type="hidden" value={selectedProvince} />
              </div>
            </ModalBody>

            <ModalFooter className="pt-4 pb-6 gap-3 justify-end">
              <Button
                className="w-36 px-3 py-2 border-gray-300 font-medium"
                radius="md"
                size="md"
                type="button"
                variant="bordered"
                onPress={onClose}
              >
                Cancel
              </Button>
              <Button
                className="w-36 px-3 py-2 bg-black text-white font-medium"
                color="default"
                isDisabled={isSubmitting}
                radius="md"
                size="md"
                type="submit"
              >
                {isSubmitting ? "Adding..." : "Add Coordinator"}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
