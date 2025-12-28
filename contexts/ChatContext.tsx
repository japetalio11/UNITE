"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  getCurrentUser,
  fetchRecipients,
  fetchConversations,
  fetchMessages,
  type ChatUser,
  type ChatMessage,
  type ChatConversation,
  type ChatRecipient
} from '@/services/chatService';

// Use types from chatService
type User = ChatUser;
type Message = ChatMessage;
type Conversation = ChatConversation;

// Types are imported from chatService

interface ChatContextType {
  // Data
  recipients: User[];
  conversations: Conversation[];
  messages: Message[];
  selectedConversation: Conversation | null;
  currentUser: User | null;

  // Loading states
  loadingRecipients: boolean;
  loadingConversations: boolean;
  loadingMessages: boolean;

  // Actions
  selectConversation: (conversationId: string) => void;
  sendMessage: (receiverId: string, content: string, messageType?: string, attachments?: Array<{ filename: string; url: string; key?: string; mime?: string; size?: number }>) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  refreshRecipients: () => Promise<void>;
  refreshConversations: () => Promise<void>;

  // Socket connection
  isConnected: boolean;
  typingUsers: Set<string>;
  startTyping: (receiverId: string) => void;
  stopTyping: (receiverId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Data states
  const [recipients, setRecipients] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Loading states
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Typing states
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Initialize Socket.IO connection
  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')
      : null;

    if (!token) {
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6700';

    const socketInstance = io(apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('connect_error', () => {
      setIsConnected(false);
    });

    // Message events
    socketInstance.on('new_message', (message: Message) => {
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(m => m.messageId === message.messageId)) {
          return prev;
        }
        return [...prev, message].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });

      // Update conversation last message
      setConversations(prev =>
        prev.map(conv =>
          conv.conversationId === message.conversationId
            ? {
                ...conv,
                lastMessage: {
                  messageId: message.messageId,
                  content: message.content,
                  senderId: message.senderId,
                  timestamp: message.timestamp
                },
                updatedAt: new Date().toISOString()
              }
            : conv
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
    });

    socketInstance.on('message_sent', (message: Message) => {
      setMessages(prev => {
        if (prev.some(m => m.messageId === message.messageId)) {
          return prev;
        }
        return [...prev, message].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    });

    socketInstance.on('message_delivered', (data: { messageId: string }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.messageId === data.messageId ? { ...msg, status: 'delivered' as const } : msg
        )
      );
    });

    socketInstance.on('message_read', (data: { messageId: string }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.messageId === data.messageId ? { ...msg, status: 'read' as const } : msg
        )
      );
    });

    // Typing events
    socketInstance.on('typing_start', (data: { userId: string }) => {
      setTypingUsers(prev => new Set(prev).add(data.userId));
    });

    socketInstance.on('typing_stop', (data: { userId: string }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    // Error events
    socketInstance.on('message_error', () => {
      // Silently handle message errors
    });

    socketInstance.on('typing_error', () => {
      // Silently handle typing errors
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Load current user info using service layer
  const loadCurrentUser = useCallback(async () => {
    try {
      const user = getCurrentUser();
      if (user) {
        setCurrentUser(user);
      } else {
        // Fallback: try to fetch from API
        try {
          const response = await fetchWithAuth('/api/auth/me');
          if (response.ok) {
            const userData = await response.json();
            const data = userData.data || userData.user || userData;
            
            // Extract from new structure
            const activeRoles = (data.roles || []).filter((r: any) => r.isActive !== false);
            const primaryRole = activeRoles.length > 0 ? activeRoles[0].code : 'user';
            const name = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || 'Unknown';
            
            setCurrentUser({
              id: data._id?.toString() || data.id?.toString() || '',
              name: name,
              role: primaryRole,
              email: data.email || '',
              authority: data.authority,
              type: primaryRole === 'stakeholder' ? 'stakeholder' : 'staff'
            });
          }
        } catch (apiError) {
          // Silently fail
        }
      }
    } catch (error) {
      // Silently fail user loading
    }
  }, []);

  // Load recipients using service layer
  const refreshRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      const recipientsData = await fetchRecipients();
      setRecipients(recipientsData);
    } catch (error) {
      // Silently fail recipient loading
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  // Load conversations using service layer
  const refreshConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const conversationsData = await fetchConversations();
      setConversations(conversationsData);
    } catch (error) {
      // Silently fail conversation loading
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Load messages for selected conversation using service layer
  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const messagesData = await fetchMessages(conversationId);
      setMessages(messagesData);
    } catch (error) {
      // Silently fail message loading
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Select conversation or recipient
  const selectConversation = useCallback((id: string) => {
    if (id.startsWith('recipient-')) {
      // This is a recipient selection - find or create conversation
      const recipientId = id.replace('recipient-', '');

      // Look for existing conversation with this recipient
      const existingConversation = conversations.find(conv => {
        const otherParticipant = conv.participants.find(p => p.userId !== currentUser?.id);
        return otherParticipant?.userId === recipientId;
      });

      if (existingConversation) {
        setSelectedConversation(existingConversation);
        loadMessages(existingConversation.conversationId);

        // Join conversation room
        if (socket) {
          socket.emit('join_conversation', { conversationId: existingConversation.conversationId });
        }
      } else {
        // Create a temporary conversation object for the UI
        const recipient = recipients.find(r => r.id === recipientId);
        if (recipient && currentUser) {
          const tempConversation: Conversation = {
            conversationId: `temp-${recipientId}`,
            participants: [
              { userId: currentUser.id, joinedAt: new Date().toISOString(), details: currentUser },
              { userId: recipientId, joinedAt: new Date().toISOString(), details: recipient }
            ],
            lastMessage: undefined,
            unreadCount: { [currentUser.id]: 0 },
            updatedAt: new Date().toISOString()
          };
          setSelectedConversation(tempConversation);
          setMessages([]); // Clear messages for new conversation
        }
      }
    } else {
      // This is a regular conversation ID
      const conversation = conversations.find(c => c.conversationId === id);

      if (conversation) {
        setSelectedConversation(conversation);
        loadMessages(id);

        // Join conversation room
        if (socket) {
          socket.emit('join_conversation', { conversationId: id });
        }
      }
    }
  }, [conversations, loadMessages, socket, currentUser, recipients]);

  // Send message
  const sendMessage = useCallback(async (
    receiverId: string,
    content: string,
    messageType: string = 'text',
    attachments: Array<{ filename: string; url: string; key?: string; mime?: string; size?: number }> = []
  ) => {
    if (!socket || !currentUser) {
      return;
    }

    socket.emit('send_message', {
      receiverId,
      content,
      messageType,
      attachments
    });
  }, [socket, currentUser]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (!socket) return;

    socket.emit('mark_read', { messageId });
  }, [socket]);

  // Typing functions
  const startTyping = useCallback((receiverId: string) => {
    if (!socket) return;
    socket.emit('typing_start', { receiverId });
  }, [socket]);

  const stopTyping = useCallback((receiverId: string) => {
    if (!socket) return;
    socket.emit('typing_stop', { receiverId });
  }, [socket]);

  // Initialize data on mount
  useEffect(() => {
    loadCurrentUser();
    refreshRecipients();
    refreshConversations();
  }, [loadCurrentUser, refreshRecipients, refreshConversations]);

  const value: ChatContextType = {
    // Data
    recipients,
    conversations,
    messages,
    selectedConversation,
    currentUser,

    // Loading states
    loadingRecipients,
    loadingConversations,
    loadingMessages,

    // Actions
    selectConversation,
    sendMessage,
    markAsRead,
    refreshRecipients,
    refreshConversations,

    // Socket connection
    isConnected,
    typingUsers,
    startTyping,
    stopTyping
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}