"use client";

import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Tabs, Tab } from "@heroui/tabs";
import { Pagination } from "@heroui/pagination"; // Import Pagination
import {
  Magnifier as Search,
  ArrowDownToSquare as Download,
  Funnel as Filter,
  Wrench as SlidersHorizontal,
  Plus,
  ChevronDown,
} from "@gravity-ui/icons";

interface StakeholderToolbarProps {
  onExport: () => void;
  onQuickFilter: () => void;
  onAdvancedFilter: () => void;
  onAddCoordinator: () => void;
  onTabChange?: (tab: string) => void;
  defaultTab?: string;
  onSearch?: (query: string) => void;
  // Add pagination props
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pendingCount?: number;
  isMobile?: boolean;
}

export default function StakeholderToolbar({
  onExport,
  onQuickFilter,
  onAdvancedFilter,
  onAddCoordinator,
  onTabChange,
  defaultTab = "all",
  onSearch,
  currentPage,
  totalPages,
  onPageChange,
  pendingCount = 0,
  isMobile = false,
}: StakeholderToolbarProps) {
  const handleTabChange = (key: React.Key) => {
    const k = String(key);
    onTabChange?.(k);
  };

  return (
    <div className="w-full bg-white">
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <Tabs
            radius="md"
            selectedKey={defaultTab}
            size="sm"
            variant="solid"
            onSelectionChange={handleTabChange}
            classNames={{
              tabList: "gap-1",
            }}
          >
            <Tab key="all" title="All" />
            <Tab key="approved" title="Approved" />
            <Tab 
              key="pending" 
              title={pendingCount > 0 ? `Pending (${pendingCount})` : "Pending"}
            />
          </Tabs>

          {/* Render Pagination if we have multiple pages - hide on mobile */}
          {totalPages > 1 && !isMobile && (
            <Pagination
              isCompact
              showControls
              page={currentPage}
              total={totalPages}
              size="sm"
              variant="light"
              onChange={onPageChange}
              classNames={{
                cursor: "bg-black text-white",
              }}
            />
          )}

          {/* Hide search input on mobile - it will be in the filter modal */}
          {!isMobile && (
            <Input
              className="max-w-xs flex-1 sm:flex-none"
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
          )}
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Hide Export button on mobile */}
          {!isMobile && (
            <Button
              className="border-gray-200 font-medium"
              radius="md"
              size="sm"
              startContent={<Download className="w-4 h-4" />}
              variant="bordered"
              onPress={onExport}
            >
              Export
            </Button>
          )}

          {/* Filter button - show on all screen sizes */}
          <Button
            className="border-gray-200 font-medium"
            endContent={!isMobile ? <ChevronDown className="w-4 h-4" /> : undefined}
            radius="md"
            size="sm"
            startContent={<Filter className="w-4 h-4" />}
            variant="bordered"
            onPress={onQuickFilter}
          >
            {isMobile ? (
              <span className="text-xs">Filter</span>
            ) : (
              <span>Quick Filter</span>
            )}
          </Button>

          {/* Hide Advanced Filter on mobile */}
          {!isMobile && (
            <Button
              className="border-gray-200 font-medium"
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
            className="bg-black text-white font-medium"
            color="default"
            radius="md"
            size="sm"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onAddCoordinator}
          >
            <span className="hidden sm:inline">Add a stakeholder</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>
    </div>
  );
}