"use client";

import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { Checkbox } from "@heroui/checkbox";
import { Input } from "@heroui/input";
import { Spinner } from "@heroui/spinner";
import type { LocationTreeNode } from "@/hooks/useLocationsOptimized";

interface LocationTreeSelectorProps {
  /**
   * Tree data from useLocationsOptimized hook
   */
  tree: LocationTreeNode[];
  
  /**
   * Set of selected location IDs
   */
  selectedIds: Set<string>;
  
  /**
   * Callback when selection changes
   */
  onSelectionChange: (selectedIds: Set<string>) => void;
  
  /**
   * Callback to expand a node (triggers data loading)
   */
  onExpandNode: (nodeId: string) => Promise<void>;
  
  /**
   * Callback to collapse a node
   */
  onCollapseNode: (nodeId: string) => void;
  
  /**
   * Search query for filtering
   */
  searchQuery?: string;
  
  /**
   * Hide barangay level (for coordinator creation)
   */
  hideBarangays?: boolean;
  
  /**
   * Loading state
   */
  loading?: boolean;
}

export default function LocationTreeSelector({
  tree,
  selectedIds,
  onSelectionChange,
  onExpandNode,
  onCollapseNode,
  searchQuery = "",
  hideBarangays = false,
  loading = false,
}: LocationTreeSelectorProps) {
  const [expandingNodes, setExpandingNodes] = useState<Set<string>>(new Set());

  /**
   * Handle node expansion with loading state
   * Properly toggle between expanded and collapsed states
   */
  const handleExpand = async (nodeId: string, currentIsExpanded: boolean) => {
    // If already expanded, collapse it
    if (currentIsExpanded) {
      onCollapseNode(nodeId);
      return; // Don't proceed to expansion logic
    }
    
    // If collapsed, expand it
    setExpandingNodes(prev => new Set(prev).add(nodeId));
    try {
      await onExpandNode(nodeId);
    } finally {
      setExpandingNodes(prev => {
        const updated = new Set(prev);
        updated.delete(nodeId);
        return updated;
      });
    }
  };

  /**
   * Handle location selection (with descendants)
   */
  const handleSelect = (node: LocationTreeNode, checked: boolean) => {
    const updated = new Set(selectedIds);

    // Helper to recursively add/remove all descendants
    const updateDescendants = (n: LocationTreeNode, add: boolean) => {
      if (hideBarangays && n.type === 'barangay') return;
      
      if (add) {
        updated.add(n._id);
      } else {
        updated.delete(n._id);
      }

      if (n.children) {
        n.children.forEach(child => updateDescendants(child, add));
      }
    };

    updateDescendants(node, checked);
    onSelectionChange(updated);
  };

  /**
   * Check if node or any descendant is selected
   */
  const isNodeSelected = (node: LocationTreeNode): boolean => {
    if (selectedIds.has(node._id)) return true;
    
    if (node.children) {
      return node.children.some(child => isNodeSelected(child));
    }
    
    return false;
  };

  /**
   * Check if all descendants are selected (for indeterminate state)
   */
  const isIndeterminate = (node: LocationTreeNode): boolean => {
    const directlySelected = selectedIds.has(node._id);
    if (directlySelected) return false;
    
    if (!node.children || node.children.length === 0) {
      return false;
    }
    
    const selectedChildrenCount = node.children.filter(child => 
      isNodeSelected(child)
    ).length;
    
    return selectedChildrenCount > 0 && selectedChildrenCount < node.children.length;
  };

  /**
   * Filter tree by search query
   */
  const filteredTree = useMemo(() => {
    if (!searchQuery) return tree;

    const query = searchQuery.toLowerCase();
    
    const filterNode = (node: LocationTreeNode): LocationTreeNode | null => {
      const matchesSearch = node.name.toLowerCase().includes(query) ||
                           node.code?.toLowerCase().includes(query);
      
      const filteredChildren = node.children
        ?.map(child => filterNode(child))
        .filter((child): child is LocationTreeNode => child !== null) || [];
      
      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      
      return null;
    };
    
    return tree
      .map(node => filterNode(node))
      .filter((node): node is LocationTreeNode => node !== null);
  }, [tree, searchQuery]);

  /**
   * Render a single tree node
   */
  const renderNode = (node: LocationTreeNode, level: number = 0) => {
    // Skip barangays if hideBarangays is true
    if (hideBarangays && node.type === 'barangay') {
      return null;
    }

    const hasChildren = node.hasChildren || (node.children && node.children.length > 0);
    const isExpanded = node.isExpanded || false;
    const isLoading = node.isLoading || expandingNodes.has(node._id);
    const selected = selectedIds.has(node._id);
    const indeterminate = isIndeterminate(node);
    
    // Show expand button for nodes with loaded children, excluding municipalities and barangays
    // hasChildren flag is set by the hook based on whether children have been loaded
    const canHaveChildren = node.type !== 'municipality' && node.type !== 'barangay';
    const shouldShowExpandButton = hasChildren && canHaveChildren;

    return (
      <div key={node._id} className="select-none">
        <div
          className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 transition-colors`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {/* Expand/Collapse Button - only show if node has children (but not for municipalities) */}
          {shouldShowExpandButton ? (
            <button
              onClick={() => handleExpand(node._id, isExpanded)}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
              disabled={isLoading}
              type="button"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 text-gray-600 animate-spin" />
              ) : (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )
              )}
            </button>
          ) : (
            <div className="flex-shrink-0 w-5 h-5" /> 
          )}

          {/* Checkbox */}
          <Checkbox
            isSelected={selected}
            isIndeterminate={indeterminate}
            onValueChange={(checked) => handleSelect(node, checked)}
            size="sm"
          >
            <span className="text-sm">
              {node.name}
              <span className="text-xs text-gray-500 ml-1.5">
                ({node.type})
              </span>
            </span>
          </Checkbox>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="ml-0">
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
        <span className="ml-3 text-gray-600 mt-2">Loading locations...</span>
      </div>
    );
  }

  if (filteredTree.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {searchQuery ? "No locations match your search" : "No locations available"}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filteredTree.map(node => renderNode(node, 0))}
    </div>
  );
}
