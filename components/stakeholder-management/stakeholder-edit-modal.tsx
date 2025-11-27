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

interface EditStakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinator: any | null; // stakeholder object returned from backend
  isSysAdmin?: boolean;
  userDistrictId?: string | null;
  onSaved?: () => void;
}

export default function EditStakeholderModal({
  isOpen,
  onClose,
  coordinator,
  isSysAdmin = false,
  userDistrictId = null,
  onSaved,
}: EditStakeholderModalProps) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [organization, setOrganization] = useState("");
  const [cityMunicipality, setCityMunicipality] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [districts, setDistricts] = useState<any[]>([]);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [province, setProvince] = useState<string>("");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(
    null,
  );
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    if (!coordinator) return;
    // stakeholder may have nested fields
    const staff =
      coordinator.Staff || coordinator.staff || coordinator.staffData || {};

    // Prefer top-level values then fallback to staff object
    setFirstName(
      coordinator.First_Name ||
        coordinator.FirstName ||
        coordinator.firstName ||
        staff.First_Name ||
        staff.FirstName ||
        staff.firstName ||
        "",
    );
    setMiddleName(
      coordinator.Middle_Name ||
        coordinator.MiddleName ||
        coordinator.middleName ||
        staff.Middle_Name ||
        staff.MiddleName ||
        staff.middleName ||
        "",
    );
    setLastName(
      coordinator.Last_Name ||
        coordinator.LastName ||
        coordinator.lastName ||
        staff.Last_Name ||
        staff.LastName ||
        staff.lastName ||
        "",
    );
    setEmail(
      coordinator.Email ||
        coordinator.email ||
        staff.Email ||
        staff.email ||
        "",
    );
    setPhoneNumber(
      coordinator.Phone_Number ||
        coordinator.PhoneNumber ||
        coordinator.phoneNumber ||
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
    const dId =
      coordinator.District_ID ||
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
    setSelectedProvince(prov || "");

    // organization and city
    setOrganization(
      coordinator.Organization_Institution ||
        coordinator.OrganizationInstitution ||
        coordinator.organizationInstitution ||
        coordinator.Organization ||
        coordinator.organization ||
        coordinator.OrganizationName ||
        coordinator.Organization_Name ||
        coordinator.organization_institution ||
        "",
    );
    setCityMunicipality(
      coordinator.municipality ||
        coordinator.Municipality ||
        coordinator.municipality_id ||
        coordinator.Municipality_ID ||
        coordinator.City_Municipality ||
        coordinator.City ||
        coordinator.city ||
        coordinator.city_municipality ||
        "",
    );
  }, [coordinator]);

  useEffect(() => {
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

  // Fetch provinces to allow mapping object ids -> friendly names
  useEffect(() => {
    (async () => {
      setProvincesLoading(true);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/api/locations/provinces`, {
          headers,
        });
        const text = await res.text();
        let body: any = null;

        try {
          body = text ? JSON.parse(text) : null;
        } catch (e) {
          body = null;
        }
        const items = (body && (body.data || body.provinces)) || [];
        const normalized = Array.isArray(items)
          ? items.map((p: any) => ({
              id: p._id || p.id || p.code || p.Province_ID || p.ProvinceId,
              name: p.name || p.Province_Name || p.Name || p.Province,
            }))
          : [];

        setProvinces(normalized);

        // If the stored `province` is an object id (or selectedProvince currently holds an id), map it to a friendly name
        const provId = province || selectedProvince;

        if (provId) {
          const match = normalized.find(
            (x: any) =>
              String(x.id) === String(provId) ||
              String(x.name) === String(provId),
          );

          if (match) {
            setSelectedProvinceId(String(match.id));
            setSelectedProvince(match.name || String(match.id));
          }
        }
      } catch (e) {
        // ignore
      } finally {
        setProvincesLoading(false);
      }
    })();
  }, [province]);

  // When a province id is selected, fetch that province's districts and clear dependent selections
  useEffect(() => {
    if (!selectedProvinceId) return;

    (async () => {
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
              _id: d._id || d.id || d.District_ID,
              id: d._id || d.id || d.District_ID,
              name:
                d.name || d.District_Name || d.District || d.District_Number,
              District_ID: d.District_ID,
            }))
          : [];

        setDistricts(normalized);

        // If there is an existing districtId and it exists in the fetched list, keep it.
        // Otherwise clear dependent selections on province change
        if (districtId) {
          const exists = normalized.find(
            (d: any) =>
              String(d._id || d.id || d.District_ID) === String(districtId) ||
              String(d.District_ID) === String(districtId),
          );

          if (exists) {
            // keep districtId; municipalities effect will run because districtId didn't change
          } else {
            setDistrictId(null);
            setMunicipalities([]);
            setCityMunicipality("");
          }
        } else {
          // no existing district -> clear dependents
          setDistrictId(null);
          setMunicipalities([]);
          setCityMunicipality("");
        }
      } catch (e) {
        // ignore
      } finally {
        setDistrictsLoading(false);
      }
    })();
  }, [selectedProvinceId]);

  // If the passed `coordinator` is minimal (only id), attempt to fetch full details
  useEffect(() => {
    (async () => {
      try {
        if (!coordinator) return;
        const hasLocation =
          coordinator.District ||
          coordinator.District_ID ||
          coordinator.Province_Name ||
          coordinator.City_Municipality;

        if (hasLocation) return;

        const coordId =
          coordinator.Stakeholder_ID ||
          coordinator.StakeholderId ||
          coordinator.id ||
          coordinator._id;

        if (!coordId) return;

        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
          `${API_URL}/api/stakeholders/${encodeURIComponent(coordId)}`,
          { headers },
        );

        if (!res.ok) return;
        const text = await res.text();
        let body: any = null;

        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = null;
        }

        const data = body?.data || body?.stakeholder || body || null;

        if (!data) return;

        // Populate any missing location fields
        if (!districtId) {
          const dId =
            data.District_ID ||
            data.DistrictId ||
            (data.District &&
              (data.District.District_ID ||
                data.District._id ||
                data.District.id)) ||
            null;

          if (dId) setDistrictId(dId);
        }
        if (!province) {
          const prov =
            data.Province_Name ||
            data.province ||
            (data.District &&
              (data.District.Province_Name ||
                data.District.Province ||
                (data.District.Province &&
                  (data.District.Province._id ||
                    data.District.Province.id)))) ||
            "";

          if (prov) {
            setProvince(prov);
            setSelectedProvince(prov);
            // If the backend returned a province id string, set selectedProvinceId so we fetch its districts
            if (String(prov).match(/^[0-9a-fA-F]{24}$/)) {
              setSelectedProvinceId(String(prov));
            }
          }
        }
        if (!cityMunicipality) {
          const city = data.City_Municipality || data.City || data.city || "";

          if (city) setCityMunicipality(city);
        }
        // also try to populate organization from detail endpoint if missing
        if (!organization) {
          const org =
            data.Organization_Institution ||
            data.Organization ||
            data.organization ||
            data.organizationInstitution ||
            data.OrganizationName ||
            data.Organization_Name ||
            null;

          if (org) setOrganization(org);
        }
      } catch (e) {
        // ignore fetch errors
      }
    })();
  }, [coordinator]);

  useEffect(() => {
    // If user is a coordinator (not sysadmin) and we have a userDistrictId, ensure the district is prefilled and locked
    if (!isSysAdmin && userDistrictId && !districtId) {
      setDistrictId(String(userDistrictId));
    }

    if (!districtId) return;
    const pick = districts.find(
      (d) =>
        d.District_ID ||
        d.id ||
        d._id ||
        String(d.District_ID) === String(districtId),
    );

    if (pick) {
      const provName =
        pick.Province_Name || pick.Province || pick.province || "";

      setProvince(provName);
      // keep selectedProvince in sync when district is chosen programmatically
      setSelectedProvince(provName);
      if (provinces && provinces.length > 0) {
        const m = provinces.find(
          (p) =>
            String(p.name).toLowerCase() === String(provName).toLowerCase(),
        );

        if (m) setSelectedProvinceId(String(m.id));
      }
    }

    // load municipalities for this district
    (async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/locations/districts/${encodeURIComponent(String(districtId))}/municipalities`
          : `/api/locations/districts/${encodeURIComponent(String(districtId))}/municipalities`;
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        const headers: any = {};

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(url, { headers });

        if (!res.ok) {
          setMunicipalities([]);

          return;
        }
        const txt = await res.text();
        let body: any = null;

        try {
          body = txt ? JSON.parse(txt) : null;
        } catch {
          body = null;
        }
        const items = (body && (body.data || body)) || [];
        const munList = Array.isArray(items) ? items : [];

        setMunicipalities(munList);

        // If the existing cityMunicipality is a name (not an id), try to map it
        // to the matching municipality _id so the Select shows the correct selected value.
        if (cityMunicipality) {
          const foundById = munList.find(
            (m: any) =>
              String(m._id) === String(cityMunicipality) ||
              String(m.id) === String(cityMunicipality),
          );

          if (!foundById) {
            const foundByName = munList.find((m: any) => {
              const label = String(
                m.name || m.Name || m.City_Municipality || m.City || m,
              ).toLowerCase();

              return label === String(cityMunicipality).toLowerCase();
            });

            if (foundByName) {
              setCityMunicipality(String(foundByName._id || foundByName.id));
            }
          }
        }
      } catch (e) {
        setMunicipalities([]);
      }
    })();
  }, [districtId, districts]);

  if (!coordinator) return null;

  const displayedProvinceName = (() => {
    // Try to resolve a friendly province name from the districts list or selected province/province state
    // prefer explicit selectedProvince (likely a name)
    if (
      selectedProvince &&
      !String(selectedProvince).match(/^[0-9a-fA-F]{24}$/)
    ) {
      const pick = districts.find(
        (d) =>
          String(d.Province_Name) === String(selectedProvince) ||
          String(d.Province) === String(selectedProvince) ||
          String(d.province) === String(selectedProvince),
      );

      if (pick)
        return (
          pick.Province_Name ||
          pick.Province ||
          pick.province ||
          String(selectedProvince)
        );

      return String(selectedProvince);
    }

    // if province is an object id, try provinces list first
    if (province) {
      const objIdLike = String(province).match(/^[0-9a-fA-F]{24}$/);

      if (objIdLike) {
        const pmatch = provinces.find((p) => String(p.id) === String(province));

        if (pmatch) {
          // ensure selectedProvinceId is set when we can map
          if (!selectedProvinceId) setSelectedProvinceId(String(pmatch.id));

          return pmatch.name || String(pmatch.id);
        }

        // fallback to districts mapping
        if (districts && districts.length > 0) {
          const pick = districts.find(
            (d) =>
              String(d.Province) === String(province) ||
              String(d.Province_ID) === String(province) ||
              (d.Province && String(d.Province._id) === String(province)) ||
              String(d._id) === String(province) ||
              String(d.id) === String(province),
          );

          if (pick)
            return (
              pick.Province_Name ||
              pick.Province ||
              pick.province ||
              String(province)
            );
        }
      }

      // otherwise return as-is (string name)
      return String(province);
    }

    return "";
  })();

  const displayedDistrictName = (() => {
    const pick = districts.find(
      (d) =>
        String(d.District_ID) === String(districtId) ||
        String(d._id) === String(districtId) ||
        String(d.id) === String(districtId),
    );

    if (pick)
      return (
        pick.District_Name ||
        pick.District ||
        pick.name ||
        String(districtId || "")
      );
    if (coordinator.District)
      return (
        coordinator.District.District_Name ||
        coordinator.District.name ||
        coordinator.District.District_ID ||
        ""
      );

    return districtId ? String(districtId) : "";
  })();

  const handleSave = async () => {
    if (!coordinator) return;
    setIsSubmitting(true);
    setValidationErrors([]);
    try {
      const coordId =
        coordinator.Stakeholder_ID ||
        coordinator.StakeholderId ||
        coordinator.id ||
        coordinator._id;

      if (!coordId) throw new Error("Stakeholder id not available");

      const token =
        localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token");
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload: any = {};

      if (firstName) payload.First_Name = firstName;
      if (middleName !== undefined) payload.Middle_Name = middleName;
      if (lastName) payload.Last_Name = lastName;
      if (email) payload.Email = email;
      if (phoneNumber) payload.Phone_Number = phoneNumber;
      // Only include District_ID when the actor is a system admin. Coordinators cannot change district here.
      if (isSysAdmin && districtId) payload.District_ID = districtId;
      // send the province name (either selected by admin or computed for non-admins)
      payload.Province_Name = (selectedProvince || province) as any;
      // include organization and city/municipality
      if (organization !== undefined)
        payload.Organization_Institution = organization || null;
      if (cityMunicipality !== undefined)
        payload.City_Municipality = cityMunicipality || null;
      // include password change if provided (legacy and normalized)
      if (newPassword && String(newPassword).trim().length > 0) {
        payload.Password = newPassword;
        payload.password = newPassword;
      }

      // normalized fields for backend compatibility
      // only allow changing district when system admin (preserves coordinator lock)
      if (isSysAdmin && districtId) payload.district = districtId;
      // municipality can be changed by coordinators and admins; send normalized id when present
      if (cityMunicipality !== undefined)
        payload.municipality = cityMunicipality || null;

      const res = await fetch(`${API_URL}/api/stakeholders/${coordId}`, {
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
        throw new Error(resp.message || "Failed to update stakeholder");
      }

      if (onSaved) {
        try {
          await onSaved();
        } catch (e) {
          // ignore onSaved errors but continue to close/reload
        }
      }
      onClose();

      // Force a full reload so the stakeholder page always refreshes to latest data
      if (typeof window !== "undefined") {
        try {
          window.location.reload();
        } catch (e) {
          // ignore reload errors
        }
      }
    } catch (err: any) {
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
            <h2 className="text-2xl font-semibold">Edit Stakeholder</h2>
            <p className="text-sm text-default-500">
              Update stakeholder profile and location details.
            </p>
          </div>
        </ModalHeader>
        <ModalBody className="py-4">
          <div className="space-y-4">
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Province</label>
                {isSysAdmin ? (
                  <Select
                    placeholder={
                      provincesLoading
                        ? "Loading provinces..."
                        : "Select province"
                    }
                    selectedKeys={
                      selectedProvinceId ? [String(selectedProvinceId)] : []
                    }
                    onSelectionChange={(keys: any) => {
                      const id = Array.from(keys)[0] as string;
                      const match = provinces.find(
                        (p) => String(p.id) === String(id),
                      );

                      if (match) {
                        setSelectedProvinceId(String(match.id));
                        setSelectedProvince(match.name || String(match.id));
                        // reset district when province changes
                        setDistrictId(null);
                      }
                    }}
                  >
                    {(provinces || []).map((p: any) => (
                      <SelectItem key={String(p.id)} textValue={String(p.name)}>
                        {String(p.name)}
                      </SelectItem>
                    ))}
                  </Select>
                ) : (
                  <Input
                    disabled
                    classNames={{ inputWrapper: "h-12 bg-default-100" }}
                    type="text"
                    value={displayedProvinceName || province}
                    variant="bordered"
                  />
                )}
              </div>

              <div>
                <label className="text-sm font-medium">District</label>
                <Select
                  disabled={!isSysAdmin}
                  placeholder={
                    districts.length === 0 && !districtId
                      ? "Select district"
                      : "Select district"
                  }
                  selectedKeys={districtId ? [String(districtId)] : []}
                  onSelectionChange={(keys: any) => {
                    const id = Array.from(keys)[0] as string;

                    setDistrictId(id);
                    // clear municipality when district changes
                    setCityMunicipality("");
                    const pick = districts.find(
                      (d) =>
                        String(d.District_ID) === String(id) ||
                        String(d.id) === String(id) ||
                        String(d._id) === String(id),
                    );

                    if (pick) {
                      setProvince(
                        pick.Province_Name ||
                          pick.Province ||
                          pick.province ||
                          "",
                      );
                      setSelectedProvince(
                        pick.Province_Name ||
                          pick.Province ||
                          pick.province ||
                          "",
                      );
                      // if pick carries a province id, keep selectedProvinceId in sync
                      const provId =
                        pick.Province_ID ||
                        pick.ProvinceId ||
                        (pick.Province &&
                          (pick.Province._id || pick.Province.id)) ||
                        null;

                      if (provId) setSelectedProvinceId(String(provId));
                    }
                  }}
                >
                  {(() => {
                    // determine the province name for filtering districts
                    // If we have a selectedProvinceId, `districts` should already be the province-specific list (fetched by effect).
                    // Use it directly when available. Otherwise fall back to filtering the global districts list by name.
                    const list = (() => {
                      if (
                        selectedProvinceId &&
                        Array.isArray(districts) &&
                        districts.length > 0
                      ) {
                        return districts;
                      }

                      const provName = (() => {
                        if (selectedProvince) return selectedProvince;
                        if (selectedProvinceId) {
                          const p = provinces.find(
                            (x) => String(x.id) === String(selectedProvinceId),
                          );

                          if (p) return p.name;
                        }
                        if (province) return province;

                        return null;
                      })();

                      return (districts || []).filter((d) =>
                        provName
                          ? d.Province_Name === provName ||
                            d.Province === provName ||
                            d.province === provName
                          : true,
                      );
                    })();

                    if (list.length > 0) {
                      return list.map((d, idx) => {
                        const label =
                          d.name ||
                          d.District_Name ||
                          d.District ||
                          d.District_Number ||
                          d.District_ID ||
                          String(idx);
                        const key = String(
                          d._id || d.id || d.District_ID || idx,
                        );

                        return (
                          <SelectItem key={key} textValue={String(label)}>
                            {String(label)}
                          </SelectItem>
                        );
                      });
                    }
                    // fallback to show selected district when districts list is empty
                    if (districtId || coordinator.District) {
                      return (
                        <SelectItem
                          key={String(
                            districtId ||
                              (coordinator.District &&
                                (coordinator.District.District_ID ||
                                  coordinator.District._id ||
                                  coordinator.District.id)),
                          )}
                          textValue={String(displayedDistrictName)}
                        >
                          {String(displayedDistrictName)}
                        </SelectItem>
                      );
                    }

                    return null;
                  })()}
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">
                  City / Municipality
                </label>
                <Select
                  placeholder={
                    municipalities.length === 0
                      ? cityMunicipality || "Select municipality"
                      : "Select municipality"
                  }
                  selectedKeys={
                    cityMunicipality ? [String(cityMunicipality)] : []
                  }
                  onSelectionChange={(keys: any) => {
                    const v = Array.from(keys)[0] as string;

                    setCityMunicipality(v || "");
                  }}
                >
                  {municipalities && municipalities.length > 0 ? (
                    municipalities.map((m: any, idx: number) => {
                      const label =
                        m.name || m.Name || m.City_Municipality || String(m);
                      const key = String(m._id || m.id || label || idx);

                      return (
                        <SelectItem key={key} textValue={String(label)}>
                          {String(label)}
                        </SelectItem>
                      );
                    })
                  ) : cityMunicipality ? (
                    <SelectItem
                      key={String(cityMunicipality)}
                      textValue={String(cityMunicipality)}
                    >
                      {String(cityMunicipality)}
                    </SelectItem>
                  ) : null}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Contact Email</label>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Organization / Institution
                </label>
                <Input
                  classNames={{ inputWrapper: "h-12" }}
                  type="text"
                  value={organization}
                  variant="bordered"
                  onChange={(e) =>
                    setOrganization((e.target as HTMLInputElement).value)
                  }
                />
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
                          className="text-default-800 pointer-events-none"
                          size={18}
                        />
                      ) : (
                        <EyeOff
                          className="text-default-800 pointer-events-none"
                          size={18}
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
