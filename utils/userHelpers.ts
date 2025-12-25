/**
 * User Helper Functions
 * 
 * Utility functions for extracting user-related data from the unified User model.
 */

interface UserData {
  _id?: string;
  organizations?: Array<{
    organizationId?: string | { _id?: string; toString?: () => string };
    coordinatorId?: string | { _id?: string; toString?: () => string };
    [key: string]: any;
  }>;
  metadata?: {
    assignedCoordinator?: string | { _id?: string; toString?: () => string };
    [key: string]: any;
  };
  assignedCoordinator?: string | { _id?: string; toString?: () => string };
  [key: string]: any;
}

/**
 * Extract assigned coordinator ID from stakeholder user data
 * 
 * Checks multiple possible locations where the coordinator ID might be stored:
 * 1. organizations[].coordinatorId (if stakeholder has organization with assigned coordinator)
 * 2. metadata.assignedCoordinator
 * 3. assignedCoordinator (top-level field)
 * 
 * @param userData - User data object from /api/users/:id endpoint
 * @returns Coordinator ID (string) or null if not found
 */
export function extractCoordinatorId(userData: UserData | null | undefined): string | null {
  if (!userData) {
    console.warn('[extractCoordinatorId] No user data provided');
    return null;
  }

  // Helper to convert ID to string (handles ObjectId objects)
  const idToString = (id: any): string | null => {
    if (!id) return null;
    if (typeof id === 'string') return id;
    if (typeof id === 'object') {
      if (id._id) return id._id.toString();
      if (id.toString && typeof id.toString === 'function') return id.toString();
    }
    return String(id);
  };

  // Check 1: organizations[].coordinatorId (primary organization's coordinator)
  if (userData.organizations && Array.isArray(userData.organizations)) {
    // Try to find primary organization first
    const primaryOrg = userData.organizations.find(org => org.isPrimary === true) || userData.organizations[0];
    
    if (primaryOrg?.coordinatorId) {
      const coordId = idToString(primaryOrg.coordinatorId);
      if (coordId) {
        console.log('[extractCoordinatorId] Found coordinator from primary organization:', coordId);
        return coordId;
      }
    }

    // Check all organizations for coordinatorId
    for (const org of userData.organizations) {
      if (org.coordinatorId) {
        const coordId = idToString(org.coordinatorId);
        if (coordId) {
          console.log('[extractCoordinatorId] Found coordinator from organization:', coordId);
          return coordId;
        }
      }
    }
  }

  // Check 2: metadata.assignedCoordinator
  if (userData.metadata?.assignedCoordinator) {
    const coordId = idToString(userData.metadata.assignedCoordinator);
    if (coordId) {
      console.log('[extractCoordinatorId] Found coordinator from metadata:', coordId);
      return coordId;
    }
  }

  // Check 3: assignedCoordinator (top-level field)
  if (userData.assignedCoordinator) {
    const coordId = idToString(userData.assignedCoordinator);
    if (coordId) {
      console.log('[extractCoordinatorId] Found coordinator from top-level field:', coordId);
      return coordId;
    }
  }

  console.warn('[extractCoordinatorId] No coordinator ID found in user data:', {
    hasOrganizations: !!userData.organizations,
    organizationsCount: userData.organizations?.length || 0,
    hasMetadata: !!userData.metadata,
    hasAssignedCoordinator: !!userData.assignedCoordinator,
  });

  return null;
}

/**
 * Extract municipality IDs from coordinator's coverage areas
 * 
 * @param coordinatorData - Coordinator user data from /api/users/:id endpoint
 * @returns Array of municipality IDs (strings) or empty array
 */
export function extractMunicipalityIds(coordinatorData: UserData | null | undefined): string[] {
  if (!coordinatorData) {
    return [];
  }

  const municipalityIds: string[] = [];

  if (coordinatorData.coverageAreas && Array.isArray(coordinatorData.coverageAreas)) {
    coordinatorData.coverageAreas.forEach((ca: any) => {
      if (ca.municipalityIds && Array.isArray(ca.municipalityIds)) {
        ca.municipalityIds.forEach((muniId: any) => {
          if (muniId) {
            const muniIdStr = typeof muniId === 'string' ? muniId : (muniId._id?.toString() || muniId.toString());
            if (muniIdStr && !municipalityIds.includes(muniIdStr)) {
              municipalityIds.push(muniIdStr);
            }
          }
        });
      }
    });
  }

  return municipalityIds;
}

/**
 * Format user full name from user data
 * 
 * @param userData - User data object
 * @returns Formatted full name or empty string
 */
export function formatUserName(userData: any): string {
  if (!userData) return '';

  const firstName = userData.firstName || userData.First_Name || userData.first_name || '';
  const lastName = userData.lastName || userData.Last_Name || userData.last_name || '';
  const middleName = userData.middleName || userData.Middle_Name || userData.middle_name || '';

  const parts = [firstName, middleName, lastName].filter(Boolean);
  return parts.join(' ').trim() || userData.name || userData.Name || '';
}

