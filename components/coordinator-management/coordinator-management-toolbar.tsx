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
  isMobile?: boolean;
}

export default function CoordinatorToolbar({
  onExport,
  onQuickFilter,
  onAdvancedFilter,
  onAddCoordinator,
  onSearch,
  isMobile = false,
}: CoordinatorToolbarProps) {
  return (
    <div className="w-full bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left side - Search input */}
        {/* Keep search visible on mobile (fills available width) */}
        <Input
          className="max-w-[160px] flex-1 sm:max-w-xs"
          classNames={{
            input: "text-sm",
            inputWrapper: "border-gray-200 hover:border-gray-300 h-9",
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
          {/* On mobile hide Export / QuickFilter / AdvancedFilter - keep only Add button */}
          {/* Export and Advanced Filter hidden on mobile; Quick Filter shown on all sizes (compact on mobile) */}
          {!isMobile && (
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
          )}

          <Button
            className="border-gray-200"
            endContent={!isMobile ? <ChevronDown className="w-4 h-4" /> : undefined}
            radius="md"
            size="sm"
            startContent={<Filter className="w-4 h-4" />}
            variant="bordered"
            onPress={onQuickFilter}
          >
            {isMobile ? <span className="text-xs">Filter</span> : <span>Quick Filter</span>}
          </Button>

          {!isMobile && (
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
          )}

          <Button
            className="bg-black text-white"
            color="default"
            radius="md"
            size="sm"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onAddCoordinator}
          >
            <span className="hidden sm:inline">Add a coordinator</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

//[FCM-002] Feature: Added coordinator management toolbar component