"use client"
import { MoreHorizontal } from "lucide-react"
import { Checkbox } from "@heroui/checkbox"
import { Button } from "@heroui/button"


interface Coordinator {
  id: string
  name: string
  email: string
  phone: string
  province: string
  district: string
}


interface CoordinatorTableProps {
  coordinators: Coordinator[]
  selectedCoordinators: string[]
  onSelectAll: (checked: boolean) => void
  onSelectCoordinator: (id: string, checked: boolean) => void
  onActionClick: (id: string) => void
  searchQuery: string
}


export default function CoordinatorTable({
  coordinators,
  selectedCoordinators,
  onSelectAll,
  onSelectCoordinator,
  onActionClick,
  searchQuery,
}: CoordinatorTableProps) {
  // Filter coordinators based on search query
  const filteredCoordinators = coordinators.filter(
    (coordinator) =>
      coordinator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coordinator.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coordinator.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coordinator.district.toLowerCase().includes(searchQuery.toLowerCase()),
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
                  aria-label="Select all coordinators"
                  size="sm"
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
                    checked={selectedCoordinators.includes(coordinator.id)}
                    onValueChange={(checked) => onSelectCoordinator(coordinator.id, checked)}
                    aria-label={`Select ${coordinator.name}`}
                    size="sm"
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
                  {coordinator.province}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {coordinator.district}
                </td>
                <td className="px-6 py-4">
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={() => onActionClick(coordinator.id)}
                    aria-label={`Actions for ${coordinator.name}`}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <MoreHorizontal size={18} />
                  </Button>
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
  )
}
