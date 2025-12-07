"use client";
import React, { useState } from "react";
import { Search, Phone, MoreVertical, Sidebar, Paperclip } from "lucide-react";

export default function ChatWindow({ selected }: { selected?: string | null }) {
  const [text, setText] = useState("");

  // Replicating the specific conversation from screenshot
  const messages = [
    { id: 1, side: "right", sender: "Marc Lester Sulit", text: "Pwede pachupa?" },
    { id: 2, side: "right", sender: "Marc Lester Sulit", text: "Ket saglit lang" },
    { id: 3, side: "left", sender: "Local Government Unit", text: "Sarap mo baby marc!" },
    { id: 4, side: "right", sender: "Marc Lester Sulit", text: "Pleeeasseee" },
    { id: 5, side: "right", sender: "Marc Lester Sulit", text: "send bobs nuds and etits" },
    { id: 6, side: "left", sender: "Local Government Unit", text: "send ka nga pic bby" },
    { id: 7, side: "right", sender: "Marc Lester Sulit", image: "/profile-sample.jpg" }, // Placeholder for image
    { id: 8, side: "left", sender: "Local Government Unit", text: "GAGO PAPWET" },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between border-b border-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Local Government Unit</h2>
        </div>
        <div className="flex items-center space-x-6 text-gray-400">
            <Search className="w-5 h-5 cursor-pointer hover:text-gray-600" />
            <Phone className="w-5 h-5 cursor-pointer hover:text-gray-600" />
            <Sidebar className="w-5 h-5 cursor-pointer hover:text-gray-600" />
            <MoreVertical className="w-5 h-5 cursor-pointer hover:text-gray-600" />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {messages.map((m, index) => {
          const isRight = m.side === "right";
          
          return (
            <div key={m.id} className={`flex w-full ${isRight ? "justify-end" : "justify-start"}`}>
               {/* Left Avatar */}
              {!isRight && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fccb90] to-[#d57eeb] mr-4 flex-shrink-0" />
              )}

              <div className={`max-w-[60%] flex flex-col ${isRight ? "items-end" : "items-start"}`}>
                 {/* Name always above message */}
                 <span className="text-xs text-gray-500 mb-1">
                    {m.sender}
                 </span>
                 
                 {/* Message Content - No Bubble, just text */}
                 {m.text && (
                    <div className={`text-[15px] leading-relaxed ${isRight ? "text-right" : "text-left"}`}>
                        {m.text}
                    </div>
                 )}
                 
                 {/* Image Content */}
                 {m.image && (
                     <div className="mt-2 w-64 h-40 bg-gray-200 rounded-2xl overflow-hidden relative">
                         {/* Using a placeholder div for the image to match the gray box in your code if image missing */}
                         <img 
                            src="https://images.unsplash.com/photo-1548142813-c348350df52b?ixlib=rb-1.2.1&auto=format&fit=crop&w=255&q=80" 
                            alt="Attached" 
                            className="w-full h-full object-cover"
                         /> 
                     </div>
                 )}
              </div>

              {/* Right Avatar */}
              {isRight && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fccb90] to-[#d57eeb] ml-4 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="p-8 pt-0">
        <div className="flex items-center space-x-4">
            <button className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition">
                <Paperclip className="w-5 h-5" />
            </button>
            <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Send your message here"
                className="flex-1 py-3 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none"
            />
        </div>
      </div>
    </div>
  );
}