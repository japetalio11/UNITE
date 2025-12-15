"use client";
import {
  Ellipsis as MoreHorizontal,
  Pencil as Edit3,
  TrashBin as Trash2,
  Check,
  Xmark as X,
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

interface Stakeholder {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization?: string;
  entity?: string; // alias for organization
  province?: string;
  district?: string;
  municipality?: string;
}

interface StakeholderTableProps {
  coordinators: Stakeholder[];
  selectedCoordinators: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectCoordinator: (id: string, checked: boolean) => void;
  onActionClick: (id: string) => void;
  onUpdateCoordinator?: (id: string) => void;
  onDeleteCoordinator?: (id: string, name?: string) => void;
  searchQuery: string;
  isAdmin?: boolean;
  municipalityCache?: Record<string, string>;
  isRequests?: boolean;
  onAcceptRequest?: (id: string) => void;
  onRejectRequest?: (id: string) => void;
  loading?: boolean;
  // Optional current user context to enable role-aware filtering
  currentUser?: {
    role?: string;
    district?: string;
    accountType?: string;
  };
}

export default function StakeholderTable({
  coordinators,
  selectedCoordinators,
  onSelectAll,
  onSelectCoordinator,
  onActionClick,
  onUpdateCoordinator,
  onDeleteCoordinator,
  searchQuery,
  isAdmin,
  municipalityCache,
  isRequests = false,
  onAcceptRequest,
  onRejectRequest,
  loading = false,
  currentUser,
}: StakeholderTableProps) {
  const [, /*unused*/ setUnused] = useState(false);

  const displayValue = (v: any, fallback = "—") => {
    if (v === null || v === undefined) return fallback;
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    )
      return String(v);
    // Common server shapes: object with `name`, `Province_Name`, `District_Name`, `City_Municipality`, or `_id`
    if (typeof v === "object") {
      return (
        v.name ||
        v.Name ||
        v.Province_Name ||
        v.District_Name ||
        v.City_Municipality ||
        v.City ||
        v.label ||
        v._id ||
        v.id ||
        fallback
      );
    }
    return fallback;
  };

  // Apply role-aware visible set first: sysadmin sees all, coordinator sees only matching district+accountType
  const userRole = (currentUser?.role || "").toString().toLowerCase();
  const userDistrict = (currentUser?.district || "").toString().toLowerCase();
  const userAccountType = (currentUser?.accountType || "").toString().toLowerCase();

  const visibleCoordinators =
    userRole === "sysadmin" || userRole === "systemadmin" || !userRole
      ? coordinators
      : coordinators.filter((coordinator) => {
          const coordDistrict = (displayValue(coordinator.district, "")).toLowerCase();
          const coordAccountType = (
            (coordinator as any).accountType || (coordinator as any).Account_Type || ""
          )
            .toString()
            .toLowerCase();

          // If user provided both, require both to match. Otherwise match available criterion.
          if (userDistrict && userAccountType) {
            return coordDistrict === userDistrict && coordAccountType === userAccountType;
          }
          if (userDistrict) return coordDistrict === userDistrict;
          if (userAccountType) return coordAccountType === userAccountType;
          return true;
        });

  const filteredCoordinators = visibleCoordinators.filter((coordinator) => {
    const q = searchQuery.toLowerCase();

    return (
      (coordinator.name || "").toLowerCase().includes(q) ||
      (coordinator.email || "").toLowerCase().includes(q) ||
      (coordinator.organization || coordinator.entity || "")
        .toLowerCase()
        .includes(q) ||
      (coordinator.province || "").toLowerCase().includes(q) ||
      (coordinator.district || "").toLowerCase().includes(q) ||
      (
        (municipalityCache &&
          municipalityCache[String(coordinator.municipality)]) ||
        coordinator.municipality ||
        ""
      )
        .toLowerCase()
        .includes(q)
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
                  Name
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Province
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  District
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Municipality
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
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-8 bg-gray-200 rounded w-8"></div>
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
            <tr className="bg-[#F4F4F5]">
              <th className="px-6 py-3.5 text-left w-12">
              <Checkbox
                aria-label="Select all stakeholders"
                checked={isAllSelected}
                size="sm"
                onValueChange={onSelectAll}
              />
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone Number
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Entity
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Province
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              District
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Municipality
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
                  {displayValue(coordinator.organization || coordinator.entity)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {displayValue(coordinator.province)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {displayValue(coordinator.district)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {displayValue(
                    (municipalityCache &&
                      municipalityCache[String(coordinator.municipality)]) ||
                      coordinator.municipality,
                  )}
                </td>
                <td className="px-6 py-4">
                  <Dropdown>
                    <DropdownTrigger>
                      <Button
                        isIconOnly
                        aria-label={`Actions for ${coordinator.name}`}
                        className="text-gray-400 hover:text-gray-600"
                        size="sm"
                        variant="light"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                      aria-label="Stakeholder actions"
                      variant="faded"
                    >
                      {isRequests || (coordinator as any)._isRequest ? (
                        <DropdownSection title="Actions">
                          <DropdownItem
                            key="accept"
                            description="Approve this signup request"
                            startContent={<Check className="text-green-600" />}
                            onPress={() => {
                              if (onAcceptRequest)
                                onAcceptRequest(coordinator.id);
                            }}
                          >
                            Accept Request
                          </DropdownItem>
                          <DropdownItem
                            key="reject"
                            className="text-danger"
                            color="danger"
                            description="Reject this signup request"
                            startContent={<X className="text-red-600" />}
                            onPress={() => {
                              if (onRejectRequest)
                                onRejectRequest(coordinator.id);
                            }}
                          >
                            Reject Request
                          </DropdownItem>
                        </DropdownSection>
                      ) : (
                        <>
                          <DropdownSection title="Actions">
                            <DropdownItem
                              key="update"
                              description="Edit the stakeholder's details"
                              startContent={<Edit3 />}
                              onPress={() => {
                                if (onUpdateCoordinator)
                                  onUpdateCoordinator(coordinator.id);
                              }}
                            >
                              Update stakeholder
                            </DropdownItem>
                          </DropdownSection>
                          <DropdownSection title="Danger zone">
                            <DropdownItem
                              key="delete"
                              className="text-danger"
                              color="danger"
                              description="Permanently remove this stakeholder"
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
                              Delete stakeholder
                            </DropdownItem>
                          </DropdownSection>
                        </>
                      )}
                    </DropdownMenu>
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredCoordinators.length === 0 && (
        <div className="px-6 py-12 text-center bg-white">
          <p className="text-gray-500 text-sm">
            {isRequests ? "No signup requests found" : "No stakeholders found"}
          </p>
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
