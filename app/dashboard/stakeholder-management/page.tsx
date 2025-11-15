"use client";

import { useState, useEffect } from "react";

import { getUserInfo } from "../../../utils/getUserInfo";

import Topbar from "@/components/topbar";
import StakeholderToolbar from "@/components/stakeholder-management/stakeholder-management-toolbar";
import StakeholderTable from "@/components/stakeholder-management/stakeholder-management-table";
import AddStakeholderModal from "@/components/stakeholder-management/add-stakeholder-modal";
import QuickFilterModal from "@/components/stakeholder-management/quick-filter-modal";
import AdvancedFilterModal from "@/components/stakeholder-management/advanced-filter-modal";
import EditStakeholderModal from "@/components/stakeholder-management/stakeholder-edit-modal";
import DeleteStakeholderModal from "@/components/stakeholder-management/delete-stakeholder-modal";
import GenerateCodeModal from "@/components/stakeholder-management/generate-code-modal";
import { debug, warn } from "@/utils/devLogger";

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
  const [userDistrictId, setUserDistrictId] = useState<string | null>(null);
  // userDistrictId that is explicitly passed when opening the Add modal so
  // modal receives the computed value immediately (avoids React state async race)
  const [openUserDistrictId, setOpenUserDistrictId] = useState<string | null>(
    null,
  );

  // Do not call getUserInfo() synchronously — read it on mount so server and client
  // produce the same initial HTML; update user-derived state after hydration.
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [displayName, setDisplayName] = useState("Bicol Medical Center");
  const [displayEmail, setDisplayEmail] = useState("bmc@gmail.com");
  const [canManageStakeholders, setCanManageStakeholders] = useState(false);

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
      setCanManageStakeholders(
        !!(isSystemAdmin || isStaffAdmin || roleLower === "admin"),
      );
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
          if (d.District_ID) map[String(d.District_ID)] = d;
        }
        setDistrictsMap(map);
        setDistrictsList(items);
      } catch (e) {
        // ignore district load errors
      }
    };

    loadDistricts();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleUserClick = () => {
    debug("User profile clicked");
  };

  const handleExport = () => {
    debug("Exporting data...");
  };

  const handleCreateCode = async () => {
    // open generate code modal
    setIsGenerateCodeOpen(true);
  };

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

  const [isGenerateCodeOpen, setIsGenerateCodeOpen] = useState(false);

  const handleCodeCreated = (code: any) => {
    // No page-level copy UI: the modal shows the generated code and copy success message.
    // This callback is left for any page-level refresh hooks in the future.
    // potential place to refresh lists if codes are shown in UI
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

      const payload: any = {
        First_Name: data.firstName,
        Middle_Name: data.middleName || null,
        Last_Name: data.lastName,
        Email: data.stakeholderEmail,
        Organization_Institution: data.organization || null,
        Phone_Number: data.contactNumber,
        Password: data.password,
        Province_Name: data.province,
        District_ID: data.districtId || data.district || userDistrictId || null,
        City_Municipality: data.cityMunicipality || null,
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
      console.error(err);
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

      // refresh list
      await fetchStakeholders();
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
      if (districtObj.District_Name) return districtObj.District_Name;

      return "";
    };

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
        ? useAdminEndpoint
          ? `${base}/api/admin/${encodeURIComponent(adminId)}/stakeholders?${params.toString()}`
          : `${base}/api/stakeholders?${params.toString()}`
        : useAdminEndpoint
          ? `/api/admin/${encodeURIComponent(adminId)}/stakeholders?${params.toString()}`
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
      const res = await fetch(url, { headers });

      // Read as text first to avoid JSON parse errors when the server returns HTML (like a 404 page)
      const text = await res.text();
      let json: any = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        // If response is not valid JSON, include a short snippet in the error to help debugging
        const snippet = text.slice(0, 300);

        throw new Error(
          `Invalid JSON response (status ${res.status}): ${snippet}`,
        );
      }

      if (!res.ok)
        throw new Error(
          json?.message ||
            `Failed to fetch stakeholders (status ${res.status})`,
        );

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
        const fullName = [s.First_Name, s.Middle_Name, s.Last_Name]
          .filter(Boolean)
          .join(" ");
        // Prefer a populated District object when available
        let districtObj = s.District || s.District_Details || null;

        // If not populated, try to resolve from prefetched districtsMap using District_ID
        if (!districtObj && districtsMap && (s.District_ID || s.DistrictId)) {
          districtObj =
            districtsMap[String(s.District_ID || s.DistrictId)] || null;
        }
        const province =
          s.Province_Name ||
          (districtObj &&
            (districtObj.Province_Name || districtObj.ProvinceName)) ||
          "";
        let districtDisplay = "";

        if (districtObj) {
          districtDisplay = formatDistrict(districtObj);
        } else if (s.District_Name) {
          districtDisplay = s.District_Name;
        } else if (s.District_ID) {
          // fallback: try to infer number from District_ID like CSUR-001 -> 1
          const m = String(s.District_ID).match(/(\d+)$/);

          if (m) {
            const num = Number(m[1]);

            if (!Number.isNaN(num))
              districtDisplay = `${ordinalSuffix(num)} District`;
          } else {
            districtDisplay = String(s.District_ID);
          }
        }

        return {
          id: s.Stakeholder_ID || s.id || "",
          name: fullName,
          email: s.Email || "",
          phone: s.Phone_Number || "",
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
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // If we prefetch districts after the initial load, re-run stakeholder fetch so
  // province/district can be resolved from the districtsMap.
  useEffect(() => {
    if (districtsMap) {
      // re-fetch to pick up province names from districtsMap when available
      fetchStakeholders();
    }
  }, [districtsMap]);

  // Integrate top-level search bar with current filters. Whenever searchQuery changes
  // re-run fetch with combined filters so search and quick/advanced filters combine.
  useEffect(() => {
    // avoid running on first render where searchQuery is empty
    fetchStakeholders({ ...(filters as any), q: searchQuery || undefined });
  }, [searchQuery]);

  useEffect(() => {
    fetchStakeholders();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          Stakeholder Management
        </h1>
      </div>

      {/* Topbar Component */}
      <Topbar
        userEmail={displayEmail}
        userName={displayName}
        onUserClick={handleUserClick}
      />

      {/* Toolbar with Search and Actions */}
      <StakeholderToolbar
        onAddCoordinator={handleAddStakeholder}
        onAdvancedFilter={handleAdvancedFilter}
        onCreateCode={handleCreateCode}
        onExport={handleExport}
        onQuickFilter={handleQuickFilter}
        onSearch={handleSearch}
      />

      {/* Table Content */}
      <div className="px-6 py-4 bg-gray-50">
        {loading && (
          <p className="text-sm text-gray-500">Loading stakeholders...</p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <StakeholderTable
          coordinators={stakeholders}
          selectedCoordinators={selectedStakeholders}
          onActionClick={handleActionClick}
          onDeleteCoordinator={handleDeleteStakeholder}
          onSelectAll={handleSelectAll}
          onSelectCoordinator={handleSelectStakeholder}
          onUpdateCoordinator={handleUpdateStakeholder}
          searchQuery={searchQuery}
          // Pass true only when user is both a system admin and has StaffType='Admin'
          isAdmin={canManageStakeholders}
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
        userDistrictId={userDistrictId}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingStakeholder(null);
        }}
        onSaved={async () => {
          await fetchStakeholders();
          setIsEditModalOpen(false);
          setEditingStakeholder(null);
        }}
      />

      <QuickFilterModal
        isOpen={openQuickFilter}
        onApply={(f) => {
          setFilters(f);
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
      <GenerateCodeModal
        isOpen={isGenerateCodeOpen}
        isSysAdmin={canManageStakeholders}
        userCoordinatorId={(() => {
          try {
            const raw = localStorage.getItem("unite_user");
            const parsed = raw ? JSON.parse(raw) : null;

            return (
              parsed?.id ||
              parsed?.ID ||
              parsed?.Coordinator_ID ||
              parsed?.coordinator_id ||
              null
            );
          } catch (e) {
            return null;
          }
        })()}
        userDistrictId={userDistrictId}
        onClose={() => setIsGenerateCodeOpen(false)}
        onCreated={handleCodeCreated}
      />
    </div>
  );
}
