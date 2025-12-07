"use client";
import React, { useState, useEffect, useRef } from "react";
import { Search, Phone, MoreVertical, Sidebar, Paperclip, Send } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";

export default function ChatWindow({ selected }: { selected?: string | null }) {
  console.log('🗣️ ChatWindow: Rendered with selected:', selected);

  const {
    messages,
    selectedConversation,
    currentUser,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    typingUsers,
    isConnected,
    selectConversation
  } = useChat();

  console.log('🗣️ ChatWindow: Context values - messages:', messages?.length || 0, 'selectedConversation:', selectedConversation, 'currentUser:', currentUser, 'isConnected:', isConnected);

  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle conversation selection when selected prop changes
  useEffect(() => {
    console.log('🗣️ ChatWindow: selected prop changed:', selected);
    if (selected) {
      console.log('🗣️ ChatWindow: Calling selectConversation with:', selected);
      selectConversation(selected);
    } else {
      console.log('🗣️ ChatWindow: No selection, clearing conversation');
      // Clear selection if selected is null
    }
  }, [selected, selectConversation]);

  // Handle typing indicator
  const handleTextChange = (value: string) => {
    setText(value);

    if (selectedConversation && currentUser) {
      const otherParticipant = selectedConversation.participants.find(p =>
        p.userId !== currentUser.id
      );

      if (otherParticipant) {
        if (!isTyping && value.trim()) {
          setIsTyping(true);
          startTyping(otherParticipant.userId);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          stopTyping(otherParticipant.userId);
        }, 1000);
      }
    }
  };

  // Handle sending message
  const handleSendMessage = async () => {
    console.log('📤 ChatWindow: handleSendMessage called');
    console.log('📤 ChatWindow: text:', text, 'selectedConversation:', !!selectedConversation, 'currentUser:', !!currentUser);

    if (!text.trim() || !selectedConversation || !currentUser) {
      console.log('📤 ChatWindow: Cannot send - missing requirements');
      return;
    }

    const otherParticipant = selectedConversation.participants.find(p =>
      p.userId !== currentUser.id
    );

    console.log('📤 ChatWindow: Other participant:', otherParticipant);

    if (otherParticipant) {
      console.log('📤 ChatWindow: Sending message to:', otherParticipant.userId);
      await sendMessage(otherParticipant.userId, text.trim());
      setText("");

      // Stop typing if we were typing
      if (isTyping) {
        setIsTyping(false);
        stopTyping(otherParticipant.userId);
      }
    } else {
      console.log('📤 ChatWindow: No other participant found');
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mark messages as read when conversation is viewed
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const unreadMessages = messages.filter(msg =>
        msg.receiverId === currentUser?.id &&
        msg.status !== 'read'
      );

      unreadMessages.forEach(msg => {
        markAsRead(msg.messageId);
      });
    }
  }, [selectedConversation, messages, currentUser, markAsRead]);

  // Get conversation display info
  const getConversationInfo = () => {
    console.log('🗣️ ChatWindow: getConversationInfo - selectedConversation:', selectedConversation, 'currentUser:', currentUser);

    if (!selectedConversation || !currentUser) {
      console.log('🗣️ ChatWindow: No conversation or user selected');
      return { name: "Select a conversation", role: "", type: "" };
    }

    const otherParticipant = selectedConversation.participants.find(p =>
      p.userId !== currentUser.id
    );

    console.log('🗣️ ChatWindow: Other participant:', otherParticipant);

    if (otherParticipant?.details) {
      const info = {
        name: otherParticipant.details.name,
        role: otherParticipant.details.role,
        type: otherParticipant.details.type
      };
      console.log('🗣️ ChatWindow: Conversation info:', info);
      return info;
    }

    console.log('🗣️ ChatWindow: No participant details found');
    return { name: "Unknown User", role: "", type: "" };
  };

  const conversationInfo = getConversationInfo();

  // Get typing indicator
  const getTypingIndicator = () => {
    if (!selectedConversation || !currentUser) return null;

    const otherParticipant = selectedConversation.participants.find(p =>
      p.userId !== currentUser.id
    );

    if (otherParticipant && typingUsers.has(otherParticipant.userId)) {
      return `${conversationInfo.name} is typing...`;
    }

    return null;
  };

  const typingIndicator = getTypingIndicator();

  if (!selected) {
    return (
      <div className="h-full flex flex-col bg-white items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
          <p className="text-gray-500 text-sm">Choose someone from the list to start chatting</p>
          {!isConnected && (
            <p className="text-red-500 text-xs mt-2">Disconnected from chat server</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between border-b border-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{conversationInfo.name}</h2>
          <p className="text-sm text-gray-500">
            {conversationInfo.role} • {conversationInfo.type}
            {!isConnected && " • Disconnected"}
          </p>
        </div>
        <div className="flex items-center space-x-6 text-gray-400">
          <Search className="w-5 h-5 cursor-pointer hover:text-gray-600" />
          <Phone className="w-5 h-5 cursor-pointer hover:text-gray-600" />
          <Sidebar className="w-5 h-5 cursor-pointer hover:text-gray-600" />
          <MoreVertical className="w-5 h-5 cursor-pointer hover:text-gray-600" />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.map((message) => {
          const isCurrentUser = message.senderId === currentUser?.id;

          return (
            <div key={message.messageId} className={`flex w-full ${isCurrentUser ? "justify-end" : "justify-start"}`}>
              {/* Avatar for received messages */}
              {!isCurrentUser && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fccb90] to-[#d57eeb] mr-4 flex-shrink-0 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {message.senderDetails?.name.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}

              <div className={`max-w-[60%] flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
                {/* Sender name for received messages */}
                {!isCurrentUser && (
                  <span className="text-xs text-gray-500 mb-1">
                    {message.senderDetails?.name || 'Unknown'}
                  </span>
                )}

                {/* Message Content */}
                <div className={`text-[15px] leading-relaxed ${isCurrentUser ? "text-right" : "text-left"}`}>
                  {message.content}
                </div>

                {/* Timestamp and status */}
                <div className="flex items-center mt-1 space-x-1">
                  <span className="text-xs text-gray-400">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs text-gray-400">
                      {message.status === 'sent' && '✓'}
                      {message.status === 'delivered' && '✓✓'}
                      {message.status === 'read' && '✓✓'}
                    </span>
                  )}
                </div>
              </div>

              {/* Avatar for sent messages */}
              {isCurrentUser && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fccb90] to-[#d57eeb] ml-4 flex-shrink-0 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {currentUser?.name.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingIndicator && (
          <div className="flex w-full justify-start">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fccb90] to-[#d57eeb] mr-4 flex-shrink-0" />
            <div className="max-w-[60%] flex flex-col items-start">
              <span className="text-xs text-gray-500 mb-1">
                {conversationInfo.name}
              </span>
              <div className="text-[15px] text-gray-500 italic">
                {typingIndicator}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-8 pt-0">
        <div className="flex items-center space-x-4">
          <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <input
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Send your message here..."
              className="w-full py-3 pr-12 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none"
              disabled={!isConnected}
            />
            <button
              onClick={handleSendMessage}
              disabled={!text.trim() || !isConnected}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        {!isConnected && (
          <p className="text-xs text-red-500 mt-2">Disconnected - messages will be sent when reconnected</p>
        )}
      </div>
    </div>
  );
}