"use client";
import React from "react";
import { Search, Check } from "lucide-react";

type Item = {
  id: string;
  name: string;
  last: string;
  time: string;
  unread?: boolean;
  active?: boolean;
};

const sample: Item[] = [
  { id: "1", name: "Local Government Unit", last: "Are you available this afternoon?", time: "14:12", active: true },
  { id: "2", name: "Local Government Unit", last: "You: The thing is when the governor of...", time: "14:12" },
  { id: "3", name: "Local Government Unit", last: "Despite of this, we shall proceed.", time: "14:12" },
];

export default function ChatList({ onSelect }: { onSelect?: (id: string) => void }) {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-5 pb-0">
        <h1 className="text-2xl font-bold mb-6">Chat</h1>
        
        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-200"
            placeholder="Search people..."
          />
        </div>

        <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                <button className="px-4 py-1.5 bg-white text-xs font-semibold rounded-md shadow-sm">All (3)</button>
                <button className="px-4 py-1.5 text-gray-500 text-xs font-medium hover:bg-gray-200 rounded-md transition">Unread (1)</button>
            </div>
            <button className="flex items-center text-xs text-gray-600 font-medium hover:text-black">
                <Check className="w-3 h-3 mr-1" /> Mark all as read
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <div className="space-y-1">
          {sample.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect?.(s.id)}
              className={`w-full text-left flex items-start space-x-3 p-3 rounded-xl transition-colors ${
                s.active ? "bg-gray-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-[#fccb90] to-[#d57eeb]" />
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <div className={`text-sm truncate ${s.unread ? "font-bold" : "font-medium text-gray-900"}`}>
                    {s.name}
                  </div>
                  <div className="text-xs text-gray-400 ml-2 whitespace-nowrap">{s.time}</div>
                </div>
                <div className={`text-sm truncate ${s.unread ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                  {s.last}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}