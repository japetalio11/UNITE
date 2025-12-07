"use client";
import React from "react";
import { Paperclip, Link as LinkIcon } from "lucide-react";

export default function ChatDetails() {
  return (
    <div className="h-full flex flex-col bg-white p-8 overflow-y-auto">
      <h3 className="text-xl font-bold mb-8">Chat Details</h3>

      {/* Photos Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
                <span className="text-base font-medium">Photos and Videos</span>
                <span className="text-gray-400 text-sm">104</span>
            </div>
            <button className="text-xs text-gray-500 hover:text-black underline">See all</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="aspect-square bg-gray-200 rounded-lg" />
          <div className="aspect-square bg-gray-200 rounded-lg" />
          <div className="aspect-square bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Shared Files */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
                <span className="text-base font-medium">Shared Files</span>
                <span className="text-gray-400 text-sm">104</span>
            </div>
            <button className="text-xs text-gray-500 hover:text-black underline">See all</button>
        </div>
        <div className="space-y-3">
            <div className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Paperclip className="w-4 h-4 text-gray-600" />
                </div>
                <div className="text-xs font-medium text-gray-700 line-clamp-2 leading-relaxed">
                    Contract for the Provision of the Marc Lester Pedo Club
                </div>
            </div>
        </div>
      </div>

      {/* Shared Links */}
      <div>
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
                <span className="text-base font-medium">Shared Link</span>
                <span className="text-gray-400 text-sm">104</span>
            </div>
            <button className="text-xs text-gray-500 hover:text-black underline">See all</button>
        </div>
        <div className="space-y-3">
            <div className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <LinkIcon className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                    <div className="text-xs font-bold text-gray-900">RA 67</div>
                    <div className="text-[10px] text-gray-400 break-all leading-tight mt-0.5">
                        https://tenor.com/view/two-black-people-gif-27160499
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}