"use client";
import React, { useEffect, useState } from "react";
import { Search, Check } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";

type ConversationItem = {
  id: string;
  name: string;
  last: string;
  time: string;
  unread?: boolean;
  active?: boolean;
  role?: string;
  type?: 'staff' | 'stakeholder';
};

export default function ChatList({ onSelect }: { onSelect?: (id: string) => void }) {
  console.log('📋 ChatList: Rendered with onSelect:', !!onSelect);

  const {
    recipients,
    conversations,
    loadingRecipients,
    loadingConversations,
    currentUser
  } = useChat();

  console.log('📋 ChatList: Context values - recipients:', recipients?.length || 0, 'conversations:', conversations?.length || 0, 'loadingRecipients:', loadingRecipients, 'loadingConversations:', loadingConversations, 'currentUser:', currentUser);

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Combine recipients and conversations for display
  const getChatItems = (): ConversationItem[] => {
    console.log('📋 ChatList: getChatItems called');
    const items: ConversationItem[] = [];

    // Add conversations (existing chats)
    console.log('📋 ChatList: Processing conversations:', conversations.length);
    conversations.forEach(conv => {
      const otherParticipant = conv.participants.find(p =>
        p.userId !== currentUser?.id
      );

      console.log('📋 ChatList: Conversation:', conv.conversationId, 'other participant:', otherParticipant);

      if (otherParticipant?.details) {
        const unreadCount = conv.unreadCount[currentUser?.id || ''] || 0;

        items.push({
          id: conv.conversationId,
          name: otherParticipant.details.name,
          last: conv.lastMessage?.content || 'No messages yet',
          time: conv.lastMessage
            ? new Date(conv.lastMessage.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })
            : '',
          unread: unreadCount > 0,
          active: false, // Will be set by parent
          role: otherParticipant.details.role,
          type: otherParticipant.details.type
        });
      }
    });

    // Add recipients that don't have conversations yet
    console.log('📋 ChatList: Processing recipients:', recipients.length);
    recipients.forEach(recipient => {
      console.log('📋 ChatList: Processing recipient:', recipient);
      const hasConversation = items.some(item =>
        item.name === recipient.name && item.role === recipient.role
      );

      console.log('📋 ChatList: Recipient has conversation:', hasConversation);

      if (!hasConversation) {
        items.push({
          id: `recipient-${recipient.id}`,
          name: recipient.name,
          last: 'Start a conversation',
          time: '',
          unread: false,
          active: false,
          role: recipient.role,
          type: recipient.type
        });
      }
    });

    console.log('📋 ChatList: Final items:', items);
    return items;
  };

  const chatItems = getChatItems();

  // Filter items based on search and filter
  const filteredItems = chatItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'unread' && item.unread);
    return matchesSearch && matchesFilter;
  });

  const unreadCount = chatItems.filter(item => item.unread).length;

  if (loadingRecipients || loadingConversations) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-5 pb-0">
          <h1 className="text-2xl font-bold mb-6">Chat</h1>
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-8 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
        <div className="flex-1 p-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse mb-2">
              <div className="h-16 bg-gray-100 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-5 pb-0">
        <h1 className="text-2xl font-bold mb-6">Chat</h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-200"
            placeholder="Search people..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
            <button
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                filter === 'all' ? 'bg-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'
              }`}
              onClick={() => setFilter('all')}
            >
              All ({chatItems.length})
            </button>
            <button
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition ${
                filter === 'unread' ? 'bg-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'
              }`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>
          {unreadCount > 0 && (
            <button className="flex items-center text-xs text-gray-600 font-medium hover:text-black">
              <Check className="w-3 h-3 mr-1" /> Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <div className="space-y-1">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                console.log('📋 ChatList: Item clicked:', item.id, item.name);
                onSelect?.(item.id);
              }}
              className={`w-full text-left flex items-start space-x-3 p-3 rounded-xl transition-colors hover:bg-gray-50`}
            >
              <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-[#fccb90] to-[#d57eeb] flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {item.name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <div className={`text-sm truncate ${item.unread ? "font-bold" : "font-medium text-gray-900"}`}>
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-400 ml-2 whitespace-nowrap">{item.time}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className={`text-sm truncate ${item.unread ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                    {item.last}
                  </div>
                  {item.unread && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></div>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {item.role} • {item.type}
                </div>
              </div>
            </button>
          ))}

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-sm">
                {searchTerm ? 'No conversations found' : 'No conversations yet'}
              </div>
              <div className="text-xs mt-1">
                {searchTerm ? 'Try a different search term' : 'Start a conversation with someone from your recipients list'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}