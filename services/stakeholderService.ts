/**
 * Stakeholder Service
 * API client for stakeholder management operations
 * Handles all backend communication for the stakeholder management page
 */

import { fetchJsonWithAuth } from '@/utils/fetchWithAuth';

export interface CreateStakeholderData {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  roleCode: string;
  organizationId?: string;
  organizationType?: string;
  organizationInstitution?: string;
  coverageAreaId?: string;
  field?: string;
}

export interface UpdateStakeholderData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  roles?: string[]; // Array of role IDs
  organizationId?: string;
  organizationType?: string;
  organizationInstitution?: string;
  coverageAreaId?: string;
  municipalityId?: string;
  barangayId?: string | null;
  field?: string;
}

export interface StakeholderListItem {
  id: string;
  _id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  roles: Array<{
    _id: string;
    code: string;
    name: string;
    description?: string;
  }>;
  organization?: {
    _id: string;
    name: string;
    type: string;
  };
  coverageAreas: Array<{
    id: string;
    _id: string;
    name: string;
  }>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStakeholderResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface UpdateStakeholderResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface ListStakeholdersResponse {
  success: boolean;
  data: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Create a new stakeholder
 * @param data - Stakeholder creation data
 * @returns Created stakeholder data
 */
export async function createStakeholder(
  data: any
): Promise<CreateStakeholderResponse> {
  try {
    const payload: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      roles: data.roles || [], // Use provided roles (should be role IDs)
    };

    if (data.middleName) payload.middleName = data.middleName;
    if (data.phoneNumber) payload.phoneNumber = data.phoneNumber;
    if (data.organizationId) payload.organizationId = data.organizationId;
    if (data.organizationType) payload.organizationType = data.organizationType;
    if (data.organizationInstitution) payload.organizationInstitution = data.organizationInstitution;
    if (data.municipalityId) payload.municipalityId = data.municipalityId;
    if (data.barangayId) payload.barangayId = data.barangayId;
    if (data.coverageAreaId) payload.coverageAreaId = data.coverageAreaId;
    if (data.field) payload.field = data.field;
    if (data.pageContext) payload.pageContext = data.pageContext;

    const response = await fetchJsonWithAuth('/api/users', {
      method: 'POST',
      headers: {
        'x-page-context': 'stakeholder-management',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    // Don't log validation warnings to console if they're expected
    // (e.g., capability warnings that don't prevent creation)
    // Also don't log "Email already exists" or duplicate key errors - they will be shown in the modal
    const isValidationWarning = error.status === 400 && 
      (error.body?.message?.includes("capabilities") ||
       error.body?.message?.includes("Email already exists") ||
       error.body?.message?.includes("duplicate key") ||
       error.body?.message?.includes("E11000") ||
       error.message?.includes("Email already exists") ||
       error.message?.includes("duplicate key") ||
       error.message?.includes("E11000"));
    
    if (!isValidationWarning) {
      console.error('Failed to create stakeholder:', error);
    }
    
    return {
      success: false,
      message: error.message || error.body?.message || 'Failed to create stakeholder',
    };
  }
}

/**
 * Update an existing stakeholder
 * @param userId - User ID
 * @param data - Update data
 * @returns Updated stakeholder data
 */
export async function updateStakeholder(
  userId: string,
  data: UpdateStakeholderData
): Promise<UpdateStakeholderResponse> {
  try {
    const payload: any = {};

    // Basic user fields
    if (data.firstName !== undefined) payload.firstName = data.firstName;
    if (data.middleName !== undefined) payload.middleName = data.middleName;
    if (data.lastName !== undefined) payload.lastName = data.lastName;
    if (data.email !== undefined) payload.email = data.email;
    if (data.phoneNumber !== undefined) payload.phoneNumber = data.phoneNumber;
    if (data.password !== undefined) payload.password = data.password;
    
    // Organization fields
    if (data.organizationId !== undefined) payload.organizationId = data.organizationId;
    if (data.organizationType !== undefined) payload.organizationType = data.organizationType;
    if (data.organizationInstitution !== undefined) payload.organizationInstitution = data.organizationInstitution;
    
    // Location fields (for stakeholders)
    if (data.municipalityId !== undefined) payload.municipalityId = data.municipalityId;
    if (data.barangayId !== undefined) payload.barangayId = data.barangayId;
    
    // Coverage area (for coordinators)
    if (data.coverageAreaId !== undefined) payload.coverageAreaId = data.coverageAreaId;
    
    // Other fields
    if (data.field !== undefined) payload.field = data.field;

    // Roles - handle as array of role IDs
    if (data.roles !== undefined && Array.isArray(data.roles) && data.roles.length > 0) {
      payload.roles = data.roles;
    }

    const response = await fetchJsonWithAuth(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error('Failed to update stakeholder:', error);
    return {
      success: false,
      message: error.message || error.body?.message || 'Failed to update stakeholder',
    };
  }
}

/**
 * Get a stakeholder by ID
 * @param userId - User ID
 * @returns Stakeholder data
 * @note This endpoint requires user.read permission. If permission is denied,
 *       the calling code should fallback to using stakeholder prop data.
 */
export async function getStakeholder(userId: string): Promise<any> {
  try {
    console.log('[stakeholderService] Fetching stakeholder:', {
      userId,
      endpoint: `/api/users/${userId}`
    })
    
    const response = await fetchJsonWithAuth(`/api/users/${userId}`);
    
    console.log('[stakeholderService] API response:', {
      success: response.success,
      hasData: !!response.data,
      message: response.message
    })
    
    if (response.success && response.data) {
      return response.data;
    }
    
    const errorMessage = response.message || 'Failed to get stakeholder';
    console.warn('[stakeholderService] API call failed:', {
      userId,
      message: errorMessage,
      response
    })
    throw new Error(errorMessage);
  } catch (error: any) {
    console.error('[stakeholderService] Error fetching stakeholder:', {
      userId,
      error: error.message || error,
      endpoint: `/api/users/${userId}`
    });
    throw error;
  }
}

/**
 * Get stakeholder edit context
 * Returns complete, consistent stakeholder data ready for editing
 * @param userId - User ID
 * @returns Edit context data with all relationships resolved
 */
export async function getStakeholderEditContext(userId: string): Promise<{
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: {
    _id: string;
    code: string;
    name: string;
    authority: number;
  } | null;
  organization: {
    _id: string;
    name: string;
    type: string;
  } | null;
  location: {
    municipality: {
      _id: string;
      name: string;
    };
    barangay?: {
      _id: string;
      name: string;
    } | null;
    district: {
      _id: string;
      name: string;
    } | null;
    province: {
      _id: string;
      name: string;
    } | null;
  } | null;
  editPermissions: {
    canEditRole: boolean;
    canEditOrganization: boolean;
    canEditLocation: boolean;
    canEditProvinceDistrict: boolean;
  };
}> {
  try {
    const response = await fetchJsonWithAuth(`/api/users/${userId}/edit-context`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get stakeholder edit context');
  } catch (error: any) {
    console.error('[stakeholderService] Error fetching edit context:', {
      userId,
      error: error.message || error
    });
    throw error;
  }
}

/**
 * List stakeholders (users with request.review capability)
 * @param filters - Optional filters
 * @returns List of stakeholders
 */
export async function listStakeholders(filters?: {
  search?: string;
  organizationType?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<ListStakeholdersResponse> {
  try {
    const params = new URLSearchParams();
    
    // Use capability-based endpoint
    params.append('capability', 'request.review');
    
    if (filters?.isActive !== undefined) {
      params.append('isActive', String(filters.isActive));
    }
    
    if (filters?.organizationType) {
      params.append('organizationType', filters.organizationType);
    }
    
    if (filters?.page) {
      params.append('page', String(filters.page));
    }
    
    if (filters?.limit) {
      params.append('limit', String(filters.limit));
    }

    const queryString = params.toString();
    const url = `/api/users/by-capability${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetchJsonWithAuth(url);
    
    if (response.success) {
      return {
        success: true,
        data: response.data || [],
        pagination: response.pagination,
      };
    }
    
    throw new Error(response.message || 'Failed to list stakeholders');
  } catch (error: any) {
    console.error('Failed to list stakeholders:', error);
    const errorMessage = error.message || error.body?.message || 'Failed to list stakeholders';
    return {
      success: false,
      data: [],
    } as ListStakeholdersResponse & { message?: string };
  }
}

/**
 * Delete a stakeholder (soft delete)
 * @param userId - User ID
 * @returns Success status
 */
export async function deleteStakeholder(userId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetchJsonWithAuth(`/api/users/${userId}`, {
      method: 'DELETE',
    });

    if (response.success !== false) {
      return {
        success: true,
        message: response.message || 'Stakeholder deleted successfully',
      };
    } else {
      return {
        success: false,
        message: response.message || 'Failed to delete stakeholder',
      };
    }
  } catch (error: any) {
    console.error('Failed to delete stakeholder:', error);
    return {
      success: false,
      message: error.message || error.body?.message || 'Failed to delete stakeholder',
    };
  }
}

