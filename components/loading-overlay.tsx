"use client";

import { useEffect, useState } from "react";
import { createContext, useContext } from "react";

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function LoadingOverlay() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-opacity duration-300">
      <div className="flex flex-col items-center space-y-6 p-8 bg-white bg-opacity-90 rounded-2xl shadow-2xl">
        {/* Enhanced Spinner Animation */}
        <div className="relative">
          <div className="w-20 h-20 border-4 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
          <div className="absolute inset-2 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin animation-delay-150"></div>
          <div className="absolute inset-4 w-12 h-12 border-4 border-transparent border-t-green-500 rounded-full animate-spin animation-delay-300"></div>
        </div>
        {/* Loading Text with Animation */}
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-800 animate-pulse">
            Initializing your dashboard...
          </p>
          <p className="text-sm text-gray-600 mt-2 animate-pulse animation-delay-200">
            Loading content and sidebar
          </p>
        </div>
      </div>
    </div>
  );
}