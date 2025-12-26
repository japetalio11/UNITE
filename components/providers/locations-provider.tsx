"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchJsonWithAuth } from "@/utils/fetchWithAuth";

type Province = {
  _id: string;
  name: string;
  // other fields
};

type District = {
  _id: string;
  name: string;
  province: string; // province _id
  // other fields
};

type Municipality = {
  _id: string;
  name: string;
  district: string; // district _id
  province: string; // province _id
  // other fields
};

type LocationData = {
  provinces: Record<string, Province>;
  districts: Record<string, District>;
  municipalities: Record<string, Municipality>;
};

type CachedLocations = { ts: number; data: LocationData };

const STORAGE_KEY = "unite_locations_v2";
const TTL = 30 * 60 * 1000; // 30 minutes

const defaultState = {
  locations: { provinces: {}, districts: {}, municipalities: {} } as LocationData,
  loading: false,
  getProvinceName: (id: string) => "",
  getDistrictName: (id: string) => "",
  getMunicipalityName: (id: string) => "",
  getFullLocation: (provinceId?: string, districtId?: string, municipalityId?: string) => "",
  getDistrictsForProvince: (provinceId: string) => [] as District[],
  getMunicipalitiesForDistrict: (districtId: string) => [] as Municipality[],
  getAllProvinces: () => [] as Province[],
  getAllDistricts: () => [] as District[],
  getAllMunicipalities: () => [] as Municipality[],
  refreshAll: async () => {},
};

const LocationsContext = createContext(defaultState);

function readStorage(): CachedLocations | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedLocations;
  } catch (e) {
    return null;
  }
}

function writeStorage(cache: CachedLocations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    // ignore
  }
}

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<LocationData>({ provinces: {}, districts: {}, municipalities: {} });
  const [loading, setLoading] = useState(false);

  const isFresh = (ts: number) => Date.now() - ts < TTL;

  const fetchAllLocations = useCallback(async (force = false) => {
    try {
      const stored = readStorage();
      if (!force && stored && isFresh(stored.ts)) {
        setLocations(stored.data);
        return stored.data;
      }

      setLoading(true);

      // Fetch all provinces
      let provinces: any[] = [];
      try {
        const provincesData = await fetchJsonWithAuth("/api/locations/provinces");
        provinces = Array.isArray(provincesData) ? provincesData : provincesData.data || provincesData.provinces || [];
        console.log(`[LocationsProvider] Fetched ${provinces.length} provinces`);
        if (provinces.length === 0) {
          console.warn("[LocationsProvider] No provinces returned from API, trying fallback endpoint");
          // Try fallback endpoint
          try {
            const fallbackData = await fetchJsonWithAuth("/api/utility/provinces");
            provinces = Array.isArray(fallbackData) ? fallbackData : fallbackData.data || fallbackData.provinces || [];
            console.log(`[LocationsProvider] Fallback fetched ${provinces.length} provinces`);
          } catch (e2) {
            console.error("[LocationsProvider] Fallback provinces fetch also failed:", e2);
          }
        }
      } catch (e: any) {
        console.error("[LocationsProvider] Error fetching provinces:", e?.message || e);
        // Try fallback endpoint
        try {
          const fallbackData = await fetchJsonWithAuth("/api/utility/provinces");
          provinces = Array.isArray(fallbackData) ? fallbackData : fallbackData.data || fallbackData.provinces || [];
          console.log(`[LocationsProvider] Fallback fetched ${provinces.length} provinces`);
        } catch (e2: any) {
          console.error("[LocationsProvider] Fallback provinces fetch also failed:", e2?.message || e2);
        }
      }
      const provincesMap: Record<string, Province> = {};
      provinces.forEach((p: any) => {
        // Normalize ID to string for consistent matching
        const id = String(p._id || p.id || '');
        if (id && id !== 'undefined' && id !== 'null' && id !== '') {
          provincesMap[id] = { ...p, _id: id };
        }
      });

      // Fetch all districts (assume API supports fetching all, e.g., with high limit)
      const districtsData = await fetchJsonWithAuth("/api/districts?limit=10000");
      const districts = Array.isArray(districtsData) ? districtsData : districtsData.data || districtsData.districts || [];
      const districtsMap: Record<string, District> = {};
      districts.forEach((d: any) => {
        // Normalize ID to string for consistent matching
        const id = String(d._id || d.id || '');
        if (id && id !== 'undefined' && id !== 'null' && id !== '') {
          districtsMap[id] = { ...d, _id: id };
        }
      });

      // Fetch all municipalities
      const municipalitiesData = await fetchJsonWithAuth("/api/locations/municipalities?limit=10000");
      const municipalities = Array.isArray(municipalitiesData) ? municipalitiesData : municipalitiesData.data || municipalitiesData.municipalities || [];
      const municipalitiesMap: Record<string, Municipality> = {};
      municipalities.forEach((m: any) => {
        // Normalize ID to string for consistent matching
        const id = String(m._id || m.id || '');
        if (id && id !== 'undefined' && id !== 'null' && id !== '') {
          municipalitiesMap[id] = { ...m, _id: id };
        }
      });

      const newData: LocationData = {
        provinces: provincesMap,
        districts: districtsMap,
        municipalities: municipalitiesMap,
      };

      const cache: CachedLocations = { ts: Date.now(), data: newData };
      writeStorage(cache);
      setLocations(newData);
      return newData;
    } catch (e) {
      console.error("Error fetching locations:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await fetchAllLocations(true);
  }, [fetchAllLocations]);

  useEffect(() => {
    const stored = readStorage();
    if (stored && isFresh(stored.ts)) {
      setLocations(stored.data);
    } else {
      fetchAllLocations();
    }

    // Periodic refresh
    const id = setInterval(() => {
      fetchAllLocations(true);
    }, TTL);

    return () => clearInterval(id);
  }, [fetchAllLocations]);

  const getProvinceName = useCallback((id: string) => {
    return locations.provinces[id]?.name || "Unknown Province";
  }, [locations]);

  const getDistrictName = useCallback((id: string) => {
    return locations.districts[id]?.name || "Unknown District";
  }, [locations]);

  const getMunicipalityName = useCallback((id: string) => {
    return locations.municipalities[id]?.name || "Unknown Municipality";
  }, [locations]);

  const getFullLocation = useCallback((provinceId?: string, districtId?: string, municipalityId?: string) => {
    const parts = [];
    if (provinceId) parts.push(getProvinceName(provinceId));
    if (districtId) parts.push(getDistrictName(districtId));
    if (municipalityId) parts.push(getMunicipalityName(municipalityId));
    return parts.join(", ");
  }, [getProvinceName, getDistrictName, getMunicipalityName]);

  const getDistrictsForProvince = useCallback((provinceId: string): District[] => {
    if (!provinceId) return [];
    return Object.values(locations.districts).filter(d => d.province === provinceId);
  }, [locations.districts]);

  const getMunicipalitiesForDistrict = useCallback((districtId: string): Municipality[] => {
    if (!districtId) return [];
    return Object.values(locations.municipalities).filter(m => m.district === districtId);
  }, [locations.municipalities]);

  const getAllProvinces = useCallback((): Province[] => {
    return Object.values(locations.provinces);
  }, [locations.provinces]);

  const getAllDistricts = useCallback((): District[] => {
    return Object.values(locations.districts);
  }, [locations.districts]);

  const getAllMunicipalities = useCallback((): Municipality[] => {
    return Object.values(locations.municipalities);
  }, [locations.municipalities]);

  const value = {
    locations,
    loading,
    getProvinceName,
    getDistrictName,
    getMunicipalityName,
    getFullLocation,
    getDistrictsForProvince,
    getMunicipalitiesForDistrict,
    getAllProvinces,
    getAllDistricts,
    getAllMunicipalities,
    refreshAll,
  };

  return <LocationsContext.Provider value={value}>{children}</LocationsContext.Provider>;
}

export function useLocations() {
  return useContext(LocationsContext);
}

export default LocationsProvider;
