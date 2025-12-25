/**
 * Get User Authority Utility
 * 
 * Fetches and caches user authority from the backend /api/users/:id endpoint.
 * Since JWT tokens only contain id and email, we need to fetch the full user
 * object to get the authority field.
 */

interface UserData {
  _id: string;
  authority?: number;
  isSystemAdmin?: boolean;
}

// Cache in memory (cleared on page refresh)
const authorityCache = new Map<string, { authority: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user authority from backend or cache
 * @param userId - User ID (from JWT token or localStorage)
 * @param forceRefresh - Force refresh from backend (ignore cache)
 * @returns Authority number (20-100) or null if unavailable
 */
export async function getUserAuthority(
  userId: string | null | undefined,
  forceRefresh: boolean = false
): Promise<number | null> {
  if (!userId) {
    console.warn('[getUserAuthority] No userId provided');
    return null;
  }

  const userIdStr = userId.toString();

  // Check cache first (unless force refresh)
  if (!forceRefresh && authorityCache.has(userIdStr)) {
    const cached = authorityCache.get(userIdStr)!;
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - cached.timestamp < CACHE_TTL) {
      console.log(`[getUserAuthority] Using cached authority for ${userIdStr}: ${cached.authority}`);
      return cached.authority;
    } else {
      // Cache expired, remove it
      authorityCache.delete(userIdStr);
    }
  }

  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')
        : null;

    if (!token) {
      console.warn('[getUserAuthority] No auth token available');
      return null;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(`${API_URL}/api/users/${encodeURIComponent(userIdStr)}`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      console.error(`[getUserAuthority] Failed to fetch user: ${response.status} ${response.statusText}`);
      return null;
    }

    const body = await response.json();
    const userData: UserData = body.data || body;

    // Extract authority
    let authority: number | null = null;

    if (userData.authority !== undefined && userData.authority !== null) {
      authority = Number(userData.authority);
    } else if (userData.isSystemAdmin) {
      // Fallback: if isSystemAdmin is true, assume authority 100
      authority = 100;
    } else {
      // Default authority if not specified
      authority = 20;
    }

    // Validate authority range
    if (authority < 20 || authority > 100) {
      console.warn(`[getUserAuthority] Invalid authority value: ${authority}, defaulting to 20`);
      authority = 20;
    }

    // Cache the result
    authorityCache.set(userIdStr, {
      authority,
      timestamp: Date.now(),
    });

    console.log(`[getUserAuthority] Fetched authority for ${userIdStr}: ${authority}`);
    return authority;
  } catch (error) {
    console.error('[getUserAuthority] Error fetching user authority:', error);
    return null;
  }
}

/**
 * Clear authority cache for a specific user or all users
 * @param userId - User ID to clear, or undefined to clear all
 */
export function clearAuthorityCache(userId?: string): void {
  if (userId) {
    authorityCache.delete(userId.toString());
    console.log(`[clearAuthorityCache] Cleared cache for ${userId}`);
  } else {
    authorityCache.clear();
    console.log('[clearAuthorityCache] Cleared all authority cache');
  }
}

/**
 * Get cached authority without fetching from backend
 * @param userId - User ID
 * @returns Cached authority or null if not cached
 */
export function getCachedAuthority(userId: string | null | undefined): number | null {
  if (!userId) return null;
  
  const cached = authorityCache.get(userId.toString());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.authority;
  }
  
  return null;
}

