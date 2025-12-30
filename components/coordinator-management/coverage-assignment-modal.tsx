"use client";

import { useState, useEffect, useMemo } from "react";
import { Xmark, Magnifier as Search } from "@gravity-ui/icons";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import { useLocations } from "@/hooks/useLocations";
import { listCoverageAreas, createCoverageArea } from "@/services/coordinatorService";
import type { CoverageArea, Location } from "@/types/coordinator.types";

interface CoverageAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (coverageAreaIds: string[], locationIds: string[]) => void;
  initialLocationIds?: string[];
  initialCoverageAreaIds?: string[];
  hideBarangays?: boolean; // Hide barangay-level locations (for coordinator creation)
}

export default function CoverageAssignmentModal({
  isOpen,
  onClose,
  onConfirm,
  initialLocationIds = [],
  initialCoverageAreaIds = [],
  hideBarangays = false,
}: CoverageAssignmentModalProps) {
  const { flat: locations, loading: locationsLoading } = useLocations(isOpen);
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(
    new Set(initialLocationIds)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [coverageAreas, setCoverageAreas] = useState<CoverageArea[]>([]);
  const [loadingCoverageAreas, setLoadingCoverageAreas] = useState(false);
  const [suggestedCoverageArea, setSuggestedCoverageArea] = useState<CoverageArea | null>(null);
  const [createNewCoverageArea, setCreateNewCoverageArea] = useState(false);
  const [newCoverageAreaName, setNewCoverageAreaName] = useState("");

  // Build hierarchical structure: Districts with nested municipalities
  const hierarchicalLocations = useMemo(() => {
    // Filter out barangays if hideBarangays is true
    const filteredLocations = hideBarangays 
      ? locations.filter(loc => loc.type !== 'barangay')
      : locations;
    
    // Create a map of all locations by ID
    const locationMap = new Map<string, Location & { children: Location[] }>();
    
    // First, create entries for all locations
    filteredLocations.forEach((loc) => {
      locationMap.set(loc._id, { ...loc, children: [] });
    });

    // Build parent-child relationships
    const districts: Array<Location & { children: Location[] }> = [];
    const provinces: Array<Location & { children: Array<Location & { children: Location[] }> }> = [];
    const standaloneLocations: Location[] = [];
    const districtsInProvinces = new Set<string>(); // Track districts that belong to provinces

    // First pass: Build provinces and their districts
    filteredLocations.forEach((loc) => {
      if (loc.type === 'province') {
        // This is a province
        const province = { ...loc, children: [] as Array<Location & { children: Location[] }> };
        
        // Find districts that belong to this province
        filteredLocations.forEach((district) => {
          const distParentId = typeof district.parent === 'string' 
            ? district.parent 
            : district.parent?._id;
          
          if ((district.type === 'district' || (district.type === 'city' && district.metadata?.isCity)) 
              && distParentId === loc._id) {
            const dist = locationMap.get(district._id)!;
            districtsInProvinces.add(district._id); // Mark this district as belonging to a province
            
            // Find municipalities for this district
            filteredLocations.forEach((municipality) => {
              const munParentId = typeof municipality.parent === 'string' 
                ? municipality.parent 
                : municipality.parent?._id;
              
              if (municipality.type === 'municipality' && munParentId === district._id) {
                dist.children.push(municipality);
              }
            });
            
            dist.children.sort((a, b) => a.name.localeCompare(b.name));
            province.children.push(dist);
          }
        });
        
        province.children.sort((a, b) => a.name.localeCompare(b.name));
        provinces.push(province);
      }
    });

    // Second pass: Build standalone districts (not in provinces) and other locations
    filteredLocations.forEach((loc) => {
      const parentId = typeof loc.parent === 'string' ? loc.parent : loc.parent?._id;
      
      if (loc.type === 'district' || (loc.type === 'city' && loc.metadata?.isCity)) {
        // Only add if not already in a province
        if (!districtsInProvinces.has(loc._id)) {
          const district = locationMap.get(loc._id)!;
          districts.push(district);
          
          // Find municipalities that belong to this district
          filteredLocations.forEach((municipality) => {
            const munParentId = typeof municipality.parent === 'string' 
              ? municipality.parent 
              : municipality.parent?._id;
            
            if (municipality.type === 'municipality' && munParentId === loc._id) {
              district.children.push(municipality);
            }
          });
          
          // Sort municipalities
          district.children.sort((a, b) => a.name.localeCompare(b.name));
        }
      } else if (loc.type === 'municipality') {
        // Municipality without a district parent (standalone)
        if (!parentId || !locationMap.has(parentId)) {
          standaloneLocations.push(loc);
        }
      } else if (loc.type !== 'province' && loc.type !== 'barangay') {
        // Other types (custom, etc.) - but not provinces (already handled) and not barangays (filtered if hideBarangays)
        standaloneLocations.push(loc);
      }
    });

    // Sort districts and provinces
    districts.sort((a, b) => a.name.localeCompare(b.name));
    provinces.sort((a, b) => a.name.localeCompare(b.name));
    standaloneLocations.sort((a, b) => a.name.localeCompare(b.name));

    return {
      provinces,
      districts,
      standaloneLocations,
    };
  }, [locations, hideBarangays]);

  // Filter hierarchical locations by search query
  const filteredHierarchicalLocations = useMemo(() => {
    if (!searchQuery) return hierarchicalLocations;

    const query = searchQuery.toLowerCase();
    
    const filterLocation = (loc: Location) => {
      return (
        loc.name.toLowerCase().includes(query) ||
        loc.code?.toLowerCase().includes(query)
      );
    };

    const filteredProvinces = hierarchicalLocations.provinces
      .map((province) => {
        const filteredChildren = province.children
          .map((district) => {
            const filteredMunicipalities = district.children.filter(filterLocation);
            if (filterLocation(district) || filteredMunicipalities.length > 0) {
              return {
                ...district,
                children: filteredMunicipalities,
              };
            }
            return null;
          })
          .filter((d): d is NonNullable<typeof d> => d !== null);
        
        if (filterLocation(province) || filteredChildren.length > 0) {
          return {
            ...province,
            children: filteredChildren,
          };
        }
        return null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const filteredDistricts = hierarchicalLocations.districts
      .map((district) => {
        const filteredMunicipalities = district.children.filter(filterLocation);
        if (filterLocation(district) || filteredMunicipalities.length > 0) {
          return {
            ...district,
            children: filteredMunicipalities,
          };
        }
        return null;
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    const filteredStandalone = hierarchicalLocations.standaloneLocations.filter(filterLocation);

    return {
      provinces: filteredProvinces,
      districts: filteredDistricts,
      standaloneLocations: filteredStandalone,
    };
  }, [hierarchicalLocations, searchQuery]);

  // Load coverage areas when locations are selected
  useEffect(() => {
    const checkForMatchingCoverageAreas = async () => {
      if (selectedLocationIds.size === 0) {
        setSuggestedCoverageArea(null);
        return;
      }

      setLoadingCoverageAreas(true);
      try {
        const locationIdsArray = Array.from(selectedLocationIds);
        
        // Check each location for existing coverage areas
        const coverageAreaMap = new Map<string, CoverageArea>();
        
        for (const locationId of locationIdsArray) {
          try {
            const response = await listCoverageAreas({
              geographicUnitId: locationId,
              isActive: true,
            });

            if (response.success && response.data) {
              response.data.forEach((ca) => {
                if (!coverageAreaMap.has(ca._id)) {
                  coverageAreaMap.set(ca._id, ca);
                }
              });
            }
          } catch (err) {
            console.error(`Failed to check coverage areas for location ${locationId}:`, err);
          }
        }

        // Find coverage area that contains ALL selected locations
        const matchingCoverageArea = Array.from(coverageAreaMap.values()).find((ca) => {
          const caLocationIds = ca.geographicUnits.map((unit: any) =>
            typeof unit === "string" ? unit : unit._id
          );
          return locationIdsArray.every((id) => caLocationIds.includes(id));
        });

        if (matchingCoverageArea) {
          setSuggestedCoverageArea(matchingCoverageArea);
          setCreateNewCoverageArea(false);
        } else {
          setSuggestedCoverageArea(null);
          setCreateNewCoverageArea(true);
        }
      } catch (err) {
        console.error("Failed to check for matching coverage areas:", err);
        setSuggestedCoverageArea(null);
        setCreateNewCoverageArea(true);
      } finally {
        setLoadingCoverageAreas(false);
      }
    };

    if (isOpen && selectedLocationIds.size > 0) {
      checkForMatchingCoverageAreas();
    }
  }, [selectedLocationIds, isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedLocationIds(new Set(initialLocationIds));
      setSearchQuery("");
      setCreateNewCoverageArea(false);
      setNewCoverageAreaName("");
    }
  }, [isOpen, initialLocationIds]);

  const handleToggleLocation = (locationId: string) => {
    setSelectedLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  };

  // Handle province selection - selects all districts and municipalities
  const handleToggleProvince = (province: Location & { children: Array<Location & { children: Location[] }> }) => {
    // Collect all location IDs in this province (districts and municipalities)
    const allLocationIds: string[] = [province._id];
    
    province.children.forEach((district) => {
      allLocationIds.push(district._id);
      district.children.forEach((municipality) => {
        allLocationIds.push(municipality._id);
      });
    });

    // Check if all are selected
    const allSelected = allLocationIds.every((id) => selectedLocationIds.has(id));

    setSelectedLocationIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        // Deselect all
        allLocationIds.forEach((id) => next.delete(id));
      } else {
        // Select all
        allLocationIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Check if province is fully selected
  const isProvinceFullySelected = (province: Location & { children: Array<Location & { children: Location[] }> }) => {
    const allLocationIds: string[] = [province._id];
    
    province.children.forEach((district) => {
      allLocationIds.push(district._id);
      district.children.forEach((municipality) => {
        allLocationIds.push(municipality._id);
      });
    });

    return allLocationIds.length > 0 && allLocationIds.every((id) => selectedLocationIds.has(id));
  };

  // Check if province is partially selected
  const isProvincePartiallySelected = (province: Location & { children: Array<Location & { children: Location[] }> }) => {
    const allLocationIds: string[] = [province._id];
    
    province.children.forEach((district) => {
      allLocationIds.push(district._id);
      district.children.forEach((municipality) => {
        allLocationIds.push(municipality._id);
      });
    });

    const selectedCount = allLocationIds.filter((id) => selectedLocationIds.has(id)).length;
    return selectedCount > 0 && selectedCount < allLocationIds.length;
  };


  const handleConfirm = async () => {
    if (selectedLocationIds.size === 0) {
      alert("Please select at least one location");
      return;
    }

    const locationIdsArray = Array.from(selectedLocationIds);
    let coverageAreaIds: string[] = [];

    if (suggestedCoverageArea && !createNewCoverageArea) {
      // Use existing coverage area
      coverageAreaIds = [suggestedCoverageArea._id];
    } else {
      // Create new coverage area
      if (!newCoverageAreaName.trim()) {
        alert("Please provide a name for the new coverage area");
        return;
      }

      try {
        const response = await createCoverageArea({
          name: newCoverageAreaName.trim(),
          geographicUnits: locationIdsArray,
        });

        if (response.success && response.data) {
          coverageAreaIds = [response.data._id];
        } else {
          throw new Error(response.message || "Failed to create coverage area");
        }
      } catch (err: any) {
        alert(err.message || "Failed to create coverage area");
        return;
      }
    }

    onConfirm(coverageAreaIds, locationIdsArray);
    onClose();
  };


  const selectedCount = selectedLocationIds.size;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: "max-h-[90vh]",
        backdrop: "bg-black/50",
      }}
      hideCloseButton
    >
      <ModalContent>
        {(onClose) => (
          <>
            {/* Custom Header */}
            <div className="flex items-start justify-between px-6 pt-4 pb-2 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Assign Coverage Areas
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select locations to assign. You can create a new coverage area or
                  assign to an existing one.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
              >
                <Xmark className="w-4 h-4" />
              </button>
            </div>

            <ModalBody className="px-6 py-4 gap-4">
              {/* Search */}
              <Input
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<Search className="w-4 h-4 text-gray-400" />}
                classNames={{
                  inputWrapper: "border-gray-300 bg-white shadow-sm h-10",
                  input: "text-sm",
                }}
                radius="lg"
                variant="bordered"
                isDisabled={locationsLoading}
              />

              {/* Selected Count */}
              {selectedCount > 0 && (
                <div className="text-sm text-gray-600">
                  {selectedCount} location{selectedCount !== 1 ? "s" : ""} selected
                </div>
              )}

              {/* Location Selection - Hierarchical Structure */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {/* Loading State */}
                {locationsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-sm text-gray-600">Loading locations...</p>
                  </div>
                ) : (
                  <>
                    {/* Show Districts with nested Municipalities */}
                    {filteredHierarchicalLocations.districts.length > 0 && (
                  <div className="space-y-3">
                    {filteredHierarchicalLocations.districts.map((district) => {
                      const districtSelected = selectedLocationIds.has(district._id);
                      const allMunicipalitiesSelected = district.children.length > 0 && 
                        district.children.every((mun) => selectedLocationIds.has(mun._id));
                      const someMunicipalitiesSelected = district.children.some((mun) => 
                        selectedLocationIds.has(mun._id)
                      );

                      return (
                        <div key={district._id} className="space-y-1 border border-gray-200 rounded-lg p-3 bg-gray-50">
                          {/* District */}
                          <div className="flex items-center gap-2 py-1">
                            <Checkbox
                              isSelected={districtSelected}
                              onValueChange={() => handleToggleLocation(district._id)}
                              size="sm"
                            >
                              <span className="text-sm font-semibold text-gray-900">
                                {district.name}
                              </span>
                            </Checkbox>
                          </div>

                          {/* Municipalities nested under district */}
                          {district.children.length > 0 && (
                            <div className="pl-6 space-y-1 border-l-2 border-gray-300 ml-2">
                              {district.children.map((municipality) => (
                                <div
                                  key={municipality._id}
                                  className="flex items-center gap-2 py-0.5"
                                >
                                  <Checkbox
                                    isSelected={selectedLocationIds.has(municipality._id)}
                                    onValueChange={() => handleToggleLocation(municipality._id)}
                                    size="sm"
                                  >
                                    <span className="text-sm text-gray-700">
                                      {municipality.name}
                                    </span>
                                  </Checkbox>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Show Provinces with nested Districts and Municipalities */}
                {filteredHierarchicalLocations.provinces.length > 0 && (
                  <div className="space-y-3">
                    {filteredHierarchicalLocations.provinces.map((province) => {
                      const provinceSelected = isProvinceFullySelected(province);
                      const provincePartial = isProvincePartiallySelected(province);
                      
                      return (
                        <div key={province._id} className="space-y-2 border border-gray-200 rounded-lg p-3 bg-white">
                        {/* Province Header with Checkbox */}
                        <div className="flex items-center gap-2 border-b border-gray-300 pb-2">
                          <Checkbox
                            isSelected={provinceSelected}
                            isIndeterminate={provincePartial}
                            onValueChange={() => handleToggleProvince(province)}
                            size="sm"
                          >
                            <span className="text-sm font-bold text-gray-900">
                              {province.name}
                            </span>
                          </Checkbox>
                        </div>

                        {/* Districts under Province */}
                        {province.children.map((district) => {
                          const districtSelected = selectedLocationIds.has(district._id);
                          
                          return (
                            <div key={district._id} className="space-y-1 pl-2">
                              {/* District */}
                              <div className="flex items-center gap-2 py-1">
                                <Checkbox
                                  isSelected={districtSelected}
                                  onValueChange={() => handleToggleLocation(district._id)}
                                  size="sm"
                                >
                                  <span className="text-sm font-semibold text-gray-900">
                                    {district.name}
                                  </span>
                                </Checkbox>
                              </div>

                              {/* Municipalities nested under district */}
                              {district.children.length > 0 && (
                                <div className="pl-6 space-y-1 border-l-2 border-gray-300 ml-2">
                                  {district.children.map((municipality) => (
                                    <div
                                      key={municipality._id}
                                      className="flex items-center gap-2 py-0.5"
                                    >
                                      <Checkbox
                                        isSelected={selectedLocationIds.has(municipality._id)}
                                        onValueChange={() => handleToggleLocation(municipality._id)}
                                        size="sm"
                                      >
                                        <span className="text-sm text-gray-700">
                                          {municipality.name}
                                        </span>
                                      </Checkbox>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Standalone locations (not part of hierarchy) */}
                {filteredHierarchicalLocations.standaloneLocations.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-700">Other Locations</h3>
                    </div>
                    <div className="space-y-1 pl-2">
                      {filteredHierarchicalLocations.standaloneLocations.map((location) => (
                        <div
                          key={location._id}
                          className="flex items-center gap-2 py-1 hover:bg-gray-50 rounded px-2"
                        >
                          <Checkbox
                            isSelected={selectedLocationIds.has(location._id)}
                            onValueChange={() => handleToggleLocation(location._id)}
                            size="sm"
                          >
                            <span className="text-sm text-gray-700">
                              {location.name}
                              {location.code && (
                                <span className="text-xs text-gray-400 ml-1">
                                  ({location.code})
                                </span>
                              )}
                            </span>
                          </Checkbox>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>

              {/* Coverage Area Suggestion */}
              {selectedCount > 0 && (
                <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                  {loadingCoverageAreas ? (
                    <div className="text-sm text-gray-700">Checking for existing coverage areas...</div>
                  ) : suggestedCoverageArea && !createNewCoverageArea ? (
                    <>
                      <div className="text-sm font-medium text-gray-900">
                        Existing Coverage Area Found
                      </div>
                      <div className="text-sm text-gray-700">
                        "{suggestedCoverageArea.name}" already contains all selected
                        locations.
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="bordered"
                          onPress={() => setCreateNewCoverageArea(true)}
                          className="text-xs"
                        >
                          Create New Instead
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-gray-900">
                        Create New Coverage Area
                      </div>
                      <Input
                        placeholder="Coverage area name (e.g., 'Camarines Norte – Unified')"
                        value={newCoverageAreaName}
                        onChange={(e) => setNewCoverageAreaName(e.target.value)}
                        classNames={{
                          inputWrapper: "border-gray-300 bg-white h-10",
                          input: "text-sm",
                        }}
                        radius="lg"
                        variant="bordered"
                      />
                      {suggestedCoverageArea && (
                        <Button
                          size="sm"
                          variant="light"
                          onPress={() => {
                            setCreateNewCoverageArea(false);
                            setNewCoverageAreaName("");
                          }}
                          className="text-xs text-gray-600"
                        >
                          Use Existing: {suggestedCoverageArea.name}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </ModalBody>

            <ModalFooter className="px-6 pb-5 pt-3 gap-3 border-t border-gray-100">
              <Button
                variant="bordered"
                onPress={onClose}
                className="flex-1 h-11 border-gray-300 font-medium text-sm"
                radius="lg"
              >
                Cancel
              </Button>
              <Button
                onPress={handleConfirm}
                isDisabled={selectedCount === 0 || loadingCoverageAreas}
                className="flex-1 h-11 bg-black text-white font-medium text-sm hover:bg-gray-800"
                radius="lg"
              >
                {loadingCoverageAreas
                  ? "Checking..."
                  : suggestedCoverageArea && !createNewCoverageArea
                  ? "Assign to Existing"
                  : "Create & Assign"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

