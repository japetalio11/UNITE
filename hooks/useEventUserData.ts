/**
 * useEventUserData Hook
 * 
 * Handles all backend logic for fetching coordinators and stakeholders
 * for event creation modals. Separates business logic from UI components.
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserAuthority } from '@/utils/getUserAuthority';
import { extractCoordinatorId, extractMunicipalityIds, formatUserName } from '@/utils/userHelpers';
import { decodeJwt } from '@/utils/decodeJwt';

interface UserOption {
  key: string;
  label: string;
}

interface UseEventUserDataReturn {
  // Coordinator state
  coordinator: string;
  coordinatorOptions: UserOption[];
  setCoordinator: (id: string) => void;
  loadingCoordinators: boolean;
  coordinatorError: string | null;
  
  // Stakeholder state
  stakeholder: string;
  stakeholderOptions: UserOption[];
  setStakeholder: (id: string) => void;
  loadingStakeholders: boolean;
  stakeholderError: string | null;
  stakeholderLocked: boolean; // Whether stakeholder field should be locked
  
  // User contact info for auto-filling
  userEmail: string | null;
  userPhone: string | null;
  
  // Admin state
  isSysAdmin: boolean;
  
  // Refresh function
  refreshCoordinators: () => Promise<void>;
  refreshStakeholders: () => Promise<void>;
}

/**
 * Custom hook for managing event user data (coordinators and stakeholders)
 * 
 * @param isOpen - Whether the modal is open (triggers initial fetch)
 * @param API_URL - Base API URL
 * @returns Event user data state and functions
 */
export function useEventUserData(
  isOpen: boolean,
  API_URL: string
): UseEventUserDataReturn {
  // Coordinator state
  const [coordinator, setCoordinator] = useState<string>('');
  const [coordinatorOptions, setCoordinatorOptions] = useState<UserOption[]>([]);
  const [loadingCoordinators, setLoadingCoordinators] = useState(false);
  const [coordinatorError, setCoordinatorError] = useState<string | null>(null);
  
  // Stakeholder state
  const [stakeholder, setStakeholder] = useState<string>('');
  const [stakeholderOptions, setStakeholderOptions] = useState<UserOption[]>([]);
  const [loadingStakeholders, setLoadingStakeholders] = useState(false);
  const [stakeholderError, setStakeholderError] = useState<string | null>(null);
  const [stakeholderLocked, setStakeholderLocked] = useState(false);
  
  // User contact info
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  
  // Admin state
  const [isSysAdmin, setIsSysAdmin] = useState(false);

  /**
   * Get auth headers with token
   */
  const getAuthHeaders = useCallback((): HeadersInit => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')
        : null;
    
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, []);

  /**
   * Get current user ID
   */
  const getCurrentUserId = useCallback((): string | null => {
    try {
      const rawUser = localStorage.getItem('unite_user');
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')
          : null;
      
      const user = rawUser ? JSON.parse(rawUser) : null;
      const userId = user?.id || user?._id || (token ? decodeJwt(token)?.id : null);
      return userId || null;
    } catch (error) {
      console.error('[useEventUserData] Error getting user ID:', error);
      return null;
    }
  }, []);

  /**
   * Fetch coordinators based on user authority
   */
  const fetchCoordinators = useCallback(async (): Promise<void> => {
    try {
      setLoadingCoordinators(true);
      setCoordinatorError(null);

      const userId = getCurrentUserId();
      if (!userId) {
        console.warn('[fetchCoordinators] No user ID found');
        setLoadingCoordinators(false);
        return;
      }

      const headers = getAuthHeaders();
      const userAuthority = await getUserAuthority(userId);
      console.log(`[fetchCoordinators] User authority: ${userAuthority}`);

      // System Admin (authority >= 80): Query all coordinators
      if (userAuthority !== null && userAuthority >= 80) {
        const res = await fetch(
          `${API_URL}/api/users/by-capability?capability=request.create`,
          {
            headers,
            credentials: 'include',
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch coordinators: ${res.status} ${res.statusText}`);
        }

        const body = await res.json();

        if (body.success && Array.isArray(body.data)) {
          const opts = body.data.map((u: any) => ({
            key: u._id,
            label: formatUserName(u) || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          }));

          setCoordinatorOptions(opts);
          setIsSysAdmin(true);
          setStakeholderLocked(false); // System admins can select stakeholders
          console.log(`[fetchCoordinators] Loaded ${opts.length} coordinators for System Admin`);
        } else {
          setCoordinatorOptions([]);
          console.warn('[fetchCoordinators] Unexpected response format:', body);
        }
        setLoadingCoordinators(false);
        return;
      }

      // Coordinator (authority >= 60 && < 80): Auto-lock to self
      if (userAuthority !== null && userAuthority >= 60 && userAuthority < 80) {
        const userRes = await fetch(`${API_URL}/api/users/${userId}`, {
          headers,
          credentials: 'include',
        });

        if (userRes.ok) {
          const userData = await userRes.json();
          const userFullName = formatUserName(userData.data || userData);
          setCoordinator(userId);
          setCoordinatorOptions([
            {
              key: userId,
              label: userFullName || 'Current User',
            },
          ]);
          setIsSysAdmin(false);
          setStakeholderLocked(false); // Coordinators can select stakeholders
          console.log(`[fetchCoordinators] Auto-locked coordinator to self: ${userId}`);
        } else {
          console.error('[fetchCoordinators] Failed to fetch coordinator user data');
          setCoordinatorError('Failed to load coordinator information');
        }
        setLoadingCoordinators(false);
        return;
      }

      // Stakeholder (authority < 60): Fetch assigned coordinator using dedicated endpoint
      if (userAuthority !== null && userAuthority < 60) {
        try {
          // Step 1: Fetch stakeholder user data (for auto-filling stakeholder field)
          const userRes = await fetch(`${API_URL}/api/users/${userId}`, {
            headers,
            credentials: 'include',
          });

          if (!userRes.ok) {
            throw new Error(`Failed to fetch user: ${userRes.status} ${userRes.statusText}`);
          }

          const userData = await userRes.json();
          const userFullName = formatUserName(userData.data || userData);

          // Step 2: Resolve coordinator(s) for this stakeholder using dedicated endpoint
          // This endpoint dynamically resolves coordinators based on organization + municipality matching
          const coordResolverRes = await fetch(`${API_URL}/api/users/${userId}/coordinator`, {
            headers,
            credentials: 'include',
          });

          if (!coordResolverRes.ok) {
            if (coordResolverRes.status === 404) {
              const errorData = await coordResolverRes.json().catch(() => ({}));
              console.error('[fetchCoordinators] No coordinator found for stakeholder:', {
                status: coordResolverRes.status,
                error: errorData.message || 'No matching coordinator found',
                diagnostic: errorData.diagnostic
              });
              setCoordinatorError(errorData.message || 'No assigned coordinator found');
            } else {
              throw new Error(`Failed to resolve coordinator: ${coordResolverRes.status} ${coordResolverRes.statusText}`);
            }
          } else {
            const coordData = await coordResolverRes.json();
            
            // Handle response structure: data._id, data.coordinator, or data.coordinators[0]
            const coordinatorInfo = coordData.data?._id 
              ? { _id: coordData.data._id, ...coordData.data.coordinator }
              : coordData.data?.coordinator 
              ? coordData.data.coordinator
              : coordData.data?.coordinators?.[0]
              ? coordData.data.coordinators[0]
              : null;

            if (coordinatorInfo && coordinatorInfo._id) {
              const coordinatorId = coordinatorInfo._id.toString();
              const coordFullName = coordinatorInfo.fullName || 
                                   formatUserName(coordinatorInfo) || 
                                   `${coordinatorInfo.firstName || ''} ${coordinatorInfo.lastName || ''}`.trim() ||
                                   'Coordinator';
              
              // If multiple coordinators, show all options
              if (coordData.data?.coordinators && coordData.data.coordinators.length > 1) {
                const opts = coordData.data.coordinators.map((c: any) => ({
                  key: c._id.toString(),
                  label: c.fullName || formatUserName(c) || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                }));
                setCoordinatorOptions(opts);
                setCoordinator(coordinatorId); // Auto-select first
                console.log(`[fetchCoordinators] Loaded ${opts.length} coordinators for stakeholder (multiple found)`);
              } else {
                // Single coordinator - lock it
                setCoordinator(coordinatorId);
                setCoordinatorOptions([
                  {
                    key: coordinatorId,
                    label: coordFullName,
                  },
                ]);
                console.log(`[fetchCoordinators] Loaded assigned coordinator for stakeholder: ${coordinatorId}`);
              }
            } else {
              console.warn('[fetchCoordinators] Coordinator endpoint returned unexpected structure:', coordData);
              setCoordinatorError('No assigned coordinator found');
            }
          }

          // Auto-lock stakeholder to self
          setStakeholder(userId);
          setStakeholderOptions([
            {
              key: userId,
              label: userFullName || 'Current User',
            },
          ]);
          setStakeholderLocked(true);
          
          // Extract email and phone from user data for auto-filling
          const userDataObj = userData.data || userData;
          setUserEmail(userDataObj.email || null);
          setUserPhone(userDataObj.phoneNumber || userDataObj.phone || null);
        } catch (err) {
          console.error('[fetchCoordinators] Failed to fetch stakeholder coordinator:', err);
          setCoordinatorError(
            err instanceof Error ? err.message : 'Failed to load coordinator'
          );
        }
        setLoadingCoordinators(false);
        return;
      }

      // Fallback: If authority is null, try legacy detection
      console.warn('[fetchCoordinators] User authority is null, using fallback detection');
      const rawUser = localStorage.getItem('unite_user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      const { getUserInfo } = await import('@/utils/getUserInfo');
      const info = (() => {
        try {
          return getUserInfo();
        } catch (e) {
          return null;
        }
      })();

      const isAdmin = !!(
        (info && info.isAdmin) ||
        (user &&
          ((user.staff_type &&
            String(user.staff_type).toLowerCase().includes('admin')) ||
            (user.role && String(user.role).toLowerCase().includes('admin'))))
      );

      if (isAdmin) {
        setIsSysAdmin(true);
        // Try unified endpoint as fallback
        const res = await fetch(
          `${API_URL}/api/users/by-capability?capability=request.create`,
          {
            headers,
            credentials: 'include',
          }
        );
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.data)) {
            const opts = body.data.map((u: any) => ({
              key: u._id,
              label: formatUserName(u) || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
            }));
            setCoordinatorOptions(opts);
          }
        }
      }
      setLoadingCoordinators(false);
    } catch (err) {
      console.error('[fetchCoordinators] Failed to fetch coordinators:', err);
      setCoordinatorError(
        err instanceof Error ? err.message : 'Failed to load coordinators'
      );
      setLoadingCoordinators(false);
    }
  }, [API_URL, getCurrentUserId, getAuthHeaders]);

  /**
   * Fetch stakeholders based on selected coordinator and user authority
   */
  const fetchStakeholders = useCallback(
    async (selectedCoordinatorId: string): Promise<void> => {
      try {
        if (!selectedCoordinatorId) {
          setStakeholderOptions([]);
          setStakeholderError(null);
          return;
        }

        setLoadingStakeholders(true);
        setStakeholderError(null);

        const headers = getAuthHeaders();
        const userId = getCurrentUserId();

        if (!userId) {
          console.warn('[fetchStakeholders] No user ID found');
          setStakeholderOptions([]);
          setLoadingStakeholders(false);
          return;
        }

        const userAuthority = await getUserAuthority(userId);

        // Stakeholder users should auto-lock to self, don't query
        if (userAuthority !== null && userAuthority < 60) {
          const userRes = await fetch(`${API_URL}/api/users/${userId}`, {
            headers,
            credentials: 'include',
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            const userFullName = formatUserName(userData.data || userData);
            setStakeholder(userId);
            setStakeholderOptions([
              {
                key: userId,
                label: userFullName || 'Current User',
              },
            ]);
            setStakeholderLocked(true);
            
            // Extract email and phone from user data for auto-filling
            const userDataObj = userData.data || userData;
            setUserEmail(userDataObj.email || null);
            setUserPhone(userDataObj.phoneNumber || userDataObj.phone || null);
            
            setLoadingStakeholders(false);
            return;
          }
        }

        // For System Admin: optionally filter by coordinator's coverage
        // For Coordinator: backend will filter by org+coverage automatically
        let locationId: string | undefined = undefined;

        if (userAuthority !== null && userAuthority >= 80) {
          // System Admin: get coordinator's coverage areas to filter stakeholders
          try {
            const coordRes = await fetch(`${API_URL}/api/users/${selectedCoordinatorId}`, {
              headers,
              credentials: 'include',
            });
            if (coordRes.ok) {
              const coordData = await coordRes.json();
              const municipalityIds = extractMunicipalityIds(coordData.data || coordData);
              if (municipalityIds.length > 0) {
                locationId = municipalityIds[0]; // Use first municipality for filtering
              }
            }
          } catch (e) {
            console.warn('[fetchStakeholders] Failed to fetch coordinator coverage:', e);
          }
        }

        // Query stakeholders using unified endpoint
        const url = locationId
          ? `${API_URL}/api/users/by-capability?capability=request.review&locationId=${locationId}`
          : `${API_URL}/api/users/by-capability?capability=request.review`;

        const stRes = await fetch(url, {
          headers,
          credentials: 'include',
        });

        if (!stRes.ok) {
          throw new Error(`Failed to fetch stakeholders: ${stRes.status} ${stRes.statusText}`);
        }

        const stBody = await stRes.json();

        if (stBody.success && Array.isArray(stBody.data)) {
          const opts = (stBody.data || []).map((u: any) => ({
            key: u._id,
            label: formatUserName(u) || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          }));

          setStakeholderOptions(opts);
          if (stakeholder && !opts.find((o: any) => o.key === stakeholder)) {
            setStakeholder('');
          }
          console.log(`[fetchStakeholders] Loaded ${opts.length} stakeholders`);
        } else {
          setStakeholderOptions([]);
          console.warn('[fetchStakeholders] Unexpected response format:', stBody);
        }
      } catch (err) {
        console.error('[fetchStakeholders] Failed to load stakeholders:', err);
        setStakeholderError(
          err instanceof Error ? err.message : 'Failed to load stakeholders'
        );
        setStakeholderOptions([]);
      } finally {
        setLoadingStakeholders(false);
      }
    },
    [API_URL, getCurrentUserId, getAuthHeaders, stakeholder]
  );

  // Fetch coordinators when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCoordinators();
    }
  }, [isOpen, fetchCoordinators]);

  // Fetch stakeholders when coordinator changes
  useEffect(() => {
    if (isOpen && coordinator) {
      fetchStakeholders(coordinator);
    }
  }, [isOpen, coordinator, fetchStakeholders]);

  // Update isSysAdmin based on user authority
  useEffect(() => {
    if (isOpen) {
      const userId = getCurrentUserId();
      if (userId) {
        getUserAuthority(userId)
          .then((authority) => {
            setIsSysAdmin(authority !== null && authority >= 80);
          })
          .catch((err) => {
            console.warn('[useEventUserData] Failed to get authority:', err);
            setIsSysAdmin(false);
          });
      }
    }
  }, [isOpen, getCurrentUserId]);

  return {
    // Coordinator state
    coordinator,
    coordinatorOptions,
    setCoordinator,
    loadingCoordinators,
    coordinatorError,

    // Stakeholder state
    stakeholder,
    stakeholderOptions,
    setStakeholder,
    loadingStakeholders,
    stakeholderError,
    stakeholderLocked,

    // User contact info
    userEmail,
    userPhone,

    // Admin state
    isSysAdmin,

    // Refresh functions
    refreshCoordinators: fetchCoordinators,
    refreshStakeholders: () => coordinator && fetchStakeholders(coordinator),
  };
}

