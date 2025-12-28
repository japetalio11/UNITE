/**
 * Chat Service Layer
 * 
 * Separates business logic from UI components for easier debugging and maintenance.
 * All chat-related API calls and data transformations are handled here.
 */

import { fetchWithAuth } from '@/utils/fetchWithAuth';
import { getUserInfo } from '@/utils/getUserInfo';
import { decodeJwt } from '@/utils/decodeJwt';

// Types
export interface ChatUser {
  id: string;
  name: string;
  role: string;
  email: string;
  authority?: number;
  type?: 'staff' | 'stakeholder';
}

export interface ChatMessage {
  messageId: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  attachments?: Array<{
    filename: string;
    url: string;
    key?: string;
    mime?: string;
    size?: number;
  }>;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  senderDetails?: ChatUser;
  receiverDetails?: ChatUser;
}

export interface ChatConversation {
  conversationId: string;
  participants: Array<{
    userId: string;
    joinedAt: string;
    details?: ChatUser;
  }>;
  lastMessage?: {
    messageId: string;
    content: string;
    senderId: string;
    timestamp: string;
  };
  unreadCount: { [userId: string]: number };
  updatedAt: string;
}

export interface ChatRecipient {
  id: string;
  name: string;
  role: string;
  roles: string[];
  email: string;
  type: string;
  authority?: number;
}

/**
 * Get current user from localStorage/JWT using new structure
 */
export function getCurrentUser(): ChatUser | null {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.raw) {
      return null;
    }

    const user = userInfo.raw;
    
    // Extract user ID - try new structure first, then legacy
    const userId = 
      user._id?.toString() || 
      user.id?.toString() || 
      user.User_ID?.toString() || 
      user.userId?.toString() || 
      null;

    if (!userId) {
      // Try to get from JWT token
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')
        : null;
      
      if (token) {
        try {
          const decoded = decodeJwt(token);
          if (decoded && decoded.id) {
            return {
              id: decoded.id.toString(),
              name: userInfo.displayName || 'Unknown',
              role: userInfo.role || 'user',
              email: userInfo.email || '',
              authority: undefined,
              type: userInfo.isAdmin ? 'staff' : 'stakeholder'
            };
          }
        } catch (e) {
          // JWT decode failed
        }
      }
      return null;
    }

    // Extract name from new structure
    const firstName = user.firstName || user.First_Name || user.first_name || '';
    const lastName = user.lastName || user.Last_Name || user.last_name || '';
    const middleName = user.middleName || user.Middle_Name || user.middle_name || '';
    const nameParts = [firstName, middleName, lastName].filter(Boolean);
    const name = nameParts.length > 0 
      ? nameParts.join(' ') 
      : userInfo.displayName || user.name || user.Name || 'Unknown';

    // Extract role from embedded roles array
    let role = 'user';
    if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
      const activeRoles = user.roles.filter((r: any) => r.isActive !== false);
      if (activeRoles.length > 0) {
        role = activeRoles[0].roleCode || activeRoles[0].code || 'user';
      }
    } else {
      // Fallback to userInfo role
      role = userInfo.role || 'user';
    }

    // Determine type from role/authority
    const authority = user.authority || undefined;
    const type = role === 'stakeholder' ? 'stakeholder' : 'staff';

    return {
      id: userId,
      name: name.trim() || 'Unknown',
      role: role,
      email: userInfo.email || user.email || user.Email || '',
      authority: authority,
      type: type
    };
  } catch (error) {
    console.error('[chatService] Error getting current user:', error);
    return null;
  }
}

/**
 * Extract user ID from new structure
 */
export function extractUserId(): string | null {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.raw) {
      // Try JWT token
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')
        : null;
      
      if (token) {
        try {
          const decoded = decodeJwt(token);
          return decoded?.id?.toString() || null;
        } catch (e) {
          return null;
        }
      }
      return null;
    }

    const user = userInfo.raw;
    return (
      user._id?.toString() || 
      user.id?.toString() || 
      user.User_ID?.toString() || 
      user.userId?.toString() || 
      null
    );
  } catch (error) {
    console.error('[chatService] Error extracting user ID:', error);
    return null;
  }
}

/**
 * Format user display name from new structure
 */
export function formatUserDisplayName(user: any): string {
  if (!user) return 'Unknown';
  
  const firstName = user.firstName || user.First_Name || user.first_name || '';
  const lastName = user.lastName || user.Last_Name || user.last_name || '';
  const middleName = user.middleName || user.Middle_Name || user.middle_name || '';
  
  const nameParts = [firstName, middleName, lastName].filter(Boolean);
  if (nameParts.length > 0) {
    return nameParts.join(' ');
  }
  
  return user.name || user.Name || user.displayName || 'Unknown';
}

/**
 * Fetch recipients from API
 */
export async function fetchRecipients(): Promise<ChatRecipient[]> {
  try {
    const response = await fetchWithAuth('/api/chat/recipients');
    if (!response.ok) {
      throw new Error('Failed to fetch recipients');
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[chatService] Error fetching recipients:', error);
    return [];
  }
}

/**
 * Fetch conversations from API
 */
export async function fetchConversations(): Promise<ChatConversation[]> {
  try {
    const response = await fetchWithAuth('/api/chat/conversations');
    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[chatService] Error fetching conversations:', error);
    return [];
  }
}

/**
 * Fetch messages for a conversation
 */
export async function fetchMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<ChatMessage[]> {
  try {
    const response = await fetchWithAuth(`/api/chat/messages/${conversationId}?page=${page}&limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[chatService] Error fetching messages:', error);
    return [];
  }
}

/**
 * Send message via API (alternative to socket)
 */
export async function sendMessageAPI(
  receiverId: string,
  content: string,
  messageType: string = 'text',
  attachments: Array<{ filename: string; url: string; key?: string; mime?: string; size?: number }> = []
): Promise<ChatMessage | null> {
  try {
    const response = await fetchWithAuth('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId,
        content,
        messageType,
        attachments
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('[chatService] Error sending message:', error);
    return null;
  }
}

/**
 * Mark message as read via API
 */
export async function markMessageAsRead(messageId: string): Promise<boolean> {
  try {
    const response = await fetchWithAuth(`/api/chat/messages/${messageId}/read`, {
      method: 'PUT'
    });
    return response.ok;
  } catch (error) {
    console.error('[chatService] Error marking message as read:', error);
    return false;
  }
}

/**
 * Authority tier constants (must match backend)
 */
export const AUTHORITY_TIERS = {
  SYSTEM_ADMIN: 100,
  OPERATIONAL_ADMIN: 80,
  COORDINATOR: 60,
  STAKEHOLDER: 30,
  BASIC_USER: 20
} as const;

/**
 * Check if user can chat with another user based on authority
 * This is a client-side check for UI purposes - backend always validates
 */
export function canChatWithUser(senderAuthority: number | undefined, receiverAuthority: number | undefined): boolean {
  if (!senderAuthority || !receiverAuthority) {
    return false;
  }

  // System Admin (100): Can chat with Coordinators (60) and Operational Admins (80)
  if (senderAuthority >= AUTHORITY_TIERS.SYSTEM_ADMIN) {
    return receiverAuthority >= AUTHORITY_TIERS.COORDINATOR && receiverAuthority < AUTHORITY_TIERS.SYSTEM_ADMIN;
  }

  // Operational Admin (80): Can chat with Coordinators (60) and Stakeholders (30)
  if (senderAuthority >= AUTHORITY_TIERS.OPERATIONAL_ADMIN && senderAuthority < AUTHORITY_TIERS.SYSTEM_ADMIN) {
    return receiverAuthority === AUTHORITY_TIERS.COORDINATOR || receiverAuthority === AUTHORITY_TIERS.STAKEHOLDER;
  }

  // Coordinator (60): Can chat with Stakeholders (30) and Admins (80-100)
  if (senderAuthority >= AUTHORITY_TIERS.COORDINATOR && senderAuthority < AUTHORITY_TIERS.OPERATIONAL_ADMIN) {
    return receiverAuthority === AUTHORITY_TIERS.STAKEHOLDER || receiverAuthority >= AUTHORITY_TIERS.OPERATIONAL_ADMIN;
  }

  // Stakeholder (30): Can chat with Coordinators (60)
  if (senderAuthority >= AUTHORITY_TIERS.STAKEHOLDER && senderAuthority < AUTHORITY_TIERS.COORDINATOR) {
    return receiverAuthority === AUTHORITY_TIERS.COORDINATOR;
  }

  return false;
}

/**
 * Check if user can send messages (has chat.create permission)
 * This is a simplified check - actual permission is validated on backend
 * Returns true if authority is undefined (can't determine) to allow backend validation
 */
export function canSendMessage(userAuthority: number | undefined): boolean {
  // If authority is not set, allow and let backend validate
  if (userAuthority === undefined || userAuthority === null) {
    return true;
  }
  // All users with authority >= STAKEHOLDER can send messages
  return userAuthority >= AUTHORITY_TIERS.STAKEHOLDER;
}

