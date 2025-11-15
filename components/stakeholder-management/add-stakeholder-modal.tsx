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

import { getUserInfo } from "@/utils/getUserInfo";

interface AddStakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
  // If true, user is a system admin and can choose any district. Otherwise district should be locked.
  isSysAdmin?: boolean;
  // When provided, the modal will default and lock to this district id for non-admins
  userDistrictId?: string | null;
  // Optional list of districts passed from parent to avoid refetching
  districtsProp?: any[];
  modalError?: string | null;
  onClearError?: () => void;
}

export default function AddStakeholderModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  isSysAdmin = false,
  userDistrictId = null,
  districtsProp = undefined,
  modalError = null,
  onClearError = undefined,
}: AddStakeholderModalProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [districtsError, setDistrictsError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [cityInput, setCityInput] = useState<string>("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const firstName = (formData.get("firstName") || "").toString();
    const middleName = (formData.get("middleName") || "").toString();
    const lastName = (formData.get("lastName") || "").toString();

    const data: any = {
      firstName,
      middleName,
      lastName,
      stakeholderName: [firstName, middleName, lastName]
        .filter(Boolean)
        .join(" "),
      stakeholderEmail: formData.get("coordinatorEmail") as string,
      contactNumber: formData.get("contactNumber") as string,
      organization: (formData.get("organization") as string) || "",
      password: formData.get("password") as string,
      retypePassword: formData.get("retypePassword") as string,
      province: selectedProvince,
      district: formData.get("district") as string,
      districtId: selectedDistrictId,
      // include city / municipality required by backend
      cityMunicipality: formData.get("cityMunicipality") as string,
    };

    // Validate passwords match
    if (data.password !== data.retypePassword) {
      alert("Passwords do not match!");

      return;
    }

    onSubmit(data);
  };

  const handleProvinceChange = (keys: any) => {
    const province = Array.from(keys)[0] as string;

    setSelectedProvince(province);
  };

  const provinces = Array.from(
    new Set(districts.map((d) => d.Province_Name)),
  ).map((p) => ({ key: p, label: p }));

  const ordinalSuffix = (n: number | string) => {
    const num = Number(n);

    if (Number.isNaN(num)) return String(n);
    const j = num % 10,
      k = num % 100;

    if (j === 1 && k !== 11) return `${num}st`;
    if (j === 2 && k !== 12) return `${num}nd`;
    if (j === 3 && k !== 13) return `${num}rd`;

    return `${num}th`;
  };

  const formatDistrict = (d: any) => {
    if (!d) return "";
    if (d.District_Number)
      return `${ordinalSuffix(d.District_Number)} District`;
    if (d.District_Name) return d.District_Name;

    return String(d.District_ID || "");
  };

  const districtObj =
    districts.find(
      (x) => String(x.District_ID) === String(selectedDistrictId),
    ) || null;
  // Fallbacks: if district object isn't available yet, try to infer a friendly label from the id
  let districtLabel = "";

  if (districtObj) {
    districtLabel = formatDistrict(districtObj);
  } else if (selectedDistrictId) {
    // try to parse a trailing number from the id (e.g., CSUR-001 -> 1st District)
    const m = String(selectedDistrictId).match(/(\d+)$/);

    if (m) {
      const num = Number(m[1]);

      if (!Number.isNaN(num)) districtLabel = `${ordinalSuffix(num)} District`;
      else districtLabel = String(selectedDistrictId);
    } else {
      districtLabel = String(selectedDistrictId);
    }
  }

  const computedProvince =
    selectedProvince ||
    (districtObj && (districtObj.Province_Name || districtObj.ProvinceName)) ||
    "";
  const computedCity =
    (districtObj &&
      (districtObj.City_Municipality ||
        districtObj.City ||
        districtObj.CityMunicipality)) ||
    "";

  // Keep a local editable copy of city so users can override the auto-filled value
  useEffect(() => {
    setCityInput(computedCity || "");
  }, [computedCity]);

  // Fetch districts from backend on mount
  useEffect(() => {
    // If parent provided districts, use them
    if (Array.isArray(districtsProp) && districtsProp.length > 0) {
      setDistricts(districtsProp);

      return;
    }

    const fetchDistricts = async () => {
      setDistrictsLoading(true);
      setDistrictsError(null);
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/districts?limit=1000`
          : `/api/districts?limit=1000`;
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
        const items = body.data || [];

        setDistricts(items);
      } catch (err: any) {
        setDistrictsError(err.message || "Failed to load districts");
      } finally {
        setDistrictsLoading(false);
      }
    };

    fetchDistricts();
  }, []);

  // If the user is not a sys admin and a userDistrictId is provided, lock selection to that id
  useEffect(() => {
    // Primary path: parent passed the district id
    if (!isSysAdmin && userDistrictId) {
      setSelectedDistrictId(String(userDistrictId));
      const d = districts.find(
        (x) => String(x.District_ID) === String(userDistrictId),
      );

      if (d) setSelectedProvince(d.Province_Name || "");

      return;
    }

    // Fallback: if parent didn't provide a district id, attempt to compute it here
    if (!isSysAdmin && !userDistrictId) {
      let uid: any = null;
      let parsed: any = null;
      let info: any = null;

      try {
        info = getUserInfo();
        if (info && info.raw) {
          const r = info.raw;

          uid =
            r?.District_ID ||
            r?.DistrictId ||
            r?.districtId ||
            r?.district_id ||
            (r?.role_data &&
              (r.role_data.district_id ||
                r.role_data.districtId ||
                r.role_data.district)) ||
            null;
        }
      } catch (e) {
        /* ignore */
      }

      if (!uid) {
        try {
          const raw =
            localStorage.getItem("unite_user") ||
            sessionStorage.getItem("unite_user");

          // Debug raw stored user (truncate to avoid huge logs) to help diagnose shape
          try {
            console.log(
              "[AddStakeholderModal] raw unite_user (truncated):",
              raw ? String(raw).slice(0, 300) : null,
            );
          } catch (e) {}
          parsed = raw ? JSON.parse(raw) : null;
        } catch (e) {
          parsed = null;
        }

        const p = parsed || {};

        uid =
          p?.District_ID ||
          p?.DistrictId ||
          p?.districtId ||
          p?.district_id ||
          (p?.role_data &&
            (p.role_data.district_id ||
              p.role_data.districtId ||
              p.role_data.district)) ||
          (p?.user &&
            (p.user.District_ID ||
              p.user.DistrictId ||
              p.user.districtId ||
              p.user.district_id)) ||
          null;

        // If still no district id, try fetching the coordinator/stakeholder record from backend
        if (!uid) {
          const infoId =
            info?.raw?.id || info?.raw?.ID || parsed?.id || parsed?.ID || null;

          if (infoId) {
            (async () => {
              try {
                const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(
                  /\/$/,
                  "",
                );
                // If the user is a Coordinator, the correct endpoint is /api/coordinators/:id
                const isCoordinatorId =
                  String(infoId).toLowerCase().startsWith("coord_") ||
                  String(info?.raw?.role || "")
                    .toLowerCase()
                    .includes("coordinator");
                const url = base
                  ? isCoordinatorId
                    ? `${base}/api/coordinators/${encodeURIComponent(infoId)}`
                    : `${base}/api/stakeholders/${encodeURIComponent(infoId)}`
                  : isCoordinatorId
                    ? `/api/coordinators/${encodeURIComponent(infoId)}`
                    : `/api/stakeholders/${encodeURIComponent(infoId)}`;
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
                const txt = await res.text();
                let j: any = null;

                try {
                  j = txt ? JSON.parse(txt) : null;
                } catch (e) {
                  j = null;
                }
                const rec = j?.data || j?.stakeholder || j || null;

                if (rec) {
                  const foundUid =
                    rec?.District_ID ||
                    rec?.district_id ||
                    rec?.DistrictId ||
                    (rec?.role_data &&
                      (rec.role_data.district_id ||
                        rec.role_data.districtId ||
                        rec.role_data.district)) ||
                    (rec?.District &&
                      (rec.District.District_ID || rec.District.DistrictId)) ||
                    null;

                  if (foundUid) {
                    uid = foundUid;
                    const d = districts.find(
                      (x) => String(x.District_ID) === String(uid),
                    );

                    if (d) setSelectedProvince(d.Province_Name || "");
                    setSelectedDistrictId(String(uid));
                  }
                }
              } catch (e) {
                // ignore network errors here
              }
            })();
          }
        }
      }

      if (uid) {
        setSelectedDistrictId(String(uid));
        const d = districts.find((x) => String(x.District_ID) === String(uid));

        if (d) setSelectedProvince(d.Province_Name || "");
      }

      // Debug: show what we found locally so you can paste this to me if still wrong
      try {
        // eslint-disable-next-line no-console
        console.log("[AddStakeholderModal] fallback debug:", {
          isOpen,
          isSysAdmin,
          userDistrictId,
          computed: uid,
          getUserInfo: info,
          parsedLocal: parsed,
        });
      } catch (e) {}
    }
  }, [isSysAdmin, userDistrictId, districts]);

  // Debug: log key values so we can see whether modal knows the coordinator's district
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log("[AddStakeholderModal] debug:", {
        isOpen,
        isSysAdmin,
        userDistrictId,
        selectedDistrictId,
        districtsCount: Array.isArray(districts) ? districts.length : 0,
        resolvedDistrict:
          districts.find(
            (x) => String(x.District_ID) === String(selectedDistrictId),
          ) || null,
      });
    } catch (e) {
      // ignore console problems
    }
  }, [isOpen, isSysAdmin, userDistrictId, selectedDistrictId, districts]);

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
                    Add Stakeholder
                  </h2>
                </div>
              </div>
              <p className="text-sm font-normal text-gray-500 mt-2 ml-0">
                Please enter the stakeholder&apos;s information below to add them to
                the system.
              </p>
            </ModalHeader>

            <ModalBody className="gap-5 py-6">
              {/* Inline modal error (friendly message from parent) */}
              {modalError && (
                <div className="mb-3 px-4 py-2 bg-red-50 border border-red-100 text-sm text-red-700 rounded">
                  {modalError}
                  <button
                    className="ml-3 text-xs text-red-500 underline"
                    type="button"
                    onClick={() => {
                      if (onClearError) onClearError();
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              )}
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

              {/* Email and Contact Number on same row to save vertical space */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  isRequired
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    inputWrapper: "border-gray-200",
                  }}
                  label="Stakeholder Email"
                  name="coordinatorEmail"
                  placeholder="Enter stakeholder email"
                  radius="md"
                  size="md"
                  type="email"
                  variant="bordered"
                />
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
              </div>

              {/* Organization / Institution Input */}
              {/* Organization and City on same row */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    inputWrapper: "border-gray-200",
                  }}
                  isRequired={false}
                  label="Organization / Institution"
                  name="organization"
                  placeholder="Enter organization or institution (optional)"
                  radius="md"
                  size="md"
                  type="text"
                  variant="bordered"
                />

                {/* City / Municipality is auto-filled from the selected district and not editable */}
                <div>
                  <Input
                    isRequired
                    classNames={{
                      label: "text-sm font-medium text-gray-900",
                      inputWrapper: "border-gray-200",
                    }}
                    label="City / Municipality"
                    name="cityMunicipality"
                    placeholder="Enter city or municipality"
                    radius="md"
                    size="md"
                    type="text"
                    value={cityInput}
                    variant="bordered"
                    onChange={(e: any) => setCityInput(e.target.value)}
                  />
                </div>
              </div>

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

              {/* District (left) and Province (right). Province is auto-filled and read-only based on district selection */}
              <div className="grid grid-cols-2 gap-4">
                {isSysAdmin ? (
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
                        : "Choose District"
                    }
                    radius="md"
                    selectedKeys={
                      selectedDistrictId
                        ? new Set([String(selectedDistrictId)])
                        : new Set()
                    }
                    size="md"
                    variant="bordered"
                    onSelectionChange={(keys: any) => {
                      const id = Array.from(keys)[0] as string;

                      setSelectedDistrictId(String(id));
                      const d = districts.find(
                        (x) => String(x.District_ID) === String(id),
                      );

                      if (d) setSelectedProvince(d.Province_Name || "");
                    }}
                  >
                    {districts.map((district) => (
                      <SelectItem key={String(district.District_ID)}>
                        {district.District_Name ||
                          district.District_Number ||
                          district.District_ID}
                      </SelectItem>
                    ))}
                  </Select>
                ) : (
                  // Non-admin: show a read-only input with the selected district label and include hidden fields
                  <div>
                    <Input
                      disabled
                      classNames={{
                        label: "text-sm font-medium text-gray-900",
                        inputWrapper: "border-gray-200 bg-gray-50",
                      }}
                      label="District"
                      name="district_display"
                      radius="md"
                      size="md"
                      type="text"
                      value={districtLabel}
                      variant="bordered"
                    />
                  </div>
                )}

                {/* Province is shown and cannot be modified directly */}
                <Input
                  disabled
                  isRequired
                  classNames={{
                    label: "text-sm font-medium text-gray-900",
                    inputWrapper: "border-gray-200 bg-gray-50",
                  }}
                  label="Province"
                  name="province"
                  placeholder="Province"
                  radius="md"
                  size="md"
                  type="text"
                  value={computedProvince}
                  variant="bordered"
                />

                {/* Hidden inputs so FormData includes these values on submit */}
                <input
                  name="district"
                  type="hidden"
                  value={selectedDistrictId}
                />
                <input name="province" type="hidden" value={computedProvince} />
              </div>

              {/* (City input removed from separate row — it's now on the same row as Organization above.) */}
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
                {isSubmitting ? "Adding..." : "Add Stakeholder"}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
