"use client"


import { Search } from "lucide-react"
import { Button } from "@heroui/button"
import { Input } from "@heroui/input"
import {
  Download,
  Filter,
  SlidersHorizontal,
  Plus,
  ChevronDown
} from "lucide-react"


interface CoordinatorToolbarProps {
  onExport: () => void
  onQuickFilter: () => void
  onAdvancedFilter: () => void
  onAddCoordinator: () => void
  onSearch?: (query: string) => void
}


export default function CoordinatorToolbar({
  onExport,
  onQuickFilter,
  onAdvancedFilter,
  onAddCoordinator,
  onSearch,
}: CoordinatorToolbarProps) {
  return (
    <div className="w-full bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left side - Search input */}
        <Input
          type="text"
          placeholder="Search user..."
          startContent={<Search className="w-4 h-4 text-default-400" />}
          onChange={(e) => onSearch?.(e.target.value)}
          variant="bordered"
          radius="md"
          size="sm"
          classNames={{
            input: "text-sm",
            inputWrapper: "border-gray-200 hover:border-gray-300"
          }}
          className="max-w-xs"
        />


        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2">
          {/* Export Button */}
          <Button
            variant="bordered"
            startContent={<Download className="w-4 h-4" />}
            onPress={onExport}
            radius="md"
            size="sm"
            className="border-gray-200"
          >
            Export
          </Button>


          {/* Quick Filter Button */}
          <Button
            variant="bordered"
            startContent={<Filter className="w-4 h-4" />}
            endContent={<ChevronDown className="w-4 h-4" />}
            onPress={onQuickFilter}
            radius="md"
            size="sm"
            className="border-gray-200"
          >
            Quick Filter
          </Button>


          {/* Advanced Filter Button */}
          <Button
            variant="bordered"
            startContent={<SlidersHorizontal className="w-4 h-4" />}
            endContent={<ChevronDown className="w-4 h-4" />}
            onPress={onAdvancedFilter}
            radius="md"
            size="sm"
            className="border-gray-200"
          >
            Advanced Filter
          </Button>


          {/* Add Coordinator Button */}
          <Button
            color="default"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onAddCoordinator}
            radius="md"
            size="sm"
            className="bg-black text-white"
          >
            Add a coordinator
          </Button>
        </div>
      </div>
    </div>
  )
}
