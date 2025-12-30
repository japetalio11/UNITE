import { useState, useEffect } from "react";
import { fetchJsonWithAuth } from "@/utils/fetchWithAuth";

export interface Role {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  permissions: Array<{
    resource: string;
    actions: string[];
    metadata?: Record<string, any>;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Permission {
  _id: string;
  code: string;
  name: string;
  resource: string;
  action: string;
  type: 'resource' | 'page' | 'feature' | 'staff';
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Custom hook for role management
 * Handles all backend logic, API calls, and permission checks
 */
export function useRoles(isOpen: boolean) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if user has a specific permission
   */
  const checkPermission = async (resource: string, action: string): Promise<boolean> => {
    try {
      const response = await fetchJsonWithAuth("/api/permissions/check", {
        method: "POST",
        body: JSON.stringify({ resource, action }),
      });
      return response?.hasPermission === true;
    } catch (error: any) {
      // Don't log permission check errors - they're expected for users without permissions
      // Only log unexpected errors (network issues, etc.)
      if (error.status && error.status !== 403) {
        console.error(`Error checking permission ${resource}.${action}:`, error);
      }
      return false;
    }
  };

  /**
   * Load all roles
   */
  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check permission first
      const hasPermission = await checkPermission("role", "read");
      if (!hasPermission) {
        setRoles([]);
        setLoading(false);
        return;
      }
      
      const response = await fetchJsonWithAuth("/api/roles");
      
      if (response.success) {
        setRoles(response.data || []);
      }
    } catch (error: any) {
      // Only log non-permission errors to console
      // Permission errors are expected for non-admin users
      if (error.status !== 403 && error.body?.message !== "Permission denied: role.read") {
        console.error("Failed to load roles:", error);
      }
      setError(error.message || "Failed to load roles");
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load all permissions
   */
  const loadPermissions = async () => {
    try {
      setPermissionsLoading(true);
      setError(null);
      
      // Check permission first
      const hasPermission = await checkPermission("role", "read");
      if (!hasPermission) {
        setPermissions([]);
        setPermissionsLoading(false);
        return;
      }
      
      const response = await fetchJsonWithAuth("/api/permissions");
      
      if (response.success) {
        setPermissions(response.data || []);
      }
    } catch (error: any) {
      // Only log non-permission errors to console
      // Permission errors are expected for non-admin users
      if (error.status !== 403 && error.body?.message !== "Permission denied: role.read") {
        console.error("Failed to load permissions:", error);
      }
      setError(error.message || "Failed to load permissions");
      setPermissions([]);
    } finally {
      setPermissionsLoading(false);
    }
  };

  /**
   * Create a new role
   */
  const createRole = async (roleData: Omit<Role, '_id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null);
      const response = await fetchJsonWithAuth("/api/roles", {
        method: "POST",
        body: JSON.stringify(roleData),
      });
      
      if (response.success) {
        await loadRoles(); // Refresh list
        return response.data;
      }
      throw new Error(response.message || "Failed to create role");
    } catch (error: any) {
      console.error("Failed to create role:", error);
      setError(error.message || "Failed to create role");
      throw error;
    }
  };

  /**
   * Update an existing role
   */
  const updateRole = async (roleId: string, updates: Partial<Role>) => {
    try {
      setError(null);
      const response = await fetchJsonWithAuth(`/api/roles/${roleId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      
      if (response.success) {
        await loadRoles(); // Refresh list
        return response.data;
      }
      throw new Error(response.message || "Failed to update role");
    } catch (error: any) {
      console.error("Failed to update role:", error);
      setError(error.message || "Failed to update role");
      throw error;
    }
  };

  /**
   * Delete a role
   */
  const deleteRole = async (roleId: string) => {
    try {
      setError(null);
      const response = await fetchJsonWithAuth(`/api/roles/${roleId}`, {
        method: "DELETE",
      });
      
      if (response.success) {
        await loadRoles(); // Refresh list
        return true;
      }
      throw new Error(response.message || "Failed to delete role");
    } catch (error: any) {
      console.error("Failed to delete role:", error);
      setError(error.message || "Failed to delete role");
      throw error;
    }
  };

  /**
   * Get count of users assigned to a role
   */
  const getRoleUsersCount = async (roleId: string): Promise<number> => {
    try {
      const response = await fetchJsonWithAuth(`/api/roles/${roleId}/users-count`);
      
      if (response.success) {
        return response.data?.userCount || 0;
      }
      return 0;
    } catch (error: any) {
      console.error("Failed to get user count:", error);
      return 0;
    }
  };

  /**
   * Load roles and permissions when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      loadRoles();
      loadPermissions();
    }
  }, [isOpen]);

  return {
    roles,
    permissions,
    loading,
    permissionsLoading,
    error,
    createRole,
    updateRole,
    deleteRole,
    getRoleUsersCount,
    refreshRoles: loadRoles,
    checkPermission,
  };
}
