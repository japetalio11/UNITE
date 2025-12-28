"use client";
import React, { useState, useEffect, useRef } from "react";
import { Search, Phone, MoreVertical, Sidebar, Paperclip, Send, ArrowLeft } from "lucide-react";
import fetchWithAuth from '@/utils/fetchWithAuth';
import { useChat } from "@/contexts/ChatContext";
import { canSendMessage } from "@/services/chatService";

interface ChatWindowProps {
  selected?: string | null;
  onBack?: () => void;
  showBackButton?: boolean;
}

export default function ChatWindow({ selected, onBack, showBackButton = false }: ChatWindowProps) {
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

  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ filename: string; url: string; key?: string; mime?: string; size?: number }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle conversation selection when selected prop changes
  useEffect(() => {
    if (selected) {
      selectConversation(selected);
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
    if (!selectedConversation || !currentUser) return;

    const otherParticipant = selectedConversation.participants.find(p => p.userId !== currentUser.id);
    if (!otherParticipant) return;

    // If there are pending attachments, send them even if text is empty
    if (!text.trim() && pendingAttachments.length === 0) return;

    const messageType = pendingAttachments.length > 0
      ? (pendingAttachments[0].mime && pendingAttachments[0].mime.startsWith('image/') ? 'image' : 'file')
      : 'text';

    if (pendingAttachments.length > 0) {
      // Use server endpoint to persist and emit the message reliably
      try {
        await fetchWithAuth('/api/files/attach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiverId: otherParticipant.userId, content: text.trim(), messageType, attachments: pendingAttachments })
        });
      } catch (err) {
        // fallback to socket emit
        await sendMessage(otherParticipant.userId, text.trim(), messageType, pendingAttachments);
      }
    } else {
      await sendMessage(otherParticipant.userId, text.trim(), messageType, pendingAttachments);
    }

    // Clear input and pending attachments
    setText("");
    setPendingAttachments([]);

    if (isTyping) {
      setIsTyping(false);
      stopTyping(otherParticipant.userId);
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
    if (!selectedConversation || !currentUser) {
      return { name: "Select a conversation", role: "", type: "" };
    }

    const otherParticipant = selectedConversation.participants.find(p =>
      p.userId !== currentUser.id
    );

    if (otherParticipant?.details) {
      return {
        name: otherParticipant.details.name,
        role: otherParticipant.details.role,
        type: otherParticipant.details.type
      };
    }

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
      {/* Header - Mobile-friendly with back button */}
      <div className="px-4 sm:px-8 py-3 sm:py-5 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Back button on mobile */}
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation flex-shrink-0"
              aria-label="Back to chat list"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{conversationInfo.name}</h2>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {conversationInfo.role} • {conversationInfo.type}
              {!isConnected && " • Disconnected"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 sm:space-x-6 text-gray-400 flex-shrink-0">
          <Search className="w-5 h-5 cursor-pointer hover:text-gray-600 hidden sm:block" />
          <Phone className="w-5 h-5 cursor-pointer hover:text-gray-600 hidden sm:block" />
          <Sidebar className="w-5 h-5 cursor-pointer hover:text-gray-600 hidden sm:block" />
          <MoreVertical className="w-5 h-5 cursor-pointer hover:text-gray-600" />
        </div>
      </div>

      {/* Messages Area - Mobile optimized */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6">
        {messages.map((message) => {
          const isCurrentUser = message.senderId === currentUser?.id;

          return (
            <div key={message.messageId} className={`flex w-full ${isCurrentUser ? "justify-end" : "justify-start"} gap-2 sm:gap-4`}>
              {/* Avatar for received messages */}
              {!isCurrentUser && (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#fccb90] to-[#d57eeb] flex-shrink-0 flex items-center justify-center">
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    {message.senderDetails?.name.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}

              <div className={`max-w-[80%] sm:max-w-[75%] md:max-w-[60%] flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
                {/* Sender name for received messages - hidden on mobile for cleaner look */}
                {!isCurrentUser && (
                  <span className="text-xs text-gray-500 mb-1 hidden sm:block">
                    {message.senderDetails?.name || 'Unknown'}
                  </span>
                )}

                {/* Message Content - Facebook Messenger style bubbles */}
                <div className={`text-sm sm:text-[15px] leading-relaxed px-3 py-2 rounded-2xl ${
                  isCurrentUser 
                    ? "bg-blue-500 text-white rounded-tr-sm" 
                    : "bg-gray-100 text-gray-900 rounded-tl-sm"
                }`}>
                  {message.content}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((att, i) => (
                        <div key={i} className="mt-2">
                          {att.mime && att.mime.startsWith('image/') ? (
                            <img src={att.url} alt={att.filename} className="max-w-full rounded-md" />
                          ) : (
                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
                              <div className="flex-1 truncate">
                                <div className="text-sm font-medium text-gray-900 truncate">{att.filename}</div>
                                <div className="text-xs text-gray-500">{att.mime || 'file'} • {att.size ? `${Math.round(att.size/1024)} KB` : ''}</div>
                              </div>
                              <div className="text-xs text-blue-600">Open</div>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamp and status */}
                <div className="flex items-center mt-1 space-x-1">
                  <span className="text-[10px] sm:text-xs text-gray-400">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {isCurrentUser && (
                    <span className="text-[10px] sm:text-xs text-gray-400">
                      {message.status === 'sent' && '✓'}
                      {message.status === 'delivered' && '✓✓'}
                      {message.status === 'read' && '✓✓'}
                    </span>
                  )}
                </div>
              </div>

              {/* Avatar for sent messages */}
              {isCurrentUser && (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#fccb90] to-[#d57eeb] flex-shrink-0 flex items-center justify-center">
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    {currentUser?.name.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator - Mobile optimized */}
        {typingIndicator && (
          <div className="flex w-full justify-start gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#fccb90] to-[#d57eeb] flex-shrink-0" />
            <div className="max-w-[80%] sm:max-w-[75%] md:max-w-[60%] flex flex-col items-start">
              <span className="text-xs text-gray-500 mb-1 hidden sm:block">
                {conversationInfo.name}
              </span>
              <div className="text-sm sm:text-[15px] text-gray-500 italic px-3 py-2 bg-gray-100 rounded-2xl rounded-tl-sm">
                {typingIndicator}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Mobile optimized */}
      <div className="p-4 sm:p-8 pt-0 border-t border-gray-50">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition touch-manipulation flex-shrink-0">
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !selectedConversation || !currentUser) return;

              // Basic validation
              const MAX_SIZE = 10 * 1024 * 1024; // 10MB
              const allowedTypes = [
                'image/',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
              ];

                if (file.size > MAX_SIZE) {
                alert('File too large. Max 10MB');
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
              }

              const isAllowed = allowedTypes.some(t => file.type.startsWith(t) || file.type === t);
                if (!isAllowed && !file.type.startsWith('image/')) {
                if (!confirm('File type is uncommon. Continue?')) {
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  return;
                }
              }

              try {
                setUploading(true);
                setUploadProgress(0);

                const body = { filename: file.name, contentType: file.type };
                const presignRes = await fetchWithAuth(`/api/files/presign`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body)
                });

                if (!presignRes.ok) throw new Error('Failed to get presigned URL');
                const presignJson = await presignRes.json();
                const { uploadUrl, key, publicUrl } = presignJson.data || presignJson;
                if (!uploadUrl) throw new Error('Presign response missing uploadUrl');

                // Upload using XHR to track progress
                await new Promise<void>((resolve, reject) => {
                  const xhr = new XMLHttpRequest();
                  xhr.open('PUT', uploadUrl, true);
                  xhr.setRequestHeader('Content-Type', file.type);

                  xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                      const percent = Math.round((event.loaded / event.total) * 100);
                      setUploadProgress(percent);
                    }
                  };

                  xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                      setUploadProgress(100);
                      resolve();
                    } else {
                      reject(new Error('Upload to S3 failed'));
                    }
                  };

                  xhr.onerror = () => reject(new Error('Network error during upload'));

                  xhr.send(file);
                });

                const attachment = {
                  filename: file.name,
                  url: publicUrl || `https://${process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).host : window.location.host}/${key}`,
                  key,
                  mime: file.type,
                  size: file.size
                };

                const otherParticipant = selectedConversation.participants.find(p => p.userId !== currentUser.id);
                if (!otherParticipant) return;

                // Add uploaded file to pending attachments so user can send with message
                setPendingAttachments(prev => [...prev, attachment]);

              } catch (err: any) {
                console.error(err);
                alert(err?.message || 'Upload failed');
              } finally {
                setUploading(false);
                setUploadProgress(0);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}
          />
          <div className="flex-1 relative">
            <div>
              {pendingAttachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {pendingAttachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
                      {att.mime && att.mime.startsWith('image/') ? (
                        <img src={att.url} alt={att.filename} className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center bg-white border rounded text-xs">File</div>
                      )}
                      <div className="text-xs">
                        <div className="font-medium truncate max-w-[140px]">{att.filename}</div>
                        <div className="text-gray-500">{att.size ? `${Math.round(att.size/1024)} KB` : ''}</div>
                      </div>
                      <button onClick={() => setPendingAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 text-sm">Remove</button>
                    </div>
                  ))}
                </div>
              )}
              <input
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Send your message here..."
                className="w-full py-2.5 sm:py-3 pr-16 sm:pr-20 bg-gray-50 rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 touch-manipulation"
                disabled={!isConnected}
              />
              <button
                onClick={handleSendMessage}
                disabled={(!text.trim() && pendingAttachments.length === 0) || !isConnected || !canSendMessage(currentUser?.authority)}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 active:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
        {uploading && (
          <div className="mt-2 px-1">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-500 h-2" style={{ width: `${uploadProgress}%` }} />
            </div>
            <div className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress}%</div>
          </div>
        )}
        {!isConnected && (
          <p className="text-xs text-red-500 mt-2 px-1">Disconnected - messages will be sent when reconnected</p>
        )}
      </div>
    </div>
  );
}