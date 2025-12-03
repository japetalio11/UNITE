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
import { fetchJsonWithAuth } from "@/utils/fetchWithAuth";

interface QuickFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: {
    province?: string;
    districtId?: string;
    municipalityId?: string;
  }) => void;
}

export default function QuickFilterModal({
  isOpen,
  onClose,
  onApply,
}: QuickFilterModalProps) {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string>("");
  
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [municipalitiesLoading, setMunicipalitiesLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Load Provinces on Open
  useEffect(() => {
    if (!isOpen) return;

    const fetchProvinces = async () => {
      setProvincesLoading(true);
      try {
        const response = await fetchJsonWithAuth(`${API_URL}/api/locations/provinces`);
        const items = response.data || response.provinces || [];
        
        const normalized = items.map((p: any) => ({
          id: p._id || p.id,
          name: p.name || p.Name || p.Province_Name,
        }));

        setProvinces(normalized.filter(Boolean));
      } catch (err: any) {
        console.error("Failed to load provinces:", err);
        setProvinces([]);
      } finally {
        setProvincesLoading(false);
      }
    };

    fetchProvinces();
  }, [isOpen]);

  // Load Districts when Province changes
  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([]);
      setSelectedDistrictId("");
      setMunicipalities([]);
      setSelectedMunicipalityId("");
      return;
    }

    const fetchDistricts = async () => {
      setDistrictsLoading(true);
      try {
        const response = await fetchJsonWithAuth(
          `${API_URL}/api/locations/provinces/${encodeURIComponent(selectedProvince)}/districts?limit=1000`
        );
        const items = response.data || response.districts || [];
        
        const normalized = items.map((d: any) => ({
          id: d._id || d.id || d.District_ID,
          name: d.name || d.Name || d.District_Name || d.District_Number,
        }));

        setDistricts(normalized.filter(Boolean));
      } catch (err: any) {
        console.error("Failed to load districts:", err);
        setDistricts([]);
      } finally {
        setDistrictsLoading(false);
      }
    };

    fetchDistricts();
  }, [selectedProvince]);

  // Load Municipalities when District changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setMunicipalities([]);
      setSelectedMunicipalityId("");
      return;
    }

    const fetchMunicipalities = async () => {
      setMunicipalitiesLoading(true);
      try {
        const response = await fetchJsonWithAuth(
          `${API_URL}/api/locations/districts/${encodeURIComponent(selectedDistrictId)}/municipalities?limit=1000`
        );
        const items = response.data || response.municipalities || [];
        
        const normalized = items.map((m: any) => ({
          id: m._id || m.id || m.Municipality_ID,
          name: m.name || m.Name || m.Municipality_Name || m.City_Municipality,
        }));

        setMunicipalities(normalized.filter(Boolean));
      } catch (err: any) {
        console.error("Failed to load municipalities:", err);
        setMunicipalities([]);
      } finally {
        setMunicipalitiesLoading(false);
      }
    };

    fetchMunicipalities();
  }, [selectedDistrictId]);

  // Apply current selection
  const handleApply = () => {
    onApply({
      province: selectedProvince || undefined,
      districtId: selectedDistrictId || undefined,
      municipalityId: selectedMunicipalityId || undefined,
    });
    onClose();
  };

  // Clear all selections AND apply the empty filter immediately
  const handleClear = () => {
    setSelectedProvince("");
    setSelectedDistrictId("");
    setSelectedMunicipalityId("");
    
    // Apply empty filter to clear the list
    onApply({});
    // Close the modal so user sees the result
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      placement="center"
      size="sm"
      onClose={onClose}
      classNames={{
        base: "max-w-[380px]",
      }}
    >
      <ModalContent>
        <ModalHeader className="pb-1.5 pt-4 px-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Quick Filter</h3>
          </div>
        </ModalHeader>
        <ModalBody className="px-5 py-3">
          <div className="space-y-3">
            {/* Province */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-900">
                Province
              </label>
              <Select
                placeholder="Choose a province"
                selectedKeys={selectedProvince ? [selectedProvince] : []}
                variant="bordered"
                radius="lg"
                size="sm"
                classNames={{
                  trigger: "border-gray-300 bg-white shadow-sm h-9",
                  value: "text-xs text-gray-700",
                }}
                isLoading={provincesLoading}
                onSelectionChange={(keys: any) => {
                  const id = Array.from(keys)[0] as string;
                  setSelectedProvince(id);
                  // Reset dependent fields
                  setSelectedDistrictId("");
                  setSelectedMunicipalityId("");
                }}
              >
                {provinces.map((prov) => (
                  <SelectItem key={String(prov.id)} textValue={String(prov.name)}>
                    {String(prov.name)}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* District */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-900">
                District
              </label>
              <Select
                placeholder={
                  selectedProvince ? "Choose a district" : "Select province first"
                }
                selectedKeys={selectedDistrictId ? [selectedDistrictId] : []}
                variant="bordered"
                radius="lg"
                size="sm"
                classNames={{
                  trigger: "border-gray-300 bg-white shadow-sm h-9",
                  value: "text-xs text-gray-700",
                }}
                isDisabled={!selectedProvince}
                isLoading={districtsLoading}
                onSelectionChange={(keys: any) => {
                  const id = Array.from(keys)[0] as string;
                  setSelectedDistrictId(id);
                  // Reset dependent field
                  setSelectedMunicipalityId("");
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
            </div>

            {/* Municipality */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-900">
                Municipality
              </label>
              <Select
                placeholder={
                  selectedDistrictId
                    ? "Choose a municipality"
                    : "Select district first"
                }
                selectedKeys={selectedMunicipalityId ? [selectedMunicipalityId] : []}
                variant="bordered"
                radius="lg"
                size="sm"
                classNames={{
                  trigger: "border-gray-300 bg-white shadow-sm h-9",
                  value: "text-xs text-gray-700",
                }}
                isDisabled={!selectedDistrictId}
                isLoading={municipalitiesLoading}
                onSelectionChange={(keys: any) => {
                  const id = Array.from(keys)[0] as string;
                  setSelectedMunicipalityId(id);
                }}
              >
                {municipalities.map((municipality) => (
                  <SelectItem
                    key={String(municipality.id)}
                    textValue={String(municipality.name)}
                  >
                    {String(municipality.name)}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="px-5 pb-4 pt-3 gap-2.5">
          <Button
            variant="bordered"
            radius="lg"
            size="sm"
            className="flex-1 h-9 border-gray-300 font-medium text-xs"
            onPress={handleClear}
          >
            Clear
          </Button>
          <Button
            className="flex-1 h-9 bg-black text-white font-medium text-xs hover:bg-gray-800"
            color="default"
            radius="lg"
            size="sm"
            onPress={handleApply}
          >
            Apply
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}