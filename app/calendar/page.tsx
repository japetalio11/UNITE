"use client";

import CalendarPage from "@/app/dashboard/calendar/page";
import { Navbar } from "@/components/navbar";

export default function PublicCalendar() {
  // Render the landing Navbar and embed the dashboard calendar.
  // Hide the dashboard Topbar via a scoped rule so public view shows the landing top bar.
  return (
    <>
      <Navbar />

      <div className="public-calendar-root">
        <style>{`
          /* Hide the dashboard Topbar when embedded on the public calendar */
          .public-calendar-root .w-full.bg-white.border-default{ display:none !important; }

          /* Center and constrain the calendar to match the navbar content width
             Provide the horizontal padding here so inner px-6 paddings can be removed
             and the Calendar header aligns exactly with the logo / sign-up button edges. */
          .public-calendar-root > .calendar-inner{
            max-width: 1280px;
            margin: 0 auto;
            padding-left: 32px;
            padding-right: 32px;
          }

          /* Remove internal horizontal padding from calendar sections so the
             calendar's own px-6 doesn't shift the content inward. The outer
             .calendar-inner provides the horizontal alignment instead. */
          .public-calendar-root .px-6{ padding-left: 0 !important; padding-right: 0 !important; }

          /* Tighten top/bottom spacing of the calendar header for visual balance */
          .public-calendar-root .pt-6{ padding-top: 1rem !important; }
          .public-calendar-root .pb-4{ padding-bottom: 1rem !important; }
        `}</style>

        <div className="calendar-inner">
          <CalendarPage publicTitle="Public Calendar" />
        </div>
      </div>
    </>
  );
}
