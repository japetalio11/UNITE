"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  type: 'staff' | 'stakeholder';
}

interface Message {
  messageId: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  senderDetails?: User;
  receiverDetails?: User;
}

interface Conversation {
  conversationId: string;
  participants: Array<{
    userId: string;
    joinedAt: string;
    details?: User;
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
  sendMessage: (receiverId: string, content: string, messageType?: string) => Promise<void>;
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
    console.log('🔌 ChatContext: Initializing Socket.IO connection...');

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')
      : null;

    console.log('🔑 ChatContext: Token available:', !!token);

    if (!token) {
      console.log('❌ ChatContext: No token found, skipping connection');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6700';
    console.log('🌐 ChatContext: Connecting to:', apiUrl);

    const socketInstance = io(apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('✅ ChatContext: Connected to chat server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ ChatContext: Disconnected from chat server, reason:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('🚨 ChatContext: Connection error:', error);
      setIsConnected(false);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    // Message events
    socketInstance.on('new_message', (message: Message) => {
      console.log('📨 ChatContext: New message received:', message);
      console.log('📨 ChatContext: Current messages before:', messages.length);
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(m => m.messageId === message.messageId)) {
          console.log('📨 ChatContext: Message already exists, skipping');
          return prev;
        }
        const newMessages = [...prev, message].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        console.log('📨 ChatContext: Messages after adding:', newMessages.length);
        return newMessages;
      });

      // Update conversation last message
      console.log('📨 ChatContext: Updating conversation last message for:', message.conversationId);
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
      console.log('📤 ChatContext: Message sent confirmation:', message);
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
    socketInstance.on('message_error', (error: { error: string }) => {
      console.error('Message error:', error.error);
    });

    socketInstance.on('typing_error', (error: { error: string }) => {
      console.error('Typing error:', error.error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Load current user info
  const loadCurrentUser = useCallback(async () => {
    try {
      console.log('👤 ChatContext: Loading current user...');
      const response = await fetchWithAuth('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        console.log('👤 ChatContext: Raw user data:', userData);

        const processedUser: User = {
          id: userData.data.ID || userData.data.id,
          name: `${userData.data.First_Name || ''} ${userData.data.Last_Name || ''}`.trim(),
          role: userData.data.StaffType || userData.data.role || 'Unknown',
          email: userData.data.Email || userData.data.email,
          type: userData.data.StaffType ? 'staff' : 'stakeholder'
        };
        console.log('👤 ChatContext: Processed user:', processedUser);

        setCurrentUser(processedUser);
      } else {
        console.error('👤 ChatContext: Failed to load user, response status:', response.status);
      }
    } catch (error) {
      console.error('🚨 ChatContext: Failed to load current user:', error);
    }
  }, []);

  // Load recipients
  const refreshRecipients = useCallback(async () => {
    console.log('👥 ChatContext: Loading recipients...');
    setLoadingRecipients(true);
    try {
      const response = await fetchWithAuth('/api/chat/recipients');
      console.log('👥 ChatContext: Recipients response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('👥 ChatContext: Recipients data:', data);
        setRecipients(data.data || []);
        console.log('👥 ChatContext: Recipients set to state:', data.data || []);
      } else {
        console.error('👥 ChatContext: Failed to load recipients, status:', response.status);
      }
    } catch (error) {
      console.error('🚨 ChatContext: Failed to load recipients:', error);
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  // Load conversations
  const refreshConversations = useCallback(async () => {
    console.log('💬 ChatContext: Loading conversations...');
    setLoadingConversations(true);
    try {
      const response = await fetchWithAuth('/api/chat/conversations');
      console.log('💬 ChatContext: Conversations response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('💬 ChatContext: Conversations data:', data);
        setConversations(data.data || []);
        console.log('💬 ChatContext: Conversations set to state:', data.data || []);
      } else {
        console.error('💬 ChatContext: Failed to load conversations, status:', response.status);
      }
    } catch (error) {
      console.error('🚨 ChatContext: Failed to load conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    console.log('💬 ChatContext: Loading messages for conversation:', conversationId);
    setLoadingMessages(true);
    try {
      const response = await fetchWithAuth(`/api/chat/messages/${conversationId}`);
      console.log('💬 ChatContext: Messages response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('💬 ChatContext: Messages data:', data);
        setMessages(data.data || []);
        console.log('💬 ChatContext: Messages set to state:', data.data || []);
      } else {
        console.error('💬 ChatContext: Failed to load messages, status:', response.status);
      }
    } catch (error) {
      console.error('🚨 ChatContext: Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Select conversation or recipient
  const selectConversation = useCallback((id: string) => {
    console.log('🎯 ChatContext: Selecting conversation/recipient:', id);

    if (id.startsWith('recipient-')) {
      // This is a recipient selection - find or create conversation
      const recipientId = id.replace('recipient-', '');
      console.log('🎯 ChatContext: Recipient ID:', recipientId);

      // Look for existing conversation with this recipient
      const existingConversation = conversations.find(conv => {
        const otherParticipant = conv.participants.find(p => p.userId !== currentUser?.id);
        return otherParticipant?.userId === recipientId;
      });

      if (existingConversation) {
        console.log('🎯 ChatContext: Found existing conversation:', existingConversation.conversationId);
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
      console.log('🎯 ChatContext: Regular conversation ID:', id);
      const conversation = conversations.find(c => c.conversationId === id);
      console.log('🎯 ChatContext: Found conversation:', conversation);

      if (conversation) {
        console.log('🎯 ChatContext: Setting selected conversation');
        setSelectedConversation(conversation);
        loadMessages(id);

        // Join conversation room
        if (socket) {
          console.log('🎯 ChatContext: Joining conversation room:', id);
          socket.emit('join_conversation', { conversationId: id });
        } else {
          console.log('🎯 ChatContext: No socket available to join room');
        }
      } else {
        console.log('🎯 ChatContext: Conversation not found');
      }
    }
  }, [conversations, loadMessages, socket, currentUser, recipients]);

  // Send message
  const sendMessage = useCallback(async (
    receiverId: string,
    content: string,
    messageType: string = 'text'
  ) => {
    console.log('📤 ChatContext: Sending message to:', receiverId, 'content:', content);
    if (!socket || !currentUser) {
      console.log('📤 ChatContext: Cannot send - socket:', !!socket, 'currentUser:', !!currentUser);
      return;
    }

    console.log('📤 ChatContext: Emitting send_message event');
    socket.emit('send_message', {
      receiverId,
      content,
      messageType
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
    console.log('🚀 ChatContext: Initializing chat data...');
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