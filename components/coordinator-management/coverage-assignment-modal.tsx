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
import { useLocationsOptimized } from "@/hooks/useLocationsOptimized";
import { listCoverageAreas, createCoverageArea } from "@/services/coordinatorService";
import type { CoverageArea, Location } from "@/types/coordinator.types";
import LocationTreeSelector from "./location-tree-selector";

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
  // Use OPTIMIZED location hook for faster loading
  const { 
    provinces, 
    tree, 
    flat: locations, 
    loading: locationsLoading,
    expandNode,
    collapseNode,
  } = useLocationsOptimized(isOpen);
  
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(
    new Set(initialLocationIds)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [coverageAreas, setCoverageAreas] = useState<CoverageArea[]>([]);
  const [loadingCoverageAreas, setLoadingCoverageAreas] = useState(false);
  const [suggestedCoverageArea, setSuggestedCoverageArea] = useState<CoverageArea | null>(null);
  const [createNewCoverageArea, setCreateNewCoverageArea] = useState(false);
  const [newCoverageAreaName, setNewCoverageAreaName] = useState("");
  const [isExpandingProvinces, setIsExpandingProvinces] = useState(false);

  // Auto-expand all provinces on initial load to show full tree (province → district → municipality)
  // CRITICAL: Only expand provinces that have NEVER been loaded (!hasChildren)
  // Do NOT re-expand provinces the user intentionally collapsed
  useEffect(() => {
    if (isOpen && provinces.length > 0 && !isExpandingProvinces && tree.length === provinces.length) {
      // Only auto-expand provinces that have NO children loaded yet
      // This prevents re-expanding collapsed provinces
      const notYetLoadedProvinces = tree.filter(p => !p.hasChildren);
      
      if (notYetLoadedProvinces.length > 0) {
        setIsExpandingProvinces(true);
        
        // Expand all provinces in parallel - this loads the full tree with all descendants expanded
        Promise.all(
          notYetLoadedProvinces.map(province => expandNode(province._id, 'full'))
        ).finally(() => {
          setIsExpandingProvinces(false);
        });
      }
    }
  }, [isOpen, provinces, tree, expandNode, isExpandingProvinces]);

  // Build hierarchical structure: Districts with nested municipalities
  const hierarchicalLocations = useMemo(() => {
    // Filter out barangays if hideBarangays is true
    const filteredLocations = hideBarangays 
      ? locations.filter(loc => loc.type !== 'barangay')
      : locations;
    
    // Helper function to normalize Location from useLocations to Location from coordinator.types
    const normalizeLocation = (loc: import("@/hooks/useLocations").Location): Location => {
      return {
        _id: loc._id,
        name: loc.name,
        type: loc.type,
        code: loc.code,
        parent: typeof loc.parent === 'string' ? loc.parent : (loc.parent as any)?._id || undefined,
        isActive: loc.isActive,
      };
    };
    
    // Create a map of all locations by ID
    const locationMap = new Map<string, Location & { children: Location[] }>();
    
    // First, create entries for all locations
    filteredLocations.forEach((loc) => {
      locationMap.set(loc._id, { ...normalizeLocation(loc), children: [] });
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
        const province = { ...normalizeLocation(loc), children: [] as Array<Location & { children: Location[] }> };
        
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
                dist.children.push(normalizeLocation(municipality));
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
              district.children.push(normalizeLocation(municipality));
            }
          });
          
          // Sort municipalities
          district.children.sort((a, b) => a.name.localeCompare(b.name));
        }
      } else if (loc.type === 'municipality') {
        // Municipality without a district parent (standalone)
        if (!parentId || !locationMap.has(parentId)) {
          standaloneLocations.push(normalizeLocation(loc));
        }
      } else if (loc.type !== 'province' && loc.type !== 'barangay') {
        // Other types (custom, etc.) - but not provinces (already handled) and not barangays (filtered if hideBarangays)
        standaloneLocations.push(normalizeLocation(loc));
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

  // Build lookup caches for fast retrieval
  const { districtChildrenMap, provinceAllIdsMap } = useMemo(() => {
    const districtChildrenMap = new Map<string, string[]>();
    const provinceAllIdsMap = new Map<string, string[]>();

    // Add standalone districts
    hierarchicalLocations.districts.forEach((d) => {
      districtChildrenMap.set(d._id, d.children.map((m) => m._id));
    });

    // Add provinces' districts and build province -> all ids map
    hierarchicalLocations.provinces.forEach((p) => {
      const provinceAll: string[] = [p._id];
      p.children.forEach((d) => {
        provinceAll.push(d._id);
        const munIds = d.children.map((m) => m._id);
        provinceAll.push(...munIds);

        // Ensure district map includes districts nested under provinces
        districtChildrenMap.set(d._id, munIds);
      });
      provinceAllIdsMap.set(p._id, provinceAll);
    });

    return { districtChildrenMap, provinceAllIdsMap };
  }, [hierarchicalLocations]);

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
    // If the clicked location is a district, toggle the district and all its municipalities
    // Use cached district -> municipality ids map if available
    if (districtChildrenMap.has(locationId)) {
      const munIds = districtChildrenMap.get(locationId) || [];
      const allIds = [locationId, ...munIds];

      setSelectedLocationIds((prev) => {
        const next = new Set(prev);
        const allSelected = allIds.every((id) => next.has(id));
        if (allSelected) {
          allIds.forEach((id) => next.delete(id));
        } else {
          allIds.forEach((id) => next.add(id));
        }
        return next;
      });

      return;
    }

    // Default: toggle a single location (municipality, province, or other)
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
    // Use cached province -> all ids map for fast retrieval
    const allLocationIds = provinceAllIdsMap.get(province._id) || (() => {
      const ids: string[] = [province._id];
      province.children.forEach((d) => {
        ids.push(d._id);
        d.children.forEach((m) => ids.push(m._id));
      });
      return ids;
    })();

    const allSelected = allLocationIds.every((id) => selectedLocationIds.has(id));

    setSelectedLocationIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allLocationIds.forEach((id) => next.delete(id));
      } else {
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

              {/* Location Selection - OPTIMIZED Tree View */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg p-3">
                {isExpandingProvinces && (
                  <div className="text-center py-4 text-sm text-gray-600">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mb-2"></div>
                    <p>Loading location tree...</p>
                  </div>
                )}
                <LocationTreeSelector
                  tree={tree}
                  selectedIds={selectedLocationIds}
                  onSelectionChange={setSelectedLocationIds}
                  onExpandNode={(nodeId) => expandNode(nodeId, 'full')}
                  onCollapseNode={collapseNode}
                  searchQuery={searchQuery}
                  hideBarangays={hideBarangays}
                  loading={locationsLoading && !isExpandingProvinces}
                />
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

