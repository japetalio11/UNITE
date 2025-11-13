"use client";
import React, { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
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

export default function EditStakeholderModal({ isOpen, onClose, coordinator, isSysAdmin = false, userDistrictId = null, onSaved }: EditStakeholderModalProps) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [organization, setOrganization] = useState("");
  const [cityMunicipality, setCityMunicipality] = useState("");

  const [districts, setDistricts] = useState<any[]>([]);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [province, setProvince] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    if (!coordinator) return;
    // stakeholder may have nested fields
      const staff = coordinator.Staff || coordinator.staff || coordinator.staffData || {};

      // Prefer top-level values then fallback to staff object
      setFirstName(
        coordinator.First_Name || coordinator.FirstName || coordinator.firstName || staff.First_Name || staff.FirstName || staff.firstName || ""
      );
      setMiddleName(
        coordinator.Middle_Name || coordinator.MiddleName || coordinator.middleName || staff.Middle_Name || staff.MiddleName || staff.middleName || ""
      );
      setLastName(
        coordinator.Last_Name || coordinator.LastName || coordinator.lastName || staff.Last_Name || staff.LastName || staff.lastName || ""
      );
      setEmail(coordinator.Email || coordinator.email || staff.Email || staff.email || "");
      setPhoneNumber(
        coordinator.Phone_Number || coordinator.PhoneNumber || coordinator.phoneNumber || staff.Phone_Number || staff.Phone_Number || staff.phoneNumber || staff.phone || ""
      );

    const dist = coordinator.District || coordinator.District_ID || coordinator.DistrictId || coordinator.District || coordinator.district || null;
    const dId = coordinator.District_ID || coordinator.DistrictId || coordinator.District?.District_ID || dist;
    setDistrictId(dId || null);

    const prov = (coordinator.District && (coordinator.District.Province_Name || coordinator.District.Province)) || coordinator.Province_Name || coordinator.province || "";
    setProvince(prov || "");

    // organization and city
    setOrganization(coordinator.Organization_Institution || coordinator.Organization || coordinator.organization || coordinator.OrganizationName || coordinator.Organization_Name || "");
    setCityMunicipality(coordinator.City_Municipality || coordinator.City || coordinator.city || coordinator.city_municipality || "");
  }, [coordinator]);

  useEffect(() => {
    (async () => {
      try {
        const token = typeof window !== 'undefined' ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null;
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/api/districts?limit=1000`, { headers });
        const text = await res.text();
        let body: any = null;
        try { body = JSON.parse(text); } catch (e) { body = { data: [] }; }
        const data = body?.data || body || [];
        if (Array.isArray(data)) setDistricts(data);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (!districtId) return;
    const pick = districts.find(d => (d.District_ID || d.id || d._id || String(d.District_ID) === String(districtId)));
    if (pick) setProvince(pick.Province_Name || pick.Province || pick.province || "");
  }, [districtId, districts]);

  if (!coordinator) return null;

  const handleSave = async () => {
    if (!coordinator) return;
    setIsSubmitting(true);
    setValidationErrors([]);
    try {
      const coordId = coordinator.Stakeholder_ID || coordinator.StakeholderId || coordinator.id || coordinator._id;
      if (!coordId) throw new Error('Stakeholder id not available');

      const token = localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload: any = {};
      if (firstName) payload.First_Name = firstName;
      if (middleName !== undefined) payload.Middle_Name = middleName;
      if (lastName) payload.Last_Name = lastName;
      if (email) payload.Email = email;
      if (phoneNumber) payload.Phone_Number = phoneNumber;
  // Only include District_ID when the actor is a system admin. Coordinators cannot change district here.
  if (isSysAdmin && districtId) payload.District_ID = districtId;
      if (province !== undefined) payload.Province_Name = province;
      // include organization and city/municipality
      if (organization !== undefined) payload.Organization_Institution = organization || null;
      if (cityMunicipality !== undefined) payload.City_Municipality = cityMunicipality || null;

      const res = await fetch(`${API_URL}/api/stakeholders/${coordId}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
      const text = await res.text();
      let resp: any = null;
      try { resp = JSON.parse(text); } catch (e) { resp = { message: text }; }
      if (!res.ok) {
        if (resp && resp.errors && Array.isArray(resp.errors)) {
          setValidationErrors(resp.errors);
          return;
        }
        throw new Error(resp.message || 'Failed to update stakeholder');
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      console.error('EditStakeholderModal save error', err);
      setValidationErrors([err?.message || 'Failed to save changes']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" placement="center" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3 pb-4">
          <div>
            <h2 className="text-xl font-semibold">Edit stakeholder</h2>
            <p className="text-xs text-default-500">Edit stakeholder details</p>
          </div>
        </ModalHeader>
        <ModalBody className="py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm font-medium">First name</label>
                <Input type="text" value={firstName} onChange={(e) => setFirstName((e.target as HTMLInputElement).value)} variant="bordered" classNames={{ inputWrapper: 'h-10' }} />
              </div>
              <div>
                <label className="text-sm font-medium">Middle name</label>
                <Input type="text" value={middleName} onChange={(e) => setMiddleName((e.target as HTMLInputElement).value)} variant="bordered" classNames={{ inputWrapper: 'h-10' }} />
              </div>
              <div>
                <label className="text-sm font-medium">Last name</label>
                <Input type="text" value={lastName} onChange={(e) => setLastName((e.target as HTMLInputElement).value)} variant="bordered" classNames={{ inputWrapper: 'h-10' }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Organization / Institution</label>
                <Input type="text" value={organization} onChange={(e) => setOrganization((e.target as HTMLInputElement).value)} variant="bordered" classNames={{ inputWrapper: 'h-10' }} />
              </div>
              <div>
                <label className="text-sm font-medium">City / Municipality</label>
                <Input type="text" value={cityMunicipality} onChange={(e) => setCityMunicipality((e.target as HTMLInputElement).value)} variant="bordered" classNames={{ inputWrapper: 'h-10' }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Contact Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} variant="bordered" classNames={{ inputWrapper: 'h-10' }} />
              </div>
              <div>
                <label className="text-sm font-medium">Contact Number</label>
                <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber((e.target as HTMLInputElement).value)} variant="bordered" classNames={{ inputWrapper: 'h-10' }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">District</label>
                <Select
                  placeholder="Select district"
                  selectedKeys={districtId ? [String(districtId)] : []}
                  onSelectionChange={(keys: any) => {
                    const id = Array.from(keys)[0] as string
                    setDistrictId(id)
                    const pick = districts.find((d) => String(d.District_ID) === String(id) || String(d.id) === String(id) || String(d._id) === String(id))
                    if (pick) setProvince(pick.Province_Name || pick.Province || pick.province || "")
                  }}
                  disabled={!isSysAdmin}
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
                <Input type="text" value={province} disabled variant="bordered" classNames={{ inputWrapper: 'h-10 bg-default-100' }} />
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
          <Button variant="bordered" onPress={onClose}>Cancel</Button>
          <Button color="default" onPress={handleSave} disabled={isSubmitting} className="bg-black text-white">
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
