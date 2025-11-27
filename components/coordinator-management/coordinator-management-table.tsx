"use client";
import {
  Ellipsis as MoreHorizontal,
  Pencil as Edit3,
  TrashBin as Trash2,
} from "@gravity-ui/icons";
import { Checkbox } from "@heroui/checkbox";
import { Button } from "@heroui/button";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/dropdown";
import { useState } from "react";

interface Coordinator {
  id: string;
  name: string;
  email: string;
  phone: string;
  province: string;
  district: string;
}

interface CoordinatorTableProps {
  coordinators: Coordinator[];
  selectedCoordinators: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectCoordinator: (id: string, checked: boolean) => void;
  onActionClick: (id: string) => void;
  onUpdateCoordinator?: (id: string) => void;
  onDeleteCoordinator?: (id: string, name?: string) => void;
  searchQuery: string;
  isAdmin?: boolean;
  loading?: boolean;
}

export default function CoordinatorTable({
  coordinators,
  selectedCoordinators,
  onSelectAll,
  onSelectCoordinator,
  onActionClick,
  onUpdateCoordinator,
  onDeleteCoordinator,
  searchQuery,
  isAdmin,
  loading,
}: CoordinatorTableProps) {
  const [, /*unused*/ setUnused] = useState(false);
  // debug logs removed
  // Filter coordinators based on search query
  const normalizeProvince = (c: any) => {
    if (!c) return "";
    // coordinator.province can be a string (name or id) or an object
    const prov =
      c.province || c.Province || c.Province_Name || c.provinceName || null;

    if (!prov) return "";
    if (typeof prov === "string") return prov;

    // object
    return prov.name || prov.Name || prov.Province_Name || prov.province || "";
  };

  const normalizeDistrict = (c: any) => {
    if (!c) return "";
    const dist = c.district || c.District || c.District_ID || null;

    if (!dist) return "";
    if (typeof dist === "string") return dist;

    return (
      dist.name ||
      dist.District_Name ||
      dist.District_Number ||
      dist.district ||
      ""
    );
  };

  const filteredCoordinators = coordinators.filter((coordinator) => {
    const q = searchQuery.toLowerCase();
    const prov = (normalizeProvince(coordinator) || "").toLowerCase();
    const dist = (normalizeDistrict(coordinator) || "").toLowerCase();

    return (
      (coordinator.name || "").toLowerCase().includes(q) ||
      (coordinator.email || "").toLowerCase().includes(q) ||
      prov.includes(q) ||
      dist.includes(q)
    );
  });

  const isAllSelected =
    filteredCoordinators.length > 0 &&
    filteredCoordinators.every((c) => selectedCoordinators.includes(c.id));

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-6 py-3.5 text-left w-12">
                  <div className="h-4 bg-gray-200 rounded"></div>
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coordinator
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Province
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  District
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-4"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="bg-gray-200 rounded w-8 h-8"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table Header */}
          <thead>
            <tr className="bg-gray-50/80">
              <th className="px-6 py-3.5 text-left w-12">
                <Checkbox
                  aria-label="Select all coordinators"
                  checked={isAllSelected}
                  size="sm"
                  onValueChange={onSelectAll}
                />
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coordinator
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone Number
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Province
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                District
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredCoordinators.map((coordinator) => (
              <tr
                key={coordinator.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-6 py-4 w-12">
                  <Checkbox
                    aria-label={`Select ${coordinator.name}`}
                    checked={selectedCoordinators.includes(coordinator.id)}
                    size="sm"
                    onValueChange={(checked) =>
                      onSelectCoordinator(coordinator.id, checked)
                    }
                  />
                </td>
                <td className="px-6 py-4 text-sm font-normal text-gray-900">
                  {coordinator.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {coordinator.email}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {coordinator.phone}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {normalizeProvince(coordinator) || "—"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {normalizeDistrict(coordinator) || "—"}
                </td>
                <td className="px-6 py-4">
                  {/** Only show actions to admins. Non-admins get no action menu. */}
                  {isAdmin ? (
                    <Dropdown>
                      <DropdownTrigger>
                        <Button
                          isIconOnly
                          aria-label={`Actions for ${coordinator.name}`}
                          className="text-gray-400 hover:text-gray-600"
                          size="sm"
                          variant="light"
                        >
                          <MoreHorizontal width={18} height={18} />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label="Coordinator actions"
                        variant="faded"
                      >
                        <DropdownSection title="Actions">
                          <DropdownItem
                            key="update"
                            description="Edit the coordinator's details"
                            startContent={<Edit3 />}
                            onPress={() => {
                              if (onUpdateCoordinator)
                                onUpdateCoordinator(coordinator.id);
                            }}
                          >
                            Update coordinator
                          </DropdownItem>
                        </DropdownSection>
                        <DropdownSection title="Danger zone">
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            description="Permanently remove this coordinator"
                            startContent={
                              <Trash2 className="text-xl text-danger pointer-events-none shrink-0" />
                            }
                            onPress={() => {
                              if (onDeleteCoordinator)
                                onDeleteCoordinator(
                                  coordinator.id,
                                  coordinator.name,
                                );
                            }}
                          >
                            Delete coordinator
                          </DropdownItem>
                        </DropdownSection>
                      </DropdownMenu>
                    </Dropdown>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredCoordinators.length === 0 && (
        <div className="px-6 py-12 text-center bg-white">
          <p className="text-gray-500 text-sm">No coordinators found</p>
          {searchQuery && (
            <p className="text-gray-400 text-xs mt-1">
              Try adjusting your search query
            </p>
          )}
        </div>
      )}
    </div>
  );
}

//[FCM-003] Feature: Added coordinator management table component