"use client";

import { useState, useEffect } from "react";

import { getUserInfo } from "../../../utils/getUserInfo";

import Topbar from "@/components/topbar";
import CoordinatorToolbar from "@/components/coordinator-management/coordinator-management-toolbar";
import CoordinatorTable from "@/components/coordinator-management/coordinator-management-table";
import AddCoordinatorModal from "@/components/coordinator-management/add-coordinator-modal";
import QuickFilterModal from "@/components/coordinator-management/quick-filter-modal";
import EditCoordinatorModal from "@/components/coordinator-management/coordinator-edit-modal";
import DeleteCoordinatorModal from "@/components/coordinator-management/delete-coordinator-modal";

interface CoordinatorFormData {
  firstName: string;
  middleName?: string;
  lastName: string;
  coordinatorName?: string;
  coordinatorEmail: string;
  contactNumber: string;
  password: string;
  retypePassword: string;
  province: string;
  district: string;
  districtId?: string;
}

export default function CoordinatorManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoordinators, setSelectedCoordinators] = useState<string[]>(
    [],
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    province?: string;
    districtId?: string;
  }>({});
  const [openQuickFilter, setOpenQuickFilter] = useState(false);
  const [editingCoordinator, setEditingCoordinator] = useState<any | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCoordinator, setDeletingCoordinator] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Do not call getUserInfo() synchronously during render — read it on mount so
  // server and client initial HTML remain identical and avoid hydration mismatches.
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [displayName, setDisplayName] = useState("Bicol Medical Center");
  const [displayEmail, setDisplayEmail] = useState("bmc@gmail.com");
  const [canManageCoordinators, setCanManageCoordinators] = useState(false);

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

      // Allow management when the user is a system administrator OR when they
      // are staff-type 'Admin' with explicit admin role. Previously this
      // required both (system admin && staff admin) which could hide actions
      // for legitimate system administrators. Relax the rule so system
      // administrators can manage coordinators even if StaffType isn't set.
      setCanManageCoordinators(
        Boolean(isSystemAdmin || (isStaffAdmin && roleLower === "admin")),
      );
      setDisplayName(info?.displayName || "Bicol Medical Center");
      setDisplayEmail(info?.email || "bmc@gmail.com");
    } catch (e) {
      /* ignore */
    }
  }, []);

  // Debug: surface permission flags so we can see why actions may be hidden
  try {
    // debug logs removed
  } catch (e) {
    /* ignore */
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleUserClick = () => {
    // User profile clicked
  };

  const handleExport = () => {
    // Exporting data...
  };

  const handleQuickFilter = () => {
    setOpenQuickFilter(true);
  };

  const handleAdvancedFilter = () => {
    // Opening advanced filter...
  };

  const handleAddCoordinator = () => {
    setIsAddModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
  };

  const handleModalSubmit = async (data: CoordinatorFormData) => {
    setIsCreating(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      // get logged-in admin id and token
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
      const adminId =
        user?.id ||
        user?.ID ||
        user?.Staff_ID ||
        user?.StaffId ||
        user?.Admin_ID ||
        user?.adminId ||
        null;

      if (!adminId) throw new Error("Logged-in admin id not found");

      const url = base
        ? `${base}/api/admin/${encodeURIComponent(adminId)}/coordinators`
        : `/api/admin/${encodeURIComponent(adminId)}/coordinators`;

      // The backend expects { staffData, coordinatorData, createdByAdminId } in body (see coordinator.service.createCoordinatorAccount)
      const staffData = {
        First_Name: data.firstName,
        Middle_Name: data.middleName || null,
        Last_Name: data.lastName,
        Email: data.coordinatorEmail,
        Phone_Number: data.contactNumber,
        Password: data.password,
      };

      // Send new coordinator data using province and district ObjectId refs
      const coordinatorData = {
        // New normalized fields (ObjectId refs)
        district: data.district || data.districtId,
        province: data.province,
        // Legacy compatibility fields
        District_ID: data.districtId || data.district,
        Province_Name: data.province,
      };

      const body = { staffData, coordinatorData, createdByAdminId: adminId };

      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json: any = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch (err) {
        throw new Error(
          `Invalid JSON response when creating coordinator: ${text.slice(0, 200)}`,
        );
      }
      if (!res.ok)
        throw new Error(
          json?.message ||
            `Failed to create coordinator (status ${res.status})`,
        );

      // success: refresh coordinators list
      await (async () => {
        // reuse fetchCoordinators logic: crudely re-run the effect by calling internal fetch
        setLoading(true);
        setError(null);
        try {
          const listBase = base;
          const adminUrl = listBase
            ? `${listBase}/api/admin/${encodeURIComponent(adminId)}/coordinators?limit=1000`
            : `/api/admin/${encodeURIComponent(adminId)}/coordinators?limit=1000`;
          const listRes = await fetch(adminUrl, { headers });
          const listText = await listRes.text();
          const listJson = listText ? JSON.parse(listText) : null;
          const items = listJson?.data || listJson?.coordinators || [];
          const mapped = items.map((c: any) => {
            const staff = c.Staff || {};
            const district = c.District || null;
            const province =
              c.Province_Name || (district && district.Province_Name) || "";
            const fullName = [
              staff.First_Name,
              staff.Middle_Name,
              staff.Last_Name,
            ]
              .filter(Boolean)
              .join(" ");

            return {
              id: c.Coordinator_ID || staff.ID || "",
              name: fullName,
              email: staff.Email || "",
              phone: staff.Phone_Number || "",
              province,
              district: (() => {
                if (!district) return "";
                const num = Number(district.District_Number);

                if (!Number.isNaN(num)) {
                  const j = num % 10,
                    k = num % 100;

                  if (j === 1 && k !== 11) return `${num}st District`;
                  if (j === 2 && k !== 12) return `${num}nd District`;
                  if (j === 3 && k !== 13) return `${num}rd District`;

                  return `${num}th District`;
                }

                return district.District_Name || "";
              })(),
            };
          });

          setCoordinators(mapped);
        } catch (e) {
          // ignore refresh errors
        } finally {
          setLoading(false);
        }
      })();

      setIsAddModalOpen(false);
    } catch (err: any) {
      alert(err?.message || "Failed to create coordinator");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCoordinators(coordinators.map((c) => c.id));
    } else {
      setSelectedCoordinators([]);
    }
  };

  const handleSelectCoordinator = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCoordinators([...selectedCoordinators, id]);
    } else {
      setSelectedCoordinators(selectedCoordinators.filter((cId) => cId !== id));
    }
  };

  const handleActionClick = (id: string) => {
    // action handler
  };

  const handleUpdateCoordinator = (id: string) => {
    // fetch coordinator details and open edit modal
    (async () => {
      try {
        setLoading(true);
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/coordinators/${encodeURIComponent(id)}`
          : `/api/coordinators/${encodeURIComponent(id)}`;
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
              `Failed to fetch coordinator (status ${res.status})`,
          );
        const data = json.data || json.coordinator || json || null;

        setEditingCoordinator(data);
        setIsEditModalOpen(true);
      } catch (e: any) {
        alert(e?.message || "Failed to load coordinator");
      } finally {
        setLoading(false);
      }
    })();
  };

  // Instead of immediate delete, show confirm modal that requires typing full name
  const handleDeleteCoordinator = (id: string, name?: string) => {
    if (!canManageCoordinators) {
      alert(
        "Only system administrators with StaffType=Admin can delete coordinators",
      );

      return;
    }
    setDeletingCoordinator({ id, name: name || "" });
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteCoordinator = async (id: string) => {
    try {
      setLoading(true);
      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      const url = base
        ? `${base}/api/coordinators/${encodeURIComponent(id)}`
        : `/api/coordinators/${encodeURIComponent(id)}`;
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
            `Failed to delete coordinator (status ${res.status})`,
        );

      // refresh list
      await fetchCoordinators();
    } catch (err: any) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch coordinators from backend and normalize shape for the table
  const fetchCoordinators = async (appliedFilters?: {
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

      // attach filters as query params when present
      const params = new URLSearchParams();

      params.set("limit", "1000");
      const af = appliedFilters || filters || {};

      if (af.districtId) params.set("districtId", String(af.districtId));
      if (af.province) params.set("province", String(af.province));

      const url = base
        ? useAdminEndpoint
          ? `${base}/api/admin/${encodeURIComponent(adminId)}/coordinators?${params.toString()}`
          : `${base}/api/coordinators?${params.toString()}`
        : useAdminEndpoint
          ? `/api/admin/${encodeURIComponent(adminId)}/coordinators?${params.toString()}`
          : `/api/coordinators?${params.toString()}`;

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
            `Failed to fetch coordinators (status ${res.status})`,
        );

      const items = json.data || json.coordinators || [];

      // Fetch lookup maps for provinces and districts so we can resolve
      // ObjectId strings returned by the API into human-readable names.
      let provincesMap: Record<string, string> = {};
      let districtsMap: Record<string, any> = {};

      try {
        const provRes = await fetch(
          (base ? `${base}` : "") + "/api/locations/provinces",
        );
        const provText = await provRes.text();
        const provJson = provText ? JSON.parse(provText) : null;
        const provItems = provJson?.data || [];

        provincesMap = provItems.reduce((acc: any, p: any) => {
          if (p._id) acc[p._id] = p.name || p.Province_Name || p.name;

          return acc;
        }, {});

        const distRes = await fetch(
          (base ? `${base}` : "") + "/api/districts?limit=1000",
        );
        const distText = await distRes.text();
        const distJson = distText ? JSON.parse(distText) : null;
        const distItems = distJson?.data || distJson?.districts || [];

        districtsMap = distItems.reduce((acc: any, d: any) => {
          if (d._id) acc[d._id] = d;

          return acc;
        }, {});
      } catch (e) {
        // If lookup fetch fails, we silently continue and fall back to legacy fields
      }

      const mapped = items.map((c: any) => {
        const staff = c.Staff || {};

        // Support multiple possible shapes for province/district coming
        // from backend during migration: new normalized refs may appear
        // as `province`/`district` (object or id), or legacy fields may
        // exist as `Province_Name` and `District` / `District_Name`.
        const districtObj = c.district || c.District || null;
        const provinceObj = c.province || c.Province || null;

        const resolveProvinceName = () => {
          // priority: populated province object -> legacy Province_Name -> district-contained province
          if (provinceObj) {
            if (typeof provinceObj === "string") {
              // lookup by id
              return provincesMap[provinceObj] || provinceObj;
            }

            return (
              provinceObj.name ||
              provinceObj.Province_Name ||
              provinceObj.province ||
              ""
            );
          }

          if (c.Province_Name) return c.Province_Name;

          if (districtObj && typeof districtObj === "object")
            return districtObj.Province_Name || districtObj.province || "";

          return "";
        };

        const resolveDistrictName = () => {
          if (districtObj) {
            if (typeof districtObj === "string") {
              const found = districtsMap[districtObj];

              if (found) {
                if (found.District_Number)
                  return `${ordinalSuffix(found.District_Number)} District`;

                return found.name || found.District_Name || "";
              }

              return districtObj;
            }

            if (districtObj.District_Number)
              return `${ordinalSuffix(districtObj.District_Number)} District`;

            return (
              districtObj.District_Name ||
              districtObj.name ||
              districtObj.district ||
              ""
            );
          }

          // legacy flattened fields
          if (c.District_Name) return c.District_Name;
          if (c.District_Number)
            return `${ordinalSuffix(c.District_Number)} District`;

          return "";
        };

        const fullName = [staff.First_Name, staff.Middle_Name, staff.Last_Name]
          .filter(Boolean)
          .join(" ");

        return {
          id: c.Coordinator_ID || staff.ID || "",
          name: fullName,
          email: staff.Email || "",
          phone: staff.Phone_Number || "",
          province: resolveProvinceName(),
          district: resolveDistrictName(),
        };
      });

      setCoordinators(mapped);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoordinators();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          Coordinator Management
        </h1>
      </div>

      {/* Topbar Component */}
      <Topbar
        userEmail={displayEmail}
        userName={displayName}
        onUserClick={handleUserClick}
      />

      {/* Toolbar with Search and Actions */}
      <CoordinatorToolbar
        onAddCoordinator={handleAddCoordinator}
        onAdvancedFilter={handleAdvancedFilter}
        onExport={handleExport}
        onQuickFilter={handleQuickFilter}
        onSearch={handleSearch}
      />

      {/* Table Content */}
      <div className="px-6 py-4 bg-gray-50">
        {loading && (
          <p className="text-sm text-gray-500">Loading coordinators...</p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <CoordinatorTable
          coordinators={coordinators}
          selectedCoordinators={selectedCoordinators}
          onActionClick={handleActionClick}
          onDeleteCoordinator={handleDeleteCoordinator}
          onSelectAll={handleSelectAll}
          onSelectCoordinator={handleSelectCoordinator}
          onUpdateCoordinator={handleUpdateCoordinator}
          searchQuery={searchQuery}
          // Pass true only when user is both a system admin and has StaffType='Admin'
          isAdmin={canManageCoordinators}
        />
      </div>

      {/* Add Coordinator Modal */}
      <AddCoordinatorModal
        isOpen={isAddModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
      />
      <DeleteCoordinatorModal
        coordinatorId={deletingCoordinator?.id || null}
        coordinatorName={deletingCoordinator?.name || null}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingCoordinator(null);
        }}
        onConfirmDelete={async (id: string) => {
          await confirmDeleteCoordinator(id);
          setIsDeleteModalOpen(false);
          setDeletingCoordinator(null);
        }}
      />
      {/* Edit Coordinator Modal */}
      <EditCoordinatorModal
        coordinator={editingCoordinator}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCoordinator(null);
        }}
        onSaved={async () => {
          await fetchCoordinators();
          setIsEditModalOpen(false);
          setEditingCoordinator(null);
        }}
      />

      <QuickFilterModal
        isOpen={openQuickFilter}
        onApply={(f) => {
          setFilters(f);
          setOpenQuickFilter(false);
          fetchCoordinators(f);
        }}
        onClose={() => setOpenQuickFilter(false)}
      />
    </div>
  );
}
