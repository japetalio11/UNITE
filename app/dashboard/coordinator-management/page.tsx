"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  accountType: string;
}

export default function CoordinatorManagement() {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoordinators, setSelectedCoordinators] = useState<string[]>(
    [],
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [filteredCoordinators, setFilteredCoordinators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

      setCanManageCoordinators(
        Boolean(isSystemAdmin || (isStaffAdmin && roleLower === "admin")),
      );
      const resolvedCanManage = Boolean(isSystemAdmin || (isStaffAdmin && roleLower === "admin"));
      setCanManageCoordinators(resolvedCanManage);
      if (!resolvedCanManage) {
        try {
          router.replace('/error');
        } catch (e) {
          /* ignore navigation errors during SSR */
        }
        return;
      }
      setDisplayName(info?.displayName || "Bicol Medical Center");
      setDisplayEmail(info?.email || "bmc@gmail.com");
    } catch (e) {
      /* ignore */
    }
  }, []);

  // Detect mobile viewport
  useEffect(() => {
    const checkViewport = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    if (typeof window !== 'undefined') {
      checkViewport();
      window.addEventListener('resize', checkViewport);
      return () => window.removeEventListener('resize', checkViewport);
    }
  }, []);

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

      const staffData = {
        First_Name: data.firstName,
        Middle_Name: data.middleName || null,
        Last_Name: data.lastName,
        Email: data.coordinatorEmail,
        Phone_Number: data.contactNumber,
        Password: data.password,
      };

      const coordinatorData = {
        district: data.district || data.districtId,
        province: data.province,
        District_ID: data.districtId || data.district,
        Province_Name: data.province,
        accountType: data.accountType,
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

      await fetchCoordinators();
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
      setSelectedCoordinators(filteredCoordinators.map((c) => c.id));
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

      await fetchCoordinators();
    } catch (err: any) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchCoordinators = async () => {
    const startTime = Date.now();

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

    setLoading(true);
    setError(null);
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

      const params = new URLSearchParams();
      params.set("limit", "1000");

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

      const text = await res.text();
      let json: any = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch (parseErr) {
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
        // If lookup fetch fails, we silently continue
      }

      const mapped = items.map((c: any) => {
        const staff = c.Staff || {};

        const districtObj = c.district || c.District || null;
        const provinceObj = c.province || c.Province || null;

        const resolveProvinceName = () => {
          if (provinceObj) {
            if (typeof provinceObj === "string") {
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

          if (c.District_Name) return c.District_Name;
          if (c.District_Number)
            return `${ordinalSuffix(c.District_Number)} District`;

          return "";
        };

        const resolveDistrictId = () => {
          if (districtObj) {
            if (typeof districtObj === "string") {
              return districtObj;
            }
            return districtObj._id || districtObj.id || districtObj.District_ID || "";
          }
          return c.District_ID || "";
        };

        const resolveProvinceId = () => {
          if (provinceObj) {
            if (typeof provinceObj === "string") {
              return provinceObj;
            }
            return provinceObj._id || provinceObj.id || "";
          }
          return c.province || "";
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
          provinceId: resolveProvinceId(),
          district: resolveDistrictName(),
          districtId: resolveDistrictId(),
          // accountType/assignment: prefer top-level coordinator field, then staff or legacy keys
          accountType:
            c.accountType ||
            c.account_type ||
            c.AccountType ||
            (c.Coordinator && (c.Coordinator.accountType || c.Coordinator.account_type)) ||
            staff.accountType ||
            staff.AccountType ||
            c.account ||
            "",
        };
      });

      setCoordinators(mapped);

      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 1500;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setLoading(false);
    }
  };

  // Apply filters whenever coordinators or filters change
  useEffect(() => {
    let filtered = [...coordinators];

    // Apply province filter
    if (filters.province) {
      filtered = filtered.filter(
        (c) => c.provinceId === filters.province || c.province === filters.province
      );
    }

    // Apply district filter
    if (filters.districtId) {
      filtered = filtered.filter(
        (c) => c.districtId === filters.districtId
      );
    }

    setFilteredCoordinators(filtered);
  }, [coordinators, filters]);

  useEffect(() => {
    const init = async () => {
      await fetchCoordinators();
      setLoading(false);
    };
    init();
  }, []);

  const handleApplyFilters = (newFilters: { province?: string; districtId?: string }) => {
    setFilters(newFilters);
    setOpenQuickFilter(false);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Coordinator Management</h1>
        {/* Mobile hamburger at top-right */}
        <button
          aria-label="Open navigation"
          className="inline-flex items-center justify-center p-2 rounded-md md:hidden hover:bg-gray-100 transition-colors"
          onClick={() => setMobileNavOpen(true)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 5H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M3 10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute top-0 right-0 w-72 h-full bg-white shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{displayName}</div>
                <div className="text-xs text-default-500">{displayEmail || ""}</div>
              </div>
              <button aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="p-2 text-xl hover:bg-gray-100 rounded transition-colors">✕</button>
            </div>

            <nav className="flex flex-col gap-3 mt-4">
              <a className="flex items-center gap-3 text-sm hover:bg-gray-100 p-2 rounded transition-colors" href="/dashboard/campaign">Campaign</a>
              <a className="flex items-center gap-3 text-sm hover:bg-gray-100 p-2 rounded transition-colors" href="/dashboard/calendar">Calendar</a>
              <a className="flex items-center gap-3 text-sm hover:bg-gray-100 p-2 rounded transition-colors" href="/dashboard/chat">Chat</a>
              <a className="flex items-center gap-3 text-sm hover:bg-gray-100 p-2 rounded transition-colors bg-gray-50 font-semibold" href="/dashboard/coordinator-management">Coordinator Management</a>
              <a className="flex items-center gap-3 text-sm hover:bg-gray-100 p-2 rounded transition-colors" href="/dashboard/settings">Settings</a>
            </nav>
          </div>
        </div>
      )}

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
        isMobile={isMobile}
      />

      {/* Active Filters Display */}
{(filters.province || filters.districtId) && (
  <div className="px-6 py-2 bg-blue-50 border-b border-blue-100">
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium text-blue-900">Active Filters:</span>

      {filters.province && (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
          Province: {
            coordinators.find(c => c.provinceId === filters.province)?.province 
            || filters.province
          }
        </span>
      )}

      {filters.districtId && (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
          District: {
            coordinators.find(c => c.districtId === filters.districtId)?.district 
            || filters.districtId
          }
        </span>
      )}

      <button
        onClick={handleClearFilters}
        className="ml-2 text-blue-600 hover:text-blue-800 underline"
      >
        Clear all
      </button>
    </div>
  </div>
)}


      {/* Table Content */}
      <div className="px-6 py-4 bg-gray-50">
        <CoordinatorTable
          coordinators={filteredCoordinators}
          selectedCoordinators={selectedCoordinators}
          onActionClick={handleActionClick}
          onDeleteCoordinator={handleDeleteCoordinator}
          onSelectAll={handleSelectAll}
          onSelectCoordinator={handleSelectCoordinator}
          onUpdateCoordinator={handleUpdateCoordinator}
          searchQuery={searchQuery}
          isAdmin={canManageCoordinators}
          loading={loading}
        />
      </div>

      {/* Add Coordinator Modal */}
      <AddCoordinatorModal
        isOpen={isAddModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
      />
      
      {/* Delete Coordinator Modal */}
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

      {/* Quick Filter Modal */}
      <QuickFilterModal
        isOpen={openQuickFilter}
        onApply={handleApplyFilters}
        onClose={() => setOpenQuickFilter(false)}
      />
    </div>
  );
}