"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { getUserInfo } from "../../../utils/getUserInfo";
import { debug, warn } from "../../../utils/devLogger";

import Topbar from "@/components/layout/topbar";
import StakeholderToolbar from "@/components/stakeholder-management/stakeholder-management-toolbar";
import StakeholderTable from "@/components/stakeholder-management/stakeholder-management-table";
import AddStakeholderModal from "@/components/stakeholder-management/add-stakeholder-modal";
import QuickFilterModal from "@/components/stakeholder-management/quick-filter-modal";
import AdvancedFilterModal from "@/components/stakeholder-management/advanced-filter-modal";
import EditStakeholderModal from "@/components/stakeholder-management/stakeholder-edit-modal";
import DeleteStakeholderModal from "@/components/stakeholder-management/delete-stakeholder-modal";
import {
  Ticket,
  Calendar as CalIcon,
  PersonPlanetEarth,
  Persons,
  Bell,
  Gear,
  Comments,
} from "@gravity-ui/icons";
import MobileNav from "@/components/tools/mobile-nav";
// Removed verbose debug logging from this page per request

interface StakeholderFormData {
  firstName: string;
  middleName?: string;
  lastName: string;
  stakeholderName?: string;
  stakeholderEmail: string;
  contactNumber: string;
  password: string;
  retypePassword: string;
  province: string;
  district: string;
  districtId?: string;
  cityMunicipality?: string;
}

export default function StakeholderManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>(
    [],
  );
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [signupRequests, setSignupRequests] = useState<any[]>([]);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    province?: string;
    districtId?: string;
  }>({});
  const [openQuickFilter, setOpenQuickFilter] = useState(false);
  const [openAdvancedFilter, setOpenAdvancedFilter] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<any | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingStakeholder, setDeletingStakeholder] = useState<{
    id: string;
    name: string;
  } | null>(null);
  // map of District_ID -> district object to resolve province and formatted district
  const [districtsMap, setDistrictsMap] = useState<Record<string, any> | null>(
    null,
  );
  const [districtsList, setDistrictsList] = useState<any[]>([]);
  const [provincesList, setProvincesList] = useState<any[]>([]);
  const [provincesMap, setProvincesMap] = useState<Record<string, string>>({});
  const [municipalityCache, setMunicipalityCache] = useState<
    Record<string, string>
  >({});
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [pendingAcceptId, setPendingAcceptId] = useState<string | null>(null);
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Do not call getUserInfo() synchronously — read it on mount so server and client
  // produce the same initial HTML; update user-derived state after hydration.
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [displayName, setDisplayName] = useState("Bicol Medical Center");
  const [displayEmail, setDisplayEmail] = useState("bmc@gmail.com");
  const [canManageStakeholders, setCanManageStakeholders] = useState(false);
  const [userDistrictId, setUserDistrictId] = useState<string | null>(null);
  const [openUserDistrictId, setOpenUserDistrictId] = useState<string | null>(
    null,
  );
  const [userAccountType, setUserAccountType] = useState<string | null>(null);
  // Add Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Or whatever size you prefer

  // Mobile navigation state (handled by MobileNav component)
  const [isMobile, setIsMobile] = useState(false);

  // Reset to page 1 when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTab, filters]);

  // 1. Determine the source data based on the selected tab
  const rawData = useMemo(() => {
  // 1. PENDING TAB: Return signup requests directly
  if (selectedTab === "pending") {
    return signupRequests;
  }

  // 2. APPROVED TAB: Return all stakeholders (approved means not pending)
  if (selectedTab === "approved") {
    return stakeholders;
  }

  // 3. ALL TAB: Combine both approved stakeholders and pending signup requests
  // Mark stakeholders as approved and signup requests as pending
  const approvedItems = stakeholders.map((s: any) => ({ ...s, _isRequest: false }));
  const pendingItems = signupRequests.map((r: any) => ({ ...r, _isRequest: true }));
  return [...approvedItems, ...pendingItems]; 
}, [selectedTab, signupRequests, stakeholders]);

  // 2. Apply Search Filtering (Lifted from Table)
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return rawData;

    return rawData.filter((coordinator: any) => {
      return (
        (coordinator.name || "").toLowerCase().includes(q) ||
        (coordinator.email || "").toLowerCase().includes(q) ||
        (coordinator.organization || coordinator.entity || "").toLowerCase().includes(q) ||
        (coordinator.province || "").toLowerCase().includes(q) ||
        (coordinator.district || "").toLowerCase().includes(q) ||
        (
          (municipalityCache && municipalityCache[String(coordinator.municipality)]) ||
          coordinator.municipality ||
          ""
        ).toLowerCase().includes(q)
      );
    });
  }, [rawData, searchQuery, municipalityCache]);

  // 3. Calculate Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, itemsPerPage]);
  const router = useRouter();

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

  const formatDistrict = (districtObj: any) => {
    if (!districtObj) return "";
    // Support both legacy and new district shapes
    if (districtObj.District_Number)
      return `${ordinalSuffix(districtObj.District_Number)} District`;
    if (districtObj.District_Name) return districtObj.District_Name;
    if (districtObj.name) return districtObj.name;
    if (districtObj.District_Name) return districtObj.District_Name;

    return "";
  };

  const updateStakeholderNames = () => {
    setStakeholders(prev => prev.map(s => {
      let districtObj = s.District || s.District_Details || null;

      if (!districtObj && districtsMap && (s.District_ID || s.DistrictId)) {
        districtObj = districtsMap[String(s.District_ID || s.DistrictId)] || null;
      }

      let newProvince = "";
      if (s.Province_Name) newProvince = s.Province_Name;
      else if (districtObj && districtObj.province) {
        if (typeof districtObj.province === "string" || typeof districtObj.province === "number") {
          newProvince = provincesMap[String(districtObj.province)] || "";
        } else if (districtObj.province && (districtObj.province.name || districtObj.province.Province_Name)) {
          newProvince = districtObj.province.name || districtObj.province.Province_Name || "";
        }
      }
      if (!newProvince && s.province) {
        newProvince = provincesMap[String(s.province)] || "";
      }

      let newDistrict = "";
      if (districtObj) {
        newDistrict = formatDistrict(districtObj);
      } else if (s.District_Name) {
        newDistrict = s.District_Name;
      } else if (s.District_ID || s.district) {
        const idCandidate = s.District_ID || s.district;
        const m = String(idCandidate).match(/(\d+)$/);

        if (m) {
          const num = Number(m[1]);

          if (!Number.isNaN(num))
            newDistrict = `${ordinalSuffix(num)} District`;
        } else {
          newDistrict = String(idCandidate);
        }
      }

      return {
        ...s,
        province: newProvince || s.province,
        district: newDistrict || s.district,
      };
    }));
  };

  // Detect mobile viewport
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };
    if (typeof window !== "undefined") {
      checkViewport();
      window.addEventListener("resize", checkViewport);
      return () => window.removeEventListener("resize", checkViewport);
    }
  }, []);

  useEffect(() => {
    try {
      const info = getUserInfo();

      setUserInfo(info);
      const rawUser = info?.raw || null;
      const staffType =
        rawUser?.StaffType ||
        rawUser?.Staff_Type ||
        rawUser?.staff_type ||
        rawUser?.staffType ||
        (rawUser?.user &&
          (rawUser.user.StaffType ||
            rawUser.user.staff_type ||
            rawUser.user.staffType)) ||
        null;
      const isStaffAdmin =
        !!staffType && String(staffType).toLowerCase() === "admin";
      const resolvedRole = info?.role || null;
      const roleLower = resolvedRole ? String(resolvedRole).toLowerCase() : "";
      const isSystemAdmin =
        !!info?.isAdmin ||
        (roleLower.includes("sys") && roleLower.includes("admin"));

      // Allow management when the user is a system admin OR has StaffType 'admin'.
      // Previous logic required both which could incorrectly block sys-admin users.
      const resolvedCanManage = !!(isSystemAdmin || isStaffAdmin || roleLower === "admin");
      setCanManageStakeholders(resolvedCanManage);
      // Determine a default account type for non-sysadmin roles (e.g. Coordinators)
      let accountType: string | null = null;
      try {
        const staffLower = (staffType || "").toString().toLowerCase();
        if (staffLower === "coordinator" || roleLower.includes("coordinator")) {
          accountType = "LGU";
        }
      } catch (e) {
        accountType = null;
      }
      setUserAccountType(accountType);
      // Stakeholders cannot access this page
      if (roleLower === "stakeholder") {
        try {
          router.replace('/error');
        } catch (e) {
          /* ignore navigation errors during SSR */
        }
        return;
      }
      setDisplayName(info?.displayName || "Bicol Medical Center");
      setDisplayEmail(info?.email || "bmc@gmail.com");
      // determine logged-in user's district id (if any)
      try {
        const rawUser = localStorage.getItem("unite_user");
        const u = rawUser ? JSON.parse(rawUser) : null;
        const uid =
          u?.District_ID ||
          u?.DistrictId ||
          u?.districtId ||
          (u?.District && (u.District.District_ID || u.District.DistrictId)) ||
          (info?.raw &&
            (info.raw.District_ID ||
              info.raw.DistrictId ||
              info.raw.districtId)) ||
          null;

        setUserDistrictId(uid || null);
      } catch (e) {
        /* ignore */
      }
    } catch (e) {
      /* ignore */
    }
  }, []);

  // Load districts once so we can resolve District_ID -> friendly names and province
  useEffect(() => {
    const loadDistricts = async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/districts?limit=1000`
          : `/api/districts?limit=1000`;
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        const headers: any = {};

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(url, { headers });
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;

        if (!res.ok) return;
        const items = json.data || [];
        const map: Record<string, any> = {};

        for (const d of items) {
          // Support legacy and new shapes: prefer legacy District_ID, but also index by _id
          if (d.District_ID) map[String(d.District_ID)] = d;
          if (d._id) map[String(d._id)] = d;
        }
        setDistrictsMap(map);
        setDistrictsList(items);
      } catch (e) {
        // ignore district load errors
      }
    };

    loadDistricts();
  }, []);

  // Load provinces so we can resolve province ObjectIds to human-friendly names
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/locations/provinces`
          : `/api/locations/provinces`;
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        const headers: any = {};

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(url, { headers });

        if (!res.ok) return;
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        const items = (json && (json.data || json.provinces)) || [];

        setProvincesList(items || []);
        const pm: Record<string, string> = {};

        for (const p of items || []) {
          if (p._id)
            pm[String(p._id)] =
              p.name || p.Province_Name || p.Name || String(p._id);
          if (p.id)
            pm[String(p.id)] =
              p.name || p.Province_Name || p.Name || String(p.id);
        }
        setProvincesMap(pm);
      } catch (e) {
        // ignore
      }
    };

    loadProvinces();
  }, []);

  // Update stakeholder names when provinces are loaded
  useEffect(() => {
    if (provincesMap) {
      updateStakeholderNames();
    }
  }, [provincesMap]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleUserClick = () => {
    debug("User profile clicked");
  };

  const handleExport = () => {
    debug("Exporting data...");
  };

  // generate-code functionality removed from toolbar per new design

  const handleQuickFilter = () => {
    setOpenQuickFilter(true);
  };

  const handleAdvancedFilter = () => {
    setOpenAdvancedFilter(true);
  };

  const handleAddStakeholder = () => {
    // Recompute user district id at the moment of opening the modal to ensure we capture
    // the latest stored user shape (some sessions store different key names).
    try {
      let uid: any = null;
      let parsed: any = null;

      // First, use getUserInfo() which centralizes parsing logic
      try {
        const info = getUserInfo();

        if (info && info.raw) {
          const r = info.raw;

          uid =
            r?.District_ID ||
            r?.DistrictId ||
            r?.districtId ||
            r?.district_id ||
            null;
        }
      } catch (e) {
        /* ignore */
      }

      // If still not found, try reading from localStorage / sessionStorage variants
      if (!uid) {
        try {
          const raw =
            localStorage.getItem("unite_user") ||
            sessionStorage.getItem("unite_user");

          parsed = raw ? JSON.parse(raw) : null;
        } catch (e) {
          parsed = null;
        }

        const searchPaths = [
          parsed,
          parsed?.user,
          parsed?.data,
          parsed?.staff,
          parsed?.profile,
          parsed?.User,
          parsed?.result,
          parsed?.userInfo,
        ];

        for (const p of searchPaths) {
          if (!p) continue;
          if (p.District_ID) {
            uid = p.District_ID;
            break;
          }
          if (p.DistrictId) {
            uid = p.DistrictId;
            break;
          }
          if (p.districtId) {
            uid = p.districtId;
            break;
          }
          if (p.district_id) {
            uid = p.district_id;
            break;
          }
          if (
            p.District &&
            (p.District.District_ID ||
              p.District.DistrictId ||
              p.District.districtId ||
              p.District.district_id)
          ) {
            uid =
              p.District.District_ID ||
              p.District.DistrictId ||
              p.District.districtId ||
              p.District.district_id;
            break;
          }
          if (
            p.district &&
            (p.district.District_ID ||
              p.district.DistrictId ||
              p.district.districtId ||
              p.district.district_id)
          ) {
            uid =
              p.district.District_ID ||
              p.district.DistrictId ||
              p.district.districtId ||
              p.district.district_id;
            break;
          }
          if (
            p.role_data &&
            (p.role_data.district_id ||
              p.role_data.districtId ||
              p.role_data.district)
          ) {
            uid =
              p.role_data.district_id ||
              p.role_data.districtId ||
              p.role_data.district;
            break;
          }
          if (
            p.user &&
            (p.user.District_ID ||
              p.user.DistrictId ||
              p.user.districtId ||
              p.user.district_id)
          ) {
            uid =
              p.user.District_ID ||
              p.user.DistrictId ||
              p.user.districtId ||
              p.user.district_id;
            break;
          }
        }
      }

      setUserDistrictId(uid || null);
      setOpenUserDistrictId(uid || null);
      // Include both centralized getUserInfo and raw parsed object for diagnostics
      let infoForDebug = null;

      try {
        infoForDebug = getUserInfo();
      } catch (e) {
        infoForDebug = null;
      }
      debug(
        "[StakeholderManagement] handleAddStakeholder getUserInfo():",
        infoForDebug,
      );
      debug(
        "[StakeholderManagement] handleAddStakeholder parsed fallback object:",
        parsed,
      );
      debug(
        "[StakeholderManagement] handleAddStakeholder computed userDistrictId:",
        uid,
      );
    } catch (e) {
      // ignore
    }
    setIsAddModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setOpenUserDistrictId(null);
  };

  const handleCodeCreated = (code: any) => {
    // kept for compatibility; generate-code modal removed from toolbar
  };

  const handleModalSubmit = async (data: any) => {
    setModalError(null);
    setIsCreating(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      let rawUser = null;

      try {
        rawUser = localStorage.getItem("unite_user");
      } catch (e) {
        rawUser = null;
      }
      const user = rawUser ? JSON.parse(rawUser) : null;
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token")
          : null;
      // Always post to the register endpoint per backend routes
      const url = base
        ? `${base}/api/stakeholders/register`
        : `/api/stakeholders/register`;

      // Resolve District_ID robustly: the frontend may have a Mongo _id, a legacy
      // District_ID (like CSUR-001), or a generic numeric/string id. Prefer the
      // canonical District.District_ID when available by looking up the
      // pre-fetched `districtsList`. Also include the DB object id as a
      // supplemental field to maximize compatibility with different backends.
      let resolvedDistrictValue: any =
        data.districtId || data.district || userDistrictId || null;
      let resolvedDistrictObj: any = null;

      try {
        if (
          resolvedDistrictValue &&
          Array.isArray(districtsList) &&
          districtsList.length > 0
        ) {
          const found = districtsList.find(
            (d: any) =>
              String(d._id) === String(resolvedDistrictValue) ||
              String(d.id) === String(resolvedDistrictValue) ||
              String(d.District_ID) === String(resolvedDistrictValue),
          );

          if (found) {
            resolvedDistrictObj = found;
            // Prefer the human-readable District_ID (e.g. CSUR-001) if present,
            // otherwise fall back to the DB _id so the backend can validate.
            resolvedDistrictValue =
              found.District_ID ||
              found._id ||
              found.id ||
              resolvedDistrictValue;
          }
        }
      } catch (e) {
        // ignore lookup errors and fall back to raw values
      }

      const payload: any = {
        // Legacy/previously used keys (kept for backward compatibility)
        First_Name: data.firstName,
        Middle_Name: data.middleName || null,
        Last_Name: data.lastName,
        Email: data.stakeholderEmail,
        Organization_Institution: data.organization || null,
        Phone_Number: data.contactNumber,
        Password: data.password,
        Province_Name: data.province,
        // Account type (LGU / Others)
        Account_Type: data.accountType || data.accountType || null,
        // Primary field used by backend validations
        District_ID: resolvedDistrictValue || null,
        // Supplemental: include DB object id when available (some backends expect this)
        District_ObjectId:
          resolvedDistrictObj?._id || resolvedDistrictObj?.id || null,
        City_Municipality: data.cityMunicipality || null,
        // Provide municipality DB id (backend register expects `municipality` id)
        municipality: data.municipality || data.cityMunicipality || null,

        // New/normalized keys expected by `stakeholder.service.register`
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        email: data.stakeholderEmail,
        phoneNumber: data.contactNumber,
        password: data.password,
        organizationInstitution: data.organization || null,
        // accountType for normalized payload
        accountType: data.accountType || null,
        // Send DB object ids for district/province/municipality where possible
        district: resolvedDistrictObj?._id || resolvedDistrictValue || null,
        province: resolvedDistrictObj?.Province_ID || data.provinceId || null,
      };

      // If coordinator creating, include Coordinator_ID
      if (!canManageStakeholders) {
        let coordId = user?.id || user?.ID || null;

        try {
          const raw = localStorage.getItem("unite_user");
          const parsed = raw ? JSON.parse(raw) : null;

          coordId =
            coordId ||
            parsed?.role_data?.coordinator_id ||
            parsed?.coordinator_id ||
            parsed?.id ||
            coordId;
        } catch (e) {
          /* ignore */
        }
        if (coordId) payload.Coordinator_ID = coordId;
      }

      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let json: any = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch (err) {
        throw new Error(
          `Invalid JSON response when creating stakeholder: ${text.slice(0, 200)}`,
        );
      }
      if (!res.ok) {
        const rawMsg =
          json?.message ||
          text ||
          `Failed to create stakeholder (status ${res.status})`;
        let pretty = String(rawMsg);

        if (/email/i.test(pretty))
          pretty =
            "That email is already registered or invalid. Please use a different email.";
        else if (/district/i.test(pretty))
          pretty = "Invalid district selected.";
        else if (/password/i.test(pretty))
          pretty = "Password invalid. Please ensure it meets requirements.";
        else {
          pretty = pretty.replace(/[_\-]/g, " ");
          pretty = pretty.charAt(0).toUpperCase() + pretty.slice(1);
        }
        setModalError(pretty);
        throw new Error(pretty);
      }

      setLoading(true);
      setError(null);
      try {
        await fetchStakeholders();
      } catch (e) {
        /* ignore */
      } finally {
        setLoading(false);
      }

      setIsAddModalOpen(false);
    } catch (err: any) {
      if (!modalError)
        setModalError(err?.message || "Failed to create stakeholder");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStakeholders(stakeholders.map((c) => c.id));
    } else {
      setSelectedStakeholders([]);
    }
  };

  const handleSelectStakeholder = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedStakeholders([...selectedStakeholders, id]);
    } else {
      setSelectedStakeholders(selectedStakeholders.filter((cId) => cId !== id));
    }
  };

  const handleActionClick = (id: string) => {
    // action handler
  };

  const handleUpdateStakeholder = (id: string) => {
    // fetch stakeholder details and open edit modal
    (async () => {
      try {
        setLoading(true);
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/stakeholders/${encodeURIComponent(id)}`
          : `/api/stakeholders/${encodeURIComponent(id)}`;
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        const headers: any = { "Content-Type": "application/json" };

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(url, { headers });
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;

        if (!res.ok)
          throw new Error(
            json?.message ||
              `Failed to fetch stakeholder (status ${res.status})`,
          );
        const data = json.data || json.stakeholder || json || null;

        setEditingStakeholder(data);
        setIsEditModalOpen(true);
      } catch (e: any) {
        alert(e?.message || "Failed to load stakeholder");
      } finally {
        setLoading(false);
      }
    })();
  };

  // Instead of immediate delete, show confirm modal that requires typing full name
  const handleDeleteStakeholder = (id: string, name?: string) => {
    setDeletingStakeholder({ id, name: name || "" });
    setIsDeleteModalOpen(true);
  };

  // Confirm delete stakeholder
  const confirmDeleteStakeholder = async (id: string) => {
    try {
      setLoading(true);
      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      const url = base
        ? `${base}/api/stakeholders/${encodeURIComponent(id)}`
        : `/api/stakeholders/${encodeURIComponent(id)}`;
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token")
          : null;
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(url, { method: "DELETE", headers });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok)
        throw new Error(
          json?.message ||
            `Failed to delete stakeholder (status ${res.status})`,
        );
      // Reload both stakeholders and signup requests
      await Promise.all([fetchStakeholders(), fetchSignupRequests()]);
    } catch (err: any) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch stakeholders from backend and normalize shape for the table
  const fetchStakeholders = async (appliedFilters?: {
    province?: string;
    districtId?: string;
  }) => {
    const startTime = Date.now();

    setLoading(true);
    setError(null);
    try {
      // Use NEXT_PUBLIC_API_URL from .env.local (inlined at build time)
      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      // get logged-in user and token from local/session storage
      let rawUser = null;

      try {
        rawUser = localStorage.getItem("unite_user");
      } catch (e) {
        rawUser = null;
      }
      const user = rawUser ? JSON.parse(rawUser) : null;
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token")
          : null;

      // choose admin-managed endpoint only when the logged-in user is BOTH a system admin and has StaffType 'Admin'
      const adminId =
        user?.id ||
        user?.ID ||
        user?.Staff_ID ||
        user?.StaffId ||
        user?.Admin_ID ||
        user?.adminId ||
        null;
      const fetchIsSystemAdmin = !!userInfo?.isAdmin;
      const fetchRaw = user || null;
      const fetchStaffType =
        fetchRaw?.StaffType ||
        fetchRaw?.Staff_Type ||
        fetchRaw?.staff_type ||
        fetchRaw?.staffType ||
        (fetchRaw?.user &&
          (fetchRaw.user.StaffType ||
            fetchRaw.user.staff_type ||
            fetchRaw.user.staffType)) ||
        null;
      const fetchIsStaffAdmin =
        !!fetchStaffType && String(fetchStaffType).toLowerCase() === "admin";
      const useAdminEndpoint = !!(
        fetchIsSystemAdmin &&
        fetchIsStaffAdmin &&
        adminId
      );
      // detect if the user is a coordinator so we limit results to their district
      const fetchIsCoordinator =
        !!fetchStaffType &&
        String(fetchStaffType).toLowerCase() === "coordinator";
      // attempt to read user's district id from several possible shapes (including role_data)
      const userDistrictId =
        user?.District_ID ||
        user?.DistrictId ||
        user?.districtId ||
        (user?.role_data &&
          (user.role_data.district_id ||
            user.role_data.districtId ||
            user.role_data.district)) ||
        (user?.District &&
          (user.District.District_ID || user.District.District_Number)) ||
        (userInfo?.raw &&
          (userInfo.raw.District_ID ||
            userInfo.raw.DistrictId ||
            userInfo.raw.districtId ||
            (userInfo.raw.role_data &&
              (userInfo.raw.role_data.district_id ||
                userInfo.raw.role_data.districtId)))) ||
        null;

      // attach filters as query params when present
      const params = new URLSearchParams();

      params.set("limit", "1000");
      const af = appliedFilters || filters || {};

      // If the logged-in user is NOT a system admin (i.e., a coordinator), restrict to their district
      // unless an explicit filter is applied. Use page-level canManageStakeholders flag which
      // represents system admin capability.
      if (af.districtId) params.set("district_id", String(af.districtId));
      else if (!canManageStakeholders && userDistrictId)
        params.set("district_id", String(userDistrictId));
      if (af.province) params.set("province", String(af.province));

      const url = base
        ? `${base}/api/stakeholders?${params.toString()}`
        : `/api/stakeholders?${params.toString()}`;

      // Debug: log computed request details so we can verify coordinator filtering
      try {
        debug("[fetchStakeholders] request debug", {
          userInfo:
            userInfo && Object.keys(userInfo).length
              ? {
                  displayName: userInfo.displayName,
                  role: userInfo.role,
                  isAdmin: userInfo.isAdmin,
                }
              : null,
          storedUserPreview: user
            ? {
                id: user.id || user.ID || user.Stakeholder_ID || null,
                staffType:
                  user.StaffType || user.staff_type || user.staffType || null,
                role_data: user.role_data || null,
              }
            : null,
          canManageStakeholders,
          fetchIsCoordinator,
          userDistrictId,
          params: params.toString(),
          url,
          tokenPresent: !!token,
        });
      } catch (e) {}

      const headers: any = {};

      if (token) headers["Authorization"] = `Bearer ${token}`;
      let res = await fetch(url, { headers });

      // If the admin-specific endpoint isn't implemented on some backends
      // the server may return a 404 HTML page. In that case automatically
      // retry the generic `/api/stakeholders` endpoint as a graceful
      // fallback so the UI still works and doesn't surface an internal
      // route-not-found message to the user.
      if (!res.ok && res.status === 404 && useAdminEndpoint) {
        try {
          const fallbackUrl = base
            ? `${base}/api/stakeholders?${params.toString()}`
            : `/api/stakeholders?${params.toString()}`;

          res = await fetch(fallbackUrl, { headers });
        } catch (e) {
          // ignore fallback network errors and continue to parse original response
        }
      }

      // Read as text first to avoid JSON parse errors when the server returns HTML (like a 404 page)
      const text = await res.text();
      let json: any = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        // If response is not valid JSON, include a short snippet in the error to help debugging
        const snippet = text.slice(0, 300);

        throw new Error(
          "Failed to fetch stakeholders (unexpected server response)",
        );
      }

      if (!res.ok) {
        // Prefer backend message when safe, but avoid echoing internal route
        // diagnostics to users. Provide a simple, actionable message.
        throw new Error(
          "Failed to fetch stakeholders. Please try again later.",
        );
      }

      // backend stakeholder list returns items with First_Name, Middle_Name, Last_Name, Email, Phone_Number, Province_Name, District_ID or District_Name
      const items = json.data || json.stakeholders || [];

      // Debug: log which district IDs are present in the response
      try {
        const returnedDistricts = Array.from(
          new Set(
            items.map(
              (it: any) =>
                it.District_ID ||
                it.district_id ||
                it.DistrictId ||
                it.districtId ||
                it.District ||
                it.District_Name ||
                it.District_Name ||
                "",
            ),
          ),
        ).filter(Boolean);

        debug(
          "[fetchStakeholders] response districts:",
          returnedDistricts,
          "itemsCount:",
          items.length,
        );
      } catch (e) {
        /* ignore */
      }
      const mapped = items.map((s: any) => {
        // Build full name supporting both legacy (First_Name) and normalized (firstName) keys
        const fullName = [
          s.First_Name || s.firstName,
          s.Middle_Name || s.middleName,
          s.Last_Name || s.lastName,
        ]
          .filter(Boolean)
          .join(" ");
        // Prefer a populated District object when available
        let districtObj = s.District || s.District_Details || null;

        // If not populated, try to resolve from prefetched districtsMap using District_ID
        if (!districtObj && districtsMap && (s.District_ID || s.DistrictId)) {
          districtObj =
            districtsMap[String(s.District_ID || s.DistrictId)] || null;
        }

        // If still not populated, try to resolve using the districtsList by matching
        // against known id fields (DB _id, id, or District_ID). This covers cases
        // where the backend returns `district` as an ObjectId reference instead
        // of a populated object or a legacy District_ID string.
        if (
          !districtObj &&
          Array.isArray(districtsList) &&
          districtsList.length > 0
        ) {
          const candidate = districtsList.find((d: any) => {
            const sid =
              s.district ||
              s.district_id ||
              s.districtId ||
              s.District_ID ||
              s.DistrictId ||
              s.District;

            if (!sid) return false;

            return (
              String(d._id) === String(sid) ||
              String(d.id) === String(sid) ||
              String(d.District_ID) === String(sid) ||
              String(d.District_ID) === String(s.District_ID)
            );
          });

          if (candidate) districtObj = candidate;
        }
        // Compute province display: prefer explicit Province_Name, else use populated province
        let province = s.Province_Name || s.province?.name || "";

        let districtDisplay = "";

        if (s.district?.name) {
          districtDisplay = s.district.name;
        } else if (districtObj) {
          districtDisplay = formatDistrict(districtObj);
        } else if (s.District_Name) {
          districtDisplay = s.District_Name;
        } else if (s.District_ID || s.district) {
          // fallback: try to infer number from District_ID like CSUR-001 -> 1
          const idCandidate = s.District_ID || s.district;
          const m = String(idCandidate).match(/(\d+)$/);

          if (m) {
            const num = Number(m[1]);

            if (!Number.isNaN(num))
              districtDisplay = `${ordinalSuffix(num)} District`;
          } else {
            districtDisplay = String(idCandidate);
          }
        }

        return {
          id: s.Stakeholder_ID || s.id || "",
          name: fullName,
          email: s.Email || s.email || "",
          phone: s.Phone_Number || s.phoneNumber || s.phone || "",
          province: province || "",
          municipality:
            s.municipality?.name ||
            s.City_Municipality ||
            s.Municipality ||
            s.City ||
            s.cityMunicipality ||
            s.municipality ||
            s.municipality_id ||
            "",
          // Resolve organization from multiple possible shapes, including nested objects
          organization: ((): string => {
            const tryValues = [
              s.Organization_Institution,
              s.Organization,
              s.organization,
              s.OrganizationName,
              s.Organization_Name,
              s.organization_institution,
              s.Organisation,
              s.organisation,
              s.OrganizationInstitution,
              s.data && s.data.Organization_Institution,
              s.data && s.data.organization,
              s.stakeholder && s.stakeholder.Organization_Institution,
              s.stakeholder && s.stakeholder.organization,
              s.result && s.result.Organization_Institution,
              s.details && s.details.Organization_Institution,
            ];

            for (const v of tryValues) {
              if (v !== undefined && v !== null && String(v).trim() !== "")
                return String(v).trim();
            }
            // As a last resort, do a shallow scan for any key name that looks like organization/institution
            for (const k of Object.keys(s || {})) {
              const key = String(k).toLowerCase();

              if (
                key.includes("organ") ||
                key.includes("institut") ||
                key.includes("organisation")
              ) {
                const v = s[k];

                if (v !== undefined && v !== null && String(v).trim() !== "")
                  return String(v).trim();
              }
            }

            return "";
          })(),
          district: districtDisplay,
        };

        return {
          id: s.Stakeholder_ID || s.id || "",
          name: fullName,
          email: s.Email || s.email || "",
          phone: s.Phone_Number || s.phoneNumber || s.phone || "",
          province: province || "",
          municipality:
            s.City_Municipality ||
            s.Municipality ||
            s.City ||
            s.cityMunicipality ||
            s.municipality ||
            s.municipality_id ||
            "",
          // Resolve organization from multiple possible shapes, including nested objects
          organization: ((): string => {
            const tryValues = [
              s.Organization_Institution,
              s.Organization,
              s.organization,
              s.OrganizationName,
              s.Organization_Name,
              s.organization_institution,
              s.Organisation,
              s.organisation,
              s.OrganizationInstitution,
              s.data && s.data.Organization_Institution,
              s.data && s.data.organization,
              s.stakeholder && s.stakeholder.Organization_Institution,
              s.stakeholder && s.stakeholder.organization,
              s.result && s.result.Organization_Institution,
              s.details && s.details.Organization_Institution,
            ];

            for (const v of tryValues) {
              if (v !== undefined && v !== null && String(v).trim() !== "")
                return String(v).trim();
            }
            // As a last resort, do a shallow scan for any key name that looks like organization/institution
            for (const k of Object.keys(s || {})) {
              const key = String(k).toLowerCase();

              if (
                key.includes("organ") ||
                key.includes("institut") ||
                key.includes("organisation")
              ) {
                const v = s[k];

                if (v !== undefined && v !== null && String(v).trim() !== "")
                  return String(v).trim();
              }
            }

            return "";
          })(),
          district: districtDisplay,
        };
      });

      // Resolve municipality names for any mapped items that only have an id
      const needsMunicipalityResolve: Array<{
        districtId: string;
        municipalityId: string;
      }> = [];

      mapped.forEach((m: any, idx: number) => {
        const raw = items[idx] || {};
        const munId =
          raw.municipality ||
          raw.Municipality ||
          raw.municipality_id ||
          raw.Municipality_ID ||
          null;

        if (munId && !municipalityCache[String(munId)]) {
          needsMunicipalityResolve.push({
            districtId: String(
              raw.district?._id ||
              raw.district?.id ||
              raw.district ||
              raw.District_ID ||
              raw.DistrictId ||
              ""
            ),
            municipalityId: String(munId),
          });
        }
      });

      // Also collect district ids that couldn't be resolved to objects so we can
      // fetch their details (some backends return only ObjectId refs like 'district')
      const needsDistrictResolve: string[] = [];

      mapped.forEach((m: any, idx: number) => {
        const raw = items[idx] || {};
        const did =
          raw.district ||
          raw.District ||
          raw.district_id ||
          raw.District_ID ||
          raw.districtId ||
          raw.DistrictId ||
          null;

        // if we have a district id but no human-friendly district/province in the mapped row
        if (did && (!m.district || String(m.district).trim() === "")) {
          if (!needsDistrictResolve.includes(String(did)))
            needsDistrictResolve.push(String(did));
        }
      });

      if (needsMunicipalityResolve.length > 0) {
        // Group by district to minimize requests
        const byDistrict: Record<string, Set<string>> = {};

        for (const n of needsMunicipalityResolve) {
          const d = n.districtId || "";

          if (!byDistrict[d]) byDistrict[d] = new Set();
          byDistrict[d].add(n.municipalityId);
        }

        (async () => {
          try {
            const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(
              /\/$/,
              "",
            );
            const token =
              typeof window !== "undefined"
                ? localStorage.getItem("unite_token") ||
                  sessionStorage.getItem("unite_token")
                : null;
            const headers: any = {};

            if (token) headers["Authorization"] = `Bearer ${token}`;

            const newCache: Record<string, string> = { ...municipalityCache };

            for (const districtIdKey of Object.keys(byDistrict)) {
              if (!districtIdKey) continue;
              const url = base
                ? `${base}/api/locations/districts/${encodeURIComponent(String(districtIdKey))}/municipalities`
                : `/api/locations/districts/${encodeURIComponent(String(districtIdKey))}/municipalities`;

              try {
                const res = await fetch(url, { headers });

                if (!res.ok) continue;
                const txt = await res.text();
                let body: any = null;

                try {
                  body = txt ? JSON.parse(txt) : null;
                } catch {
                  body = null;
                }
                const itemsMun = (body && (body.data || body)) || [];

                for (const mm of itemsMun) {
                  const id = String(
                    mm._id ||
                      mm.id ||
                      mm.Municipality_ID ||
                      mm.MunicipalityId ||
                      mm.name ||
                      mm.Name ||
                      mm.City_Municipality ||
                      "",
                  );
                  const label = String(
                    mm.name || mm.Name || mm.City_Municipality || mm.City || mm,
                  );

                  if (id) newCache[id] = label;
                }
              } catch (e) {
                // ignore
              }
            }

            // If cache changed, update state and remap displayed stakeholders
            setMunicipalityCache((prev) => {
              const merged = { ...prev, ...newCache };

              return merged;
            });

            // Update stakeholders display using new cache
            setStakeholders((prev) =>
              prev.map((p: any) => {
                const rawIndex = mapped.findIndex((x: any) => x.id === p.id);

                if (rawIndex === -1) return p;
                const raw = items[rawIndex] || {};
                const mid =
                  raw.municipality ||
                  raw.Municipality ||
                  raw.municipality_id ||
                  raw.Municipality_ID ||
                  null;

                if (
                  mid &&
                  (newCache[String(mid)] || municipalityCache[String(mid)])
                ) {
                  return {
                    ...p,
                    municipality:
                      newCache[String(mid)] || municipalityCache[String(mid)],
                  };
                }

                return p;
              }),
            );
          } catch (e) {
            // ignore
          }
        })();

        // If there are district IDs that weren't resolved to objects, fetch their details
        // and update districtsMap/districtsList so province/district display can be populated.
        if (needsDistrictResolve.length > 0) {
          (async () => {
            try {
              const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(
                /\/$/,
                "",
              );
              const token =
                typeof window !== "undefined"
                  ? localStorage.getItem("unite_token") ||
                    sessionStorage.getItem("unite_token")
                  : null;
              const headers: any = {};

              if (token) headers["Authorization"] = `Bearer ${token}`;

              const fetchedDistricts: any[] = [];

              for (const did of needsDistrictResolve) {
                if (!did) continue;
                try {
                  const url = base
                    ? `${base}/api/districts/${encodeURIComponent(did)}`
                    : `/api/districts/${encodeURIComponent(did)}`;
                  const res = await fetch(url, { headers });

                  if (!res.ok) continue;
                  const txt = await res.text();
                  let body: any = null;

                  try {
                    body = txt ? JSON.parse(txt) : null;
                  } catch {
                    body = null;
                  }
                  const d = body?.data || body?.district || body || null;

                  if (d) fetchedDistricts.push(d);
                } catch (e) {
                  // ignore per-district errors
                }
              }

              if (fetchedDistricts.length > 0) {
                // merge into districtsMap and districtsList
                setDistrictsMap((prev) => {
                  const next = { ...(prev || {}) } as Record<string, any>;

                  for (const d of fetchedDistricts) {
                    if (d.District_ID) next[String(d.District_ID)] = d;
                    if (d._id) next[String(d._id)] = d;
                  }

                  return next;
                });

                setDistrictsList((prev) => {
                  const copy = Array.isArray(prev) ? [...prev] : [];

                  for (const d of fetchedDistricts) {
                    const exists = copy.find(
                      (x: any) =>
                        String(x._id) === String(d._id) ||
                        String(x.District_ID) === String(d.District_ID),
                    );

                    if (!exists) copy.push(d);
                  }

                  return copy;
                });

                // Re-map stakeholders to include resolved district/province names
                setStakeholders((prev) =>
                  prev.map((p: any) => {
                    const rawIndex = mapped.findIndex(
                      (x: any) => x.id === p.id,
                    );

                    if (rawIndex === -1) return p;
                    const raw = items[rawIndex] || {};
                    const sid =
                      raw.district ||
                      raw.district_id ||
                      raw.District_ID ||
                      raw.District ||
                      raw.districtId ||
                      raw.DistrictId;

                    if (!sid) return p;
                    const found = fetchedDistricts.find(
                      (fd) =>
                        String(fd._id) === String(sid) ||
                        String(fd.District_ID) === String(sid),
                    );

                    if (!found) return p;
                    // compute display strings similar to mapping above
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
                    const formatDistrict = (districtObj: any) => {
                      if (!districtObj) return "";
                      if (districtObj.District_Number)
                        return `${ordinalSuffix(districtObj.District_Number)} District`;
                      if (districtObj.District_Name)
                        return districtObj.District_Name;

                      return "";
                    };

                    const provinceName =
                      found.Province_Name ||
                      found.Province ||
                      found.ProvinceName ||
                      "";
                    const districtDisplay =
                      formatDistrict(found) ||
                      found.District_Name ||
                      found.District_ID ||
                      String(sid);

                    return {
                      ...p,
                      province: provinceName || p.province || "",
                      district: districtDisplay || p.district || "",
                    };
                  }),
                );
              }
            } catch (e) {
              // ignore district resolve errors
            }
          })();
        }
      }

      // Additional municipality resolution pass: group any remaining municipality ids by district
      // Use broader field fallbacks to detect municipality ids even in mixed-shaped responses.
      (async () => {
        try {
          const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(
            /\/$/,
            "",
          );
          const token =
            typeof window !== "undefined"
              ? localStorage.getItem("unite_token") ||
                sessionStorage.getItem("unite_token")
              : null;
          const headers: any = {};

          if (token) headers["Authorization"] = `Bearer ${token}`;

          const byDistrict2: Record<string, Set<string>> = {};

          for (const raw of items) {
            const mid =
              raw.municipality ||
              raw.Municipality ||
              raw.municipality_id ||
              raw.Municipality_ID ||
              raw.municipalityId ||
              raw.MunicipalityId ||
              null;

            if (!mid) continue;
            if (municipalityCache[String(mid)]) continue; // already known

            const did =
              String(
                raw.district?._id ||
                raw.district?.id ||
                raw.district ||
                raw.District ||
                raw.district_id ||
                raw.District_ID ||
                raw.districtId ||
                raw.DistrictId ||
                ""
              );

            if (!did) continue; // cannot resolve without district

            if (!byDistrict2[String(did)]) byDistrict2[String(did)] = new Set();
            byDistrict2[String(did)].add(String(mid));
          }

          if (Object.keys(byDistrict2).length === 0) return;

          const newCache: Record<string, string> = { ...municipalityCache };

          for (const districtIdKey of Object.keys(byDistrict2)) {
            try {
              const url = base
                ? `${base}/api/locations/districts/${encodeURIComponent(String(districtIdKey))}/municipalities`
                : `/api/locations/districts/${encodeURIComponent(String(districtIdKey))}/municipalities`;
              const res = await fetch(url, { headers });

              if (!res.ok) continue;
              const txt = await res.text();
              let body: any = null;

              try {
                body = txt ? JSON.parse(txt) : null;
              } catch {
                body = null;
              }
              const itemsMun = (body && (body.data || body)) || [];

              for (const mm of itemsMun) {
                const id = String(
                  mm._id ||
                    mm.id ||
                    mm.Municipality_ID ||
                    mm.MunicipalityId ||
                    mm.name ||
                    mm.Name ||
                    mm.City_Municipality ||
                    "",
                );
                const label = String(
                  mm.name || mm.Name || mm.City_Municipality || mm.City || mm,
                );

                if (id) newCache[id] = label;
              }
            } catch (e) {
              // ignore per-district errors
            }
          }

          // Merge and update state if changed
          setMunicipalityCache((prev) => {
            const merged = { ...prev, ...newCache };

            return merged;
          });

          // Update stakeholders display using new cache
          setStakeholders((prev) =>
            prev.map((p: any) => {
              const rawIndex = mapped.findIndex((x: any) => x.id === p.id);

              if (rawIndex === -1) return p;
              const raw = items[rawIndex] || {};
              const mid =
                raw.municipality ||
                raw.Municipality ||
                raw.municipality_id ||
                raw.Municipality_ID ||
                raw.municipalityId ||
                raw.MunicipalityId ||
                null;

              if (
                mid &&
                (newCache[String(mid)] || municipalityCache[String(mid)])
              ) {
                return {
                  ...p,
                  municipality:
                    newCache[String(mid)] || municipalityCache[String(mid)],
                };
              }

              return p;
            }),
          );
        } catch (e) {
          // ignore
        }
      })();

      // Debug: log detailed information for any items where organization resolved to empty
      try {
        const missingOrg = items.filter((s: any) => {
          const org =
            s.Organization_Institution ||
            s.Organization ||
            s.organization ||
            s.OrganizationName ||
            s.Organization_Name ||
            s.organization_institution ||
            s.Organisation ||
            s.organisation ||
            s.OrganizationInstitution ||
            "";

          return !org || String(org).trim() === "";
        });

        if (missingOrg && missingOrg.length > 0) {
          // Build a concise diagnostic for each missing-org item
          const diag = missingOrg.slice(0, 10).map((s: any) => ({
            id: s.Stakeholder_ID || s.id || "(no-id)",
            name:
              [s.First_Name, s.Middle_Name, s.Last_Name]
                .filter(Boolean)
                .join(" ") ||
              s.name ||
              "(no-name)",
            // candidate organization-like fields and their values
            candidates: {
              Organization_Institution: s.Organization_Institution,
              Organization: s.Organization,
              organization: s.organization,
              OrganizationName: s.OrganizationName,
              Organization_Name: s.Organization_Name,
              organization_institution: s.organization_institution,
              Organisation: s.Organisation,
              organisation: s.organisation,
              OrganizationInstitution: s.OrganizationInstitution,
            },
            keys: Object.keys(s || {}).slice(0, 20),
            raw: s,
          }));

          warn(
            "[fetchStakeholders] stakeholders missing organization (diagnostics):",
            diag,
          );
        }
        // Also log the first few mapped items for inspection
        debug(
          "[fetchStakeholders] mapped sample (first 5):",
          mapped.slice(0, 5),
        );

        // Fallback: if some mapped items still have empty organization, attempt to fetch
        // full stakeholder details for those items (limited to first 10) — some list
        // endpoints may omit certain fields while the detail endpoint returns them.
        const needFix = mapped
          .filter(
            (m: any) =>
              (!m.organization || String(m.organization).trim() === "") && m.id,
          )
          .slice(0, 10);

        if (needFix.length > 0) {
          try {
            await Promise.all(
              needFix.map(async (m: any) => {
                const url2 = base
                  ? `${base}/api/stakeholders/${encodeURIComponent(m.id)}`
                  : `/api/stakeholders/${encodeURIComponent(m.id)}`;
                const res2 = await fetch(url2, { headers });

                if (!res2.ok) return;
                const t2 = await res2.text();
                let j2: any = null;

                try {
                  j2 = t2 ? JSON.parse(t2) : null;
                } catch {
                  return;
                }
                const s2 = j2?.data || j2?.stakeholder || j2 || null;

                if (!s2) return;
                const org2 =
                  s2.Organization_Institution ||
                  s2.Organization ||
                  s2.organization ||
                  s2.OrganizationName ||
                  s2.Organization_Name ||
                  s2.organization_institution ||
                  null;

                if (org2 && String(org2).trim() !== "") {
                  const idx = mapped.findIndex((x: any) => x.id === m.id);

                  if (idx >= 0) mapped[idx].organization = String(org2).trim();
                }
              }),
            );
          } catch (e) {
            // ignore fallback errors
          }
        }
      } catch (e) {
        /* ignore debug errors */
      }

      // Apply client-side extra filters (if backend doesn't support them)
      const extra: any = af || {};
      let finalMapped = mapped;

      try {
        if (extra.organization) {
          finalMapped = finalMapped.filter((m: any) =>
            (m.organization || "")
              .toLowerCase()
              .includes(String(extra.organization).toLowerCase()),
          );
        }
        if (extra.type) {
          finalMapped = finalMapped.filter((m: any) =>
            (m.type || "")
              .toLowerCase()
              .includes(String(extra.type).toLowerCase()),
          );
        }
        if (extra.q) {
          const q = String(extra.q).toLowerCase();

          finalMapped = finalMapped.filter(
            (m: any) =>
              (m.name || "").toLowerCase().includes(q) ||
              (m.email || "").toLowerCase().includes(q) ||
              (m.organization || "").toLowerCase().includes(q),
          );
        }
        if (extra.name) {
          const v = String(extra.name).toLowerCase();

          finalMapped = finalMapped.filter((m: any) =>
            (m.name || "").toLowerCase().includes(v),
          );
        }
        if (extra.email) {
          const v = String(extra.email).toLowerCase();

          finalMapped = finalMapped.filter((m: any) =>
            (m.email || "").toLowerCase().includes(v),
          );
        }
        if (extra.phone) {
          const v = String(extra.phone).toLowerCase();

          finalMapped = finalMapped.filter((m: any) =>
            (m.phone || "").toLowerCase().includes(v),
          );
        }
        if (extra.date_from || extra.date_to) {
          finalMapped = finalMapped.filter((m: any) => {
            const created = m.created_at ? new Date(m.created_at) : null;

            if (!created) return true;
            if (extra.date_from) {
              const from = new Date(extra.date_from);

              if (created < from) return false;
            }
            if (extra.date_to) {
              const to = new Date(extra.date_to);

              to.setHours(23, 59, 59, 999);
              if (created > to) return false;
            }

            return true;
          });
        }
      } catch (e) {
        /* ignore filtering errors */
      }

      setStakeholders(finalMapped);

      // Add artificial delay for fast fetches to show loading animation longer
      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 1500; // 1.5 seconds
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setLoading(false);
    }
    updateStakeholderNames();
  };

  // If we prefetch districts after the initial load, re-run stakeholder fetch so
  // province/district can be resolved from the districtsMap.
  useEffect(() => {
    if (districtsMap) {
      // update to pick up province names from districtsMap when available
      updateStakeholderNames();
    }
  }, [districtsMap]);

  // Integrate top-level search bar with current filters. Whenever searchQuery changes
  // re-run fetch with combined filters so search and quick/advanced filters combine.
  useEffect(() => {
    // avoid running on first render where searchQuery is empty
    fetchStakeholders({ ...(filters as any), q: searchQuery || undefined });
  }, [searchQuery]);

  async function fetchSignupRequests() {
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      const url = base ? `${base}/api/signup-requests` : `/api/signup-requests`;
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token")
          : null;
      const headers: any = {};

      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(url, { headers });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(json?.message || "Failed to fetch requests");
      const items = json.data || [];
      // Populate with resolved names
  const mapped = items.map((req: any) => ({
    id: req._id,
    name: `${req.firstName} ${req.middleName || ''} ${req.lastName}`.trim(),
    email: req.email,
    phone: req.phoneNumber,
    organization: req.organization || '',
    province: req.province?.name || req.province?.Province_Name || provincesMap[req.province] || req.province,
    district: req.district?.name || req.district?.District_Name || districtsMap?.[req.district]?.name || req.district,
    municipality: req.municipality?.name || req.municipality?.Name || req.municipality?.City_Municipality || municipalityCache[req.municipality] || req.municipality,
    status: req.status || "Pending",
    submittedAt: req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : "",
  }));

      setSignupRequests(mapped);
    } catch (err: any) {
      console.error("Failed to fetch signup requests:", err);
      setError(err.message || "Failed to fetch signup requests");
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStakeholders(), fetchSignupRequests()]);
      // Don't set loading to false here - let fetchStakeholders handle it with its delay
    };
    init();
  }, []);

  const handleAcceptRequest = async (id: string) => {
    setPendingAcceptId(id);
    setIsAcceptModalOpen(true);
  };

  const confirmAcceptRequest = async () => {
    if (!pendingAcceptId) return;
    setIsAcceptModalOpen(false);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      const url = base ? `${base}/api/signup-requests/${pendingAcceptId}/approve` : `/api/signup-requests/${pendingAcceptId}/approve`;
      const token = typeof window !== "undefined" ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token") : null;
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(url, { method: "PUT", headers });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || "Failed to accept request");
      }
      // Refresh both lists
      await fetchStakeholders();
      await fetchSignupRequests();
    } catch (err: any) {
      console.error("Failed to accept request:", err);
      setError(err.message || "Failed to accept request");
    } finally {
      setPendingAcceptId(null);
    }
  };

  const handleRejectRequest = async (id: string) => {
    setPendingRejectId(id);
    setIsRejectModalOpen(true);
  };

  const confirmRejectRequest = async () => {
    if (!pendingRejectId) return;
    setIsRejectModalOpen(false);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      const url = base ? `${base}/api/signup-requests/${pendingRejectId}/reject` : `/api/signup-requests/${pendingRejectId}/reject`;
      const token = typeof window !== "undefined" ? localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token") : null;
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(url, { method: "PUT", headers, body: JSON.stringify({ reason: rejectReason }) });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || "Failed to reject request");
      }
      // Remove the rejected request from local state since it's deleted
      setSignupRequests(prev => prev.filter(req => req.id !== pendingRejectId));
      setRejectReason("");
    } catch (err: any) {
      console.error("Failed to reject request:", err);
      setError(err.message || "Failed to reject request");
    } finally {
      setPendingRejectId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white relative">
      <div className="absolute top-4 right-4 md:hidden z-[9999]">
        <MobileNav />
      </div>

      {/* Page Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Stakeholder <span className="hidden md:inline">Management</span></h1>
        {/* MobileNav component renders hamburger and notifications on small screens */}
      </div>

      {/* Topbar Component */}
      <Topbar
        userEmail={displayEmail}
        userName={displayName}
        onUserClick={handleUserClick}
      />

      {/* Toolbar with Search and Actions */}
      <StakeholderToolbar
        defaultTab={selectedTab}
        onAddCoordinator={handleAddStakeholder}
        onAdvancedFilter={handleAdvancedFilter}
        onExport={handleExport}
        onQuickFilter={handleQuickFilter}
        onSearch={handleSearch}
        onTabChange={(t) => setSelectedTab(t)}
        // Pass pagination props
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        pendingCount={signupRequests.length}
        isMobile={isMobile}
      />

      {/* Table Content */}
      <div className="px-4 sm:px-6 py-4 bg-gray-50">
        <StakeholderTable
          // Pass the SLICED data here
          coordinators={paginatedData} 
          municipalityCache={municipalityCache}
          selectedCoordinators={selectedStakeholders}
          onActionClick={handleActionClick}
          onDeleteCoordinator={handleDeleteStakeholder}
          onSelectAll={handleSelectAll}
          onSelectCoordinator={handleSelectStakeholder}
          onUpdateCoordinator={handleUpdateStakeholder}
          // We still pass searchQuery to the table so it can highlight if implemented, 
          // or we can remove it if the table's internal filtering is no longer needed.
          // Since we filter outside, the table's internal filter will just match everything in the slice.
          searchQuery={searchQuery} 
          loading={loading}
          isAdmin={canManageStakeholders}
          isRequests={selectedTab === "pending"}
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
        />
      </div>

      {/* Add Stakeholder Modal */}
      <AddStakeholderModal
        districtsProp={districtsList}
        isOpen={isAddModalOpen}
        isSubmitting={isCreating}
        isSysAdmin={canManageStakeholders}
        modalError={modalError}
        userDistrictId={openUserDistrictId ?? userDistrictId}
        userAccountType={userAccountType ?? undefined}
        onClearError={() => setModalError(null)}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
      />
      <DeleteStakeholderModal
        coordinatorId={deletingStakeholder?.id || null}
        coordinatorName={deletingStakeholder?.name || null}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingStakeholder(null);
        }}
        onConfirmDelete={async (id: string) => {
          await confirmDeleteStakeholder(id);
          setIsDeleteModalOpen(false);
          setDeletingStakeholder(null);
        }}
      />
      {/* Edit Stakeholder Modal */}
      <EditStakeholderModal
        coordinator={editingStakeholder}
        isOpen={isEditModalOpen}
        isSysAdmin={canManageStakeholders}
        districtsProp={districtsList}
        userDistrictId={userDistrictId}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingStakeholder(null);
        }}
        onSaved={async () => {
          try {
            // Reload both stakeholders and signup requests
            await Promise.all([fetchStakeholders(), fetchSignupRequests()]);
          } catch (e) {
            // Fallback to refresh if fetch fails
            try {
              router.refresh();
            } catch (e2) {
              if (typeof window !== "undefined") window.location.reload();
            }
          }
          setIsEditModalOpen(false);
          setEditingStakeholder(null);
        }}
      />

      <QuickFilterModal
        isOpen={openQuickFilter}
        isMobile={isMobile}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onApply={(f) => {
          setFilters(f);
          // If search query is in filters, update it
          if (f.searchQuery !== undefined && isMobile) {
            setSearchQuery(f.searchQuery);
          }
          // quick filter is instant: refresh immediately; do not auto-close modal
          fetchStakeholders(f);
        }}
        onClose={() => setOpenQuickFilter(false)}
      />
      <AdvancedFilterModal
        isOpen={openAdvancedFilter}
        onApply={(f) => {
          setFilters(f);
          setOpenAdvancedFilter(false);
          fetchStakeholders(f);
        }}
        onClose={() => setOpenAdvancedFilter(false)}
      />
      {/* Generate code modal removed from toolbar per new design */}

      {/* Accept Request Confirmation Modal */}
      {isAcceptModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-gray-200"
            style={{ zIndex: 10000, position: 'relative', minHeight: '200px' }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Acceptance</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to accept this signup request? This will create a stakeholder account and send a confirmation email to the user.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setIsAcceptModalOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                onClick={() => {
                  confirmAcceptRequest();
                }}
              >
                Accept Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Request Confirmation Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-gray-200"
            style={{ zIndex: 10000, position: 'relative', minHeight: '250px' }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Rejection</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to reject this signup request? This action cannot be undone and the request will be permanently deleted.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection (optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectReason("");
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                onClick={confirmRejectRequest}
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
