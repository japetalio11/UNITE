"use client";

import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  Magnifier as Search,
  ArrowDownToSquare as Download,
  Funnel as Filter,
  Wrench as SlidersHorizontal,
  Plus,
  ChevronDown,
} from "@gravity-ui/icons";

interface CoordinatorToolbarProps {
  onExport: () => void;
  onQuickFilter: () => void;
  onAdvancedFilter: () => void;
  onAddCoordinator: () => void;
  onSearch?: (query: string) => void;
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
          className="max-w-xs"
          classNames={{
            input: "text-sm",
            inputWrapper: "border-gray-200 hover:border-gray-300",
          }}
          placeholder="Search user..."
          radius="md"
          size="sm"
          startContent={<Search className="w-4 h-4 text-default-400" />}
          type="text"
          variant="bordered"
          onChange={(e) => onSearch?.(e.target.value)}
        />

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2">
          {/* Export Button */}
          <Button
            className="border-gray-200"
            radius="md"
            size="sm"
            startContent={<Download className="w-4 h-4" />}
            variant="bordered"
            onPress={onExport}
          >
            Export
          </Button>

          {/* Quick Filter Button */}
          <Button
            className="border-gray-200"
            endContent={<ChevronDown className="w-4 h-4" />}
            radius="md"
            size="sm"
            startContent={<Filter className="w-4 h-4" />}
            variant="bordered"
            onPress={onQuickFilter}
          >
            Quick Filter
          </Button>

          {/* Advanced Filter Button */}
          <Button
            className="border-gray-200"
            endContent={<ChevronDown className="w-4 h-4" />}
            radius="md"
            size="sm"
            startContent={<SlidersHorizontal className="w-4 h-4" />}
            variant="bordered"
            onPress={onAdvancedFilter}
          >
            Advanced Filter
          </Button>

          {/* Add Coordinator Button */}
          <Button
            className="bg-black text-white"
            color="default"
            radius="md"
            size="sm"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onAddCoordinator}
          >
            Add a coordinator
          </Button>
        </div>
      </div>
    </div>
  );
}

//[FCM-002] Feature: Added coordinator management toolbar component