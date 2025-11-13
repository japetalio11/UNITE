"use client"
import { MoreHorizontal, Edit3, Trash2 } from "lucide-react"
import { Checkbox } from "@heroui/checkbox"
import { Button } from "@heroui/button"
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownSection, DropdownItem } from "@heroui/dropdown"
import { useState } from "react"


interface Stakeholder {
  id: string
  name: string
  email: string
  phone: string
  organization?: string
  district: string
}


interface StakeholderTableProps {
  coordinators: Stakeholder[]
  selectedCoordinators: string[]
  onSelectAll: (checked: boolean) => void
  onSelectCoordinator: (id: string, checked: boolean) => void
  onActionClick: (id: string) => void
  onUpdateCoordinator?: (id: string) => void
  onDeleteCoordinator?: (id: string, name?: string) => void
  searchQuery: string
  isAdmin?: boolean
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
}: StakeholderTableProps) {
  const [/*unused*/, setUnused] = useState(false)

  const filteredCoordinators = coordinators.filter(
    (coordinator) => {
      const q = searchQuery.toLowerCase()
      return (
        (coordinator.name || '').toLowerCase().includes(q) ||
        (coordinator.email || '').toLowerCase().includes(q) ||
        ((coordinator.organization || '')).toLowerCase().includes(q) ||
        (coordinator.district || '').toLowerCase().includes(q)
      )
    },
  )


  const isAllSelected =
    filteredCoordinators.length > 0 && filteredCoordinators.every((c) => selectedCoordinators.includes(c.id))


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
                  checked={isAllSelected}
                  onValueChange={onSelectAll}
                  aria-label="Select all stakeholders"
                  size="sm"
                />
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organization
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stakeholder
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone Number
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
                    checked={selectedCoordinators.includes(coordinator.id)}
                    onValueChange={(checked) => onSelectCoordinator(coordinator.id, checked)}
                    aria-label={`Select ${coordinator.name}`}
                    size="sm"
                  />
                </td>
                <td className="px-6 py-4 text-sm font-normal text-gray-900">
                  {coordinator.organization && coordinator.organization.trim() !== '' ? coordinator.organization : 'Independent'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {coordinator.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {coordinator.email}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {coordinator.phone}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {coordinator.district}
                </td>
                <td className="px-6 py-4">
                  <Dropdown>
                    <DropdownTrigger>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        aria-label={`Actions for ${coordinator.name}`}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <MoreHorizontal size={18} />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Stakeholder actions" variant="faded">
                      <DropdownSection title="Actions">
                        <DropdownItem
                          key="update"
                          description="Edit the stakeholder's details"
                          startContent={<Edit3 />}
                          onPress={() => { if (onUpdateCoordinator) onUpdateCoordinator(coordinator.id) }}
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
                          startContent={<Trash2 className="text-xl text-danger pointer-events-none shrink-0" />}
                          onPress={() => { if (onDeleteCoordinator) onDeleteCoordinator(coordinator.id, coordinator.name) }}
                        >
                          Delete stakeholder
                        </DropdownItem>
                      </DropdownSection>
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
          <p className="text-gray-500 text-sm">No stakeholders found</p>
          {searchQuery && (
            <p className="text-gray-400 text-xs mt-1">
              Try adjusting your search query
            </p>
          )}
        </div>
      )}
    </div>
  )
}
