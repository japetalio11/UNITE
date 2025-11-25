import React from "react";
import { Layout, Grid } from "lucide-react";

interface CalendarToolbarProps {
  activeView: string;
  currentDate: Date;
  onViewChange: (view: string) => void;
  onNavigate: (direction: "prev" | "next") => void;
  onToday: () => void;
}

export default function CalendarToolbar({
  activeView,
  currentDate,
  onViewChange,
  onNavigate,
  onToday,
}: CalendarToolbarProps) {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    return `${month} ${day}, ${year}`;
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Week/Month Toggle and Date Navigation */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* Week/Month Toggle */}
          <div className="relative bg-gray-100 rounded-lg p-1 border border-gray-300">
            <div
              className={`absolute top-1 bottom-1 bg-white rounded-md shadow-sm transition-all duration-300 ease-in-out ${
                activeView === "week" ? "left-1 right-1/2" : "left-1/2 right-1"
              }`}
            />

            <div className="relative flex">
              <button
                className={`relative px-4 py-2 text-sm font-medium flex items-center transition-colors duration-300 z-10 ${
                  activeView === "week"
                    ? "text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => onViewChange("week")}
              >
                <Layout className="h-4 w-4 mr-2" />
                Week
              </button>
              <button
                className={`relative px-4 py-2 text-sm font-medium flex items-center transition-colors duration-300 z-10 ${
                  activeView === "month"
                    ? "text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => onViewChange("month")}
              >
                <Grid className="h-4 w-4 mr-2" />
                Month
              </button>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center bg-gray-100 rounded-lg border border-gray-300 px-3 py-1">
            <button
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors duration-200"
              onClick={() => onNavigate("prev")}
            >
              <svg
                fill="none"
                height="16"
                viewBox="0 0 24 24"
                width="16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>

            <button
              className="mx-2 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors duration-200"
              onClick={onToday}
            >
              Today
            </button>

            <button
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors duration-200"
              onClick={() => onNavigate("next")}
            >
              <svg
                fill="none"
                height="16"
                viewBox="0 0 24 24"
                width="16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </div>

          {/* Current Date Display */}
          <div className="text-lg font-semibold text-gray-800">
            {formatDate(currentDate)}
          </div>
        </div>

        {/* Filter Button */}
        <div className="flex items-center space-x-2">
          <button className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            Filter
          </button>
          <button className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-200">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
