"use client";

import { useState, useEffect } from "react";
import { Persons as Users, Eye, EyeSlash as EyeOff } from "@gravity-ui/icons";
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
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("");
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [districtsError, setDistrictsError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [cityInput, setCityInput] = useState<string>("");
  const [selectedMunicipalityId, setSelectedMunicipalityId] =
    useState<string>("");
  const [municipalities, setMunicipalities] = useState<any[]>([]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const firstName = (formData.get("firstName") || "").toString();
    const middleName = (formData.get("middleName") || "").toString();
    const lastName = (formData.get("lastName") || "").toString();

    // Ensure municipality DB id is present when a district is selected.
    // Try to resolve from local `municipalities` list by id or name.
    let resolvedMunicipalityId: string | null = selectedMunicipalityId || null;

    const cityLabel =
      (formData.get("cityMunicipality") as string) || cityInput || "";

    if (!resolvedMunicipalityId && selectedDistrictId) {
      // try to match by name (case-insensitive) in loaded municipalities
      try {
        const found = (municipalities || []).find((m: any) => {
          const name = String(
            m.name || m.Name || m.City_Municipality || m.City || m,
          ).toLowerCase();

          return name === String(cityLabel || "").toLowerCase();
        });

        if (found)
          resolvedMunicipalityId = String(
            found._id ||
              found.id ||
              found.Municipality_ID ||
              found.MunicipalityId ||
              "",
          );
      } catch (e) {
        // ignore
      }
    }

    if (selectedDistrictId && !resolvedMunicipalityId) {
      // municipality is required by backend; surface helpful error instead of submitting
      // allow the consume of dismiss handler if available
      if (onClearError) onClearError();
      // set UI error and abort submit
      const msg =
        "Please select a City / Municipality from the list for the chosen District.";

      // use onSubmit flow to surface UI error rather than console
      (e.currentTarget as HTMLFormElement).scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      // set error via onClearError parent or rely on modalError prop from parent; fallback to alert
      try {
        // if parent exposes a setter via onClearError we already called it to clear previous
      } catch (err) {
        /* noop */
      }
      // set a temporary DOM-level alert by focusing modal — prefer parent modalError flow
      // We can't call setModalError here because this component receives modalError from parent.
      alert(msg);

      return;
    }

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
      province: (formData.get("province") as string) || computedProvince || "",
      district: formData.get("district") as string,
      districtId: selectedDistrictId,
      // include city / municipality required by backend
      cityMunicipality: formData.get("cityMunicipality") as string,
      // send resolved municipality DB id when available (form field name `municipality` expected by backend)
      municipality: resolvedMunicipalityId,
    };

    // Validate passwords match
    if (data.password !== data.retypePassword) {
      alert("Passwords do not match!");

      return;
    }

    onSubmit(data);
  };

  const handleProvinceChange = (keys: any) => {
    const provinceId = Array.from(keys)[0] as string;

    setSelectedProvinceId(provinceId);
    // reset district and municipalities when province changes so user picks ones within the new province
    setSelectedDistrictId("");
    setMunicipalities([]);
    setCityInput("");
  };

  const computedProvince =
    // prefer selected province name from provinces state
    provinces.find((p) => String(p._id || p.id) === String(selectedProvinceId))
      ?.name ||
    districts.find((d) => String(d.District_ID) === String(selectedDistrictId))
      ?.Province_Name ||
    "";

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

  // Return a best-effort label for a district object or id
  const getDistrictLabel = (d: any, idx: number) => {
    if (!d) return String(idx);

    if (typeof d === "string") return String(d);

    const maybeName =
      d.District_Name ||
      d.DistrictName ||
      d.name ||
      d.Name ||
      (d.District_Number ? formatDistrict(d) : null);

    if (maybeName) return String(maybeName);

    // fallback to common id fields
    return String(d.District_ID || d._id || d.id || idx);
  };

  // If some district items are missing friendly names, fetch their details
  useEffect(() => {
    if (!districts || districts.length === 0) return;

    const missing = districts.filter((d) => {
      if (!d) return false;
      if (typeof d === "string") return true;

      return !(
        d.District_Name ||
        d.name ||
        d.District_Number ||
        d.District_ID ||
        d._id ||
        d.id
      );
    });

    if (missing.length === 0) return;

    const ids = Array.from(
      new Set(
        missing
          .map((d) =>
            typeof d === "string" ? d : d.District_ID || d._id || d.id,
          )
          .filter(Boolean),
      ),
    );

    if (ids.length === 0) return;

    (async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
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

        const fetches = ids.map((id) => {
          const url = base
            ? `${base}/api/districts/${encodeURIComponent(id)}`
            : `/api/districts/${encodeURIComponent(id)}`;

          return fetch(url, { headers })
            .then((r) => r.text())
            .then((t) => {
              try {
                return t ? JSON.parse(t) : null;
              } catch {
                return null;
              }
            })
            .catch(() => null);
        });

        const results = await Promise.all(fetches);
        const fetched = results
          .map((r) => r?.data || r || null)
          .filter(Boolean)
          .map((r) => (Array.isArray(r) && r.length === 1 ? r[0] : r));

        if (fetched.length === 0) return;

        setDistricts((prev) =>
          prev.map((d) => {
            const id =
              typeof d === "string" ? d : d.District_ID || d._id || d.id;
            const found = fetched.find(
              (f: any) => String(f.District_ID || f._id || f.id) === String(id),
            );

            return found || d;
          }),
        );
      } catch (e) {
        // ignore network errors
      }
    })();
  }, [districts]);

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

  // Fetch provinces on mount and optionally use districtsProp
  useEffect(() => {
    if (Array.isArray(districtsProp) && districtsProp.length > 0) {
      setDistricts(districtsProp);
    }

    const fetchProvinces = async () => {
      setDistrictsLoading(true);
      setDistrictsError(null);
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
        const items = body.data || body || [];

        setProvinces(Array.isArray(items) ? items : []);
      } catch (err: any) {
        setDistrictsError(err.message || "Failed to load provinces");
      } finally {
        setDistrictsLoading(false);
      }
    };

    fetchProvinces();
  }, []);

  // Fetch districts when a province is selected
  useEffect(() => {
    const fetchDistrictsForProvince = async () => {
      if (!selectedProvinceId) {
        setDistricts([]);

        return;
      }

      setDistrictsLoading(true);
      setDistrictsError(null);
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/locations/provinces/${encodeURIComponent(selectedProvinceId)}/districts`
          : `/api/locations/provinces/${encodeURIComponent(selectedProvinceId)}/districts`;
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
          throw new Error("Invalid JSON from districts-by-province endpoint");
        }
        if (!res.ok)
          throw new Error(
            body?.message || `Failed to fetch districts (status ${res.status})`,
          );
        const items = body.data || body || [];

        setDistricts(Array.isArray(items) ? items : []);
      } catch (err: any) {
        setDistrictsError(err.message || "Failed to load districts");
      } finally {
        setDistrictsLoading(false);
      }
    };

    fetchDistrictsForProvince();
  }, [selectedProvinceId]);

  // Load municipalities when selectedDistrictId changes
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (!selectedDistrictId) {
        setMunicipalities([]);

        return;
      }

      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/locations/districts/${encodeURIComponent(selectedDistrictId)}/municipalities`
          : `/api/locations/districts/${encodeURIComponent(selectedDistrictId)}/municipalities`;
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
          body = null;
        }

        const items = (body && (body.data || body)) || [];

        setMunicipalities(Array.isArray(items) ? items : []);
      } catch (e) {
        setMunicipalities([]);
      }
    };

    loadMunicipalities();
  }, [selectedDistrictId]);

  // If the user is not a sys admin and a userDistrictId is provided, lock selection to that id
  useEffect(() => {
    // Primary path: parent passed the district id
    if (!isSysAdmin && userDistrictId) {
      setSelectedDistrictId(String(userDistrictId));
      const d = districts.find(
        (x) => String(x.District_ID) === String(userDistrictId),
      );

      if (d) {
        const provId =
          d.Province_ID ||
          d.ProvinceId ||
          d.province ||
          d.provinceId ||
          d.province_id ||
          null;

        if (provId) setSelectedProvinceId(String(provId));
        else {
          const prov = provinces.find(
            (p) =>
              (p.name || p.Province_Name) ===
              (d.Province_Name || d.ProvinceName),
          );

          if (prov) setSelectedProvinceId(String(prov._id || prov.id));
        }
      }

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
          // (removed debug log)
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
        if (!uid && !isSysAdmin) {
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

                    if (d) {
                      const provId =
                        d.Province_ID ||
                        d.ProvinceId ||
                        d.province ||
                        d.provinceId ||
                        d.province_id ||
                        null;

                      if (provId) setSelectedProvinceId(String(provId));
                      else {
                        const prov = provinces.find(
                          (p) =>
                            (p.name || p.Province_Name) ===
                            (d.Province_Name || d.ProvinceName),
                        );

                        if (prov)
                          setSelectedProvinceId(String(prov._id || prov.id));
                      }
                    }

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

        if (d) {
          const provId =
            d.Province_ID ||
            d.ProvinceId ||
            d.province ||
            d.provinceId ||
            d.province_id ||
            null;

          if (provId) setSelectedProvinceId(String(provId));
          else {
            const prov = provinces.find(
              (p) =>
                (p.name || p.Province_Name) ===
                (d.Province_Name || d.ProvinceName),
            );

            if (prov) setSelectedProvinceId(String(prov._id || prov.id));
          }
        }
      }

      // (removed debug output)
    }
  }, [isSysAdmin, userDistrictId, districts]);

  // (removed debug effect)

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
                Please enter the stakeholder&apos;s information below to add
                them to the system.
              </p>
            </ModalHeader>

            <ModalBody
              className={"gap-5 py-6 relative max-h-[65vh] overflow-y-auto"}
            >
              {/* Inline modal error (overlay, does not change layout) */}
              {modalError && (
                <div className="absolute left-6 right-6 top-4 z-20 px-4 py-2 bg-red-50 border border-red-100 text-sm text-red-700 rounded">
                  <div className="flex items-start justify-between">
                    <div className="pr-3">{modalError}</div>
                    <div>
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
                  </div>
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

              {/* Province -> District -> Municipality hierarchy: Province first, then District (filtered), then City/Municipality */}
              <div className="grid grid-cols-2 gap-4">
                {isSysAdmin ? (
                  <Select
                    isRequired
                    classNames={{
                      label: "text-sm font-medium text-gray-900",
                      trigger: "border-gray-200",
                    }}
                    label="Province"
                    name="province"
                    placeholder={
                      provinces.length === 0
                        ? "Loading provinces..."
                        : "Choose Province"
                    }
                    radius="md"
                    selectedKeys={
                      selectedProvinceId
                        ? new Set([String(selectedProvinceId)])
                        : new Set()
                    }
                    size="md"
                    variant="bordered"
                    onSelectionChange={(keys: any) =>
                      handleProvinceChange(keys)
                    }
                  >
                    {provinces.map((p) => (
                      <SelectItem
                        key={String(p._id || p.id)}
                        textValue={String(p.name || p.Province_Name || p.label)}
                      >
                        {String(p.name || p.Province_Name || p.label)}
                      </SelectItem>
                    ))}
                  </Select>
                ) : (
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
                )}

                {/* District select filtered by selectedProvince for admins; readonly for non-admins */}
                {isSysAdmin ? (
                  selectedProvinceId ? (
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
                          (x) =>
                            String(x.District_ID) === String(id) ||
                            String(x._id) === String(id) ||
                            String(x.id) === String(id),
                        );

                        if (d) {
                          const provId =
                            d.Province_ID ||
                            d.ProvinceId ||
                            d.province ||
                            d.provinceId ||
                            d.province_id ||
                            null;

                          if (provId) setSelectedProvinceId(String(provId));
                          else {
                            // try to map by name if only name is present
                            const prov = provinces.find(
                              (p) =>
                                (p.name || p.Province_Name) ===
                                (d.Province_Name || d.ProvinceName),
                            );

                            if (prov)
                              setSelectedProvinceId(
                                String(prov._id || prov.id),
                              );
                          }
                        }
                      }}
                    >
                      {districts
                        .filter((d) =>
                          selectedProvinceId
                            ? String(
                                d.Province_ID ||
                                  d.ProvinceId ||
                                  d.province ||
                                  d.provinceId,
                              ) === String(selectedProvinceId)
                            : true,
                        )
                        .map((district, idx) => {
                          const label = getDistrictLabel(district, idx);

                          const key = String(
                            district.District_ID ||
                              district._id ||
                              district.id ||
                              idx,
                          );

                          return (
                            <SelectItem key={key} textValue={String(label)}>
                              {String(label)}
                            </SelectItem>
                          );
                        })}
                    </Select>
                  ) : (
                    <Input
                      disabled
                      classNames={{
                        label: "text-sm font-medium text-gray-900",
                        inputWrapper: "border-gray-200 bg-gray-50",
                      }}
                      label="District"
                      name="district_display"
                      placeholder="Select province first"
                      radius="md"
                      size="md"
                      type="text"
                      value={districtLabel}
                      variant="bordered"
                    />
                  )
                ) : (
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

                {/* Hidden inputs so FormData includes these values on submit */}
                <input
                  name="district"
                  type="hidden"
                  value={selectedDistrictId}
                />
                <input name="province" type="hidden" value={computedProvince} />
                <input
                  name="provinceId"
                  type="hidden"
                  value={selectedProvinceId}
                />
                {/* The Select for municipality uses `cityMunicipality` as the form name, so no extra hidden input required */}
              </div>

              {/* Municipality (dropdown) then Organization / Institution on same row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {/* City / Municipality should match Select styling used above and be locked until a district is chosen */}
                  {selectedDistrictId ? (
                    <Select
                      classNames={{
                        label: "text-sm font-medium text-gray-900",
                        trigger: "border-gray-200",
                      }}
                      label="City / Municipality"
                      name="cityMunicipality"
                      placeholder={
                        municipalities.length === 0
                          ? cityInput || "Select municipality"
                          : "Select municipality"
                      }
                      radius="md"
                      selectedKeys={
                        cityInput ? new Set([String(cityInput)]) : new Set()
                      }
                      size="md"
                      variant="bordered"
                      onSelectionChange={(keys: any) => {
                        const val = Array.from(keys)[0] as string;

                        // Try to map selection back to the municipality object so we
                        // can submit the DB _id separately (backend expects `municipality` id).
                        if (municipalities && municipalities.length > 0) {
                          const found = municipalities.find(
                            (m: any) =>
                              String(m._id) === String(val) ||
                              String(m.id) === String(val) ||
                              String(
                                m.name || m.Name || m.City_Municipality,
                              ) === String(val),
                          );

                          if (found) {
                            setSelectedMunicipalityId(
                              String(found._id || found.id),
                            );
                            setCityInput(
                              String(
                                found.name ||
                                  found.Name ||
                                  found.City_Municipality ||
                                  found,
                              ),
                            );

                            return;
                          }
                        }

                        // If no municipalities list or a freeform value, fall back to storing the label
                        setSelectedMunicipalityId(String(val || ""));
                        setCityInput(val || "");
                      }}
                    >
                      {/* If backend returned municipalities, render them; otherwise fall back to single computedCity option */}
                      {municipalities && municipalities.length > 0 ? (
                        municipalities.map((m: any, idx: number) => {
                          const label =
                            m.name ||
                            m.Name ||
                            m.City_Municipality ||
                            String(m);
                          const key = String(m._id || m.id || label || idx);

                          return (
                            <SelectItem key={key} textValue={String(label)}>
                              {String(label)}
                            </SelectItem>
                          );
                        })
                      ) : computedCity ? (
                        <SelectItem
                          key={String(computedCity)}
                          textValue={String(computedCity)}
                        >
                          {String(computedCity)}
                        </SelectItem>
                      ) : null}
                    </Select>
                  ) : (
                    <Input
                      disabled
                      classNames={{
                        label: "text-sm font-medium text-gray-900",
                        inputWrapper: "border-gray-200 bg-gray-50",
                      }}
                      label="City / Municipality"
                      name="cityMunicipality_display"
                      placeholder="Select district first"
                      radius="md"
                      size="md"
                      type="text"
                      value={cityInput || ""}
                      variant="bordered"
                    />
                  )}

                  {/* Mirror selected municipality into a hidden input so FormData includes it (Select is not a native form control) */}
                  <input
                    name="cityMunicipality"
                    type="hidden"
                    value={cityInput}
                  />
                  {/* Provide the DB id for municipality expected by backend as `municipality` */}
                  <input
                    name="municipality"
                    type="hidden"
                    value={selectedMunicipalityId}
                  />
                </div>

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
