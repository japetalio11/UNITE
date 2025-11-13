"use client";

import React, { useEffect, useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { DatePicker } from "@heroui/date-picker";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [maxBagsPerDay, setMaxBagsPerDay] = useState<number | string>(200);
  const [maxEventsPerDay, setMaxEventsPerDay] = useState<number | string>(5);
  const [maxPendingRequests, setMaxPendingRequests] = useState<number | string>(10);
  const [minDaysAdvance, setMinDaysAdvance] = useState<number | string>(1);

  // recurring blocked weekdays: 0=Sun .. 6=Sat
  const [blockedWeekdays, setBlockedWeekdays] = useState<boolean[]>([false, false, false, false, false, false, false]);
  // specific blocked dates (ISO yyyy-mm-dd strings)
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  // use DatePicker value for selecting a date to add
  const [datePickerValue, setDatePickerValue] = useState<any>(null);

  // Save confirmation modal state
  const [savedModalOpen, setSavedModalOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [isSysAdmin, setIsSysAdmin] = useState(false);

  const handleLogout = () => {
    (async () => {
      // Try to call backend logout endpoint if available
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
        const url = base ? `${base}/api/auth/logout` : `/api/auth/logout`;
        // send token if present
        const token = typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('accessToken'));
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // include credentials to allow cookie-based logout on server
        await fetch(url, { method: 'POST', headers, credentials: 'include' }).catch(() => null);
      } catch (e) {
        // ignore backend failures (still proceed to clear client state)
      }

      // Clear client-side auth state
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        localStorage.removeItem('hospitalId');
        // remove common keys used by other parts of the app
        localStorage.removeItem('unite_settings');
        try {
          if (typeof document !== 'undefined') {
            document.cookie = 'unite_user=; Max-Age=0; path=/';
            // Try clearing common auth cookie names
            document.cookie = 'connect.sid=; Max-Age=0; path=/';
          }
        } catch (e) {}
      } catch (e) {}

      // notify other components in the page (sidebar listens for unite:auth-changed)
      try {
        window.dispatchEvent(new CustomEvent('unite:auth-changed', { detail: null }));
      } catch (e) {}

      // Redirect to landing page
      router.push('/');
    })();
  };

  const handleSave = () => {
    // Attempt to persist settings to backend. Fallback to localStorage on failure.
    (async () => {
      const payload = {
        notificationsEnabled,
        maxEventsPerDay: Number(maxEventsPerDay) || 0,
        maxPendingRequests: Number(maxPendingRequests) || 0,
        advanceBookingDays: Number(minDaysAdvance) || 0,
        blockedWeekdays,
        blockedDates,
        maxBloodBagsPerDay: Number(maxBagsPerDay) || 0,
      };

      const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const url = base ? `${base}/api/settings` : `/api/settings`;

      // include credentials to support cookie-based auth; attach bearer if token present
      const token = typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('accessToken'));
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), credentials: 'include' });
        if (res.ok) {
          // save a local copy too so frontend has immediate access
          localStorage.setItem('unite_settings', JSON.stringify(payload));
          setSavedMessage('Settings saved');
          setSavedModalOpen(true);
          return;
        }
        // if server responds with an error, try to show message
        const text = await (res.text().catch(() => null));
        try { localStorage.setItem('unite_settings', JSON.stringify(payload)); } catch (e) {}
        setSavedMessage(`Saved locally (server responded ${res.status}${text ? ': ' + text : ''})`);
        setSavedModalOpen(true);
        return;
      } catch (e) {
        // network failure - fallback to local save and show modal
        try {
          localStorage.setItem('unite_settings', JSON.stringify(payload));
        } catch (ee) {}
        setSavedMessage('Settings saved locally (server unavailable)');
        setSavedModalOpen(true);
      }
    })();
  };

  // Load existing settings from localStorage on mount
  useEffect(() => {
    // Determine whether current client is sys admin (UI permissions)
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('unite_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          const role = parsed?.role || parsed?.staff_type || null;
          const isAdminFlag = parsed?.isAdmin || (typeof role === 'string' && role.toLowerCase().includes('admin')) || false;
          setIsSysAdmin(!!isAdminFlag);
        } else {
          setIsSysAdmin(false);
        }
      }
    } catch (e) {
      setIsSysAdmin(false);
    }

    // First try to fetch from server (server is source-of-truth). If that fails, fall back to localStorage.
    (async () => {
      const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const url = base ? `${base}/api/settings` : `/api/settings`;
      const token = typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('accessToken'));
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const res = await fetch(url, { method: 'GET', headers, credentials: 'include' });
        if (res.ok) {
          const body = await res.json();
          if (body && body.success && body.data) {
            const parsed = body.data;
            if (typeof parsed.notificationsEnabled !== 'undefined') setNotificationsEnabled(Boolean(parsed.notificationsEnabled));
            if (typeof parsed.maxEventsPerDay !== 'undefined') setMaxEventsPerDay(parsed.maxEventsPerDay);
            if (typeof parsed.maxBloodBagsPerDay !== 'undefined') setMaxBagsPerDay(parsed.maxBloodBagsPerDay);
            if (typeof parsed.maxPendingRequests !== 'undefined') setMaxPendingRequests(parsed.maxPendingRequests);
            if (typeof parsed.advanceBookingDays !== 'undefined') setMinDaysAdvance(parsed.advanceBookingDays);
            if (Array.isArray(parsed.blockedWeekdays) && parsed.blockedWeekdays.length === 7) setBlockedWeekdays(parsed.blockedWeekdays);
            if (Array.isArray(parsed.blockedDates)) setBlockedDates(parsed.blockedDates.map(String));
            // Save a local copy for offline fallback
            try { localStorage.setItem('unite_settings', JSON.stringify(parsed)); } catch (e) {}
            return;
          }
        }
      } catch (e) {
        // ignore fetch errors and fallback to localStorage
      }

      // Fallback: read from localStorage
      try {
        const raw = localStorage.getItem('unite_settings');
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (typeof parsed.notificationsEnabled !== 'undefined') setNotificationsEnabled(Boolean(parsed.notificationsEnabled));
        if (parsed.maxEventsPerDay) setMaxEventsPerDay(parsed.maxEventsPerDay);
        if (parsed.maxBagsPerDay) setMaxBagsPerDay(parsed.maxBagsPerDay);
        if (parsed.maxPendingRequests) setMaxPendingRequests(parsed.maxPendingRequests);
        if (parsed.minDaysAdvance) setMinDaysAdvance(parsed.minDaysAdvance);
        if (Array.isArray(parsed.blockedWeekdays) && parsed.blockedWeekdays.length === 7) setBlockedWeekdays(parsed.blockedWeekdays);
        if (Array.isArray(parsed.blockedDates)) setBlockedDates(parsed.blockedDates.map(String));
      } catch (e) {
        // ignore malformed settings
      }
    })();
  }, []);

  const toggleWeekday = (idx: number) => {
    setBlockedWeekdays(prev => {
      const copy = [...prev];
      copy[idx] = !copy[idx];
      return copy;
    });
  }

  const addBlockedDate = () => {
    if (!datePickerValue) return;
    const d = new Date(datePickerValue);
    d.setHours(0,0,0,0);
    const iso = d.toISOString().slice(0,10);
    setBlockedDates(prev => Array.from(new Set([...prev, iso])));
    setDatePickerValue(null);
  }

  const removeBlockedDate = (iso: string) => setBlockedDates(prev => prev.filter(d => d !== iso));

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-[1100px] mx-auto bg-transparent">
        {/* Modal-like container */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex">
          {/* Left nav */}
          <aside className="w-60 border-r border-gray-200 p-6">
            <div className="text-sm text-gray-500 mb-4">Options</div>
            <nav className="space-y-1">
              <button
                className="w-full text-left px-3 py-2 rounded-md bg-gray-50 border border-transparent text-sm font-medium text-gray-900 flex items-center justify-between"
                aria-current="page"
              >
                <span>General</span>
              </button>
              {/* Add other option rows as needed */}
            </nav>
          </aside>

          {/* Right content */}
          <main className="flex-1 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">App</h2>
                <p className="text-sm text-gray-500">Application settings and preferences</p>
              </div>

              <div className="flex items-center gap-3">
                {isSysAdmin && (
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                  >
                    Save
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
                >
                  Log out
                </button>
              </div>
            </div>

            {isSysAdmin ? (
              <div className="mt-6 space-y-6">
                {/* Notifications toggle */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[68%]">
                    <h3 className="text-sm font-medium">Notifications</h3>
                    <p className="text-xs text-gray-500">Enable or disable application notifications for event updates, booking confirmations, reminders, and system messages sent to coordinators and staff.</p>
                  </div>
                  <div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={notificationsEnabled}
                        onChange={(e) => setNotificationsEnabled(e.target.checked)}
                      />
                      <span className={`relative inline-block w-10 h-6 rounded-full transition-colors duration-200 ${notificationsEnabled ? 'bg-black' : 'bg-gray-300'}`}>
                        <span className={`absolute top-1/2 -translate-y-1/2 ${notificationsEnabled ? 'left-5' : 'left-1'} w-4 h-4 bg-white rounded-full transition-all`} />
                      </span>
                    </label>
                  </div>
                </div>

                {/* Numeric settings */}
                <div className="space-y-4">
                  

                  <div className="flex items-start justify-between">
                    <div className="max-w-[68%]">
                      <h4 className="text-sm font-medium">Maximum blood bags per day</h4>
                      <p className="text-xs text-gray-500">The maximum number of blood bags the facility can process or accept in a single day. Use this to limit requests and help manage inventory and staffing capacity.</p>
                    </div>
                    <div className="w-48">
                      <input
                        type="number"
                        className="w-full rounded-md border border-gray-200 px-3 py-2 shadow-sm text-sm"
                        value={maxBagsPerDay}
                        onChange={(e) => setMaxBagsPerDay(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <div className="max-w-[68%]">
                      <h4 className="text-sm font-medium">Maximum events per day</h4>
                      <p className="text-xs text-gray-500">The maximum number of separate events that can be created or scheduled for a single day.</p>
                    </div>
                    <div className="w-48">
                      <input
                        type="number"
                        className="w-full rounded-md border border-gray-200 px-3 py-2 shadow-sm text-sm"
                        value={maxEventsPerDay}
                        onChange={(e) => setMaxEventsPerDay(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="max-w-[68%]">
                      <h4 className="text-sm font-medium">Maximum pending requests allowed</h4>
                      <p className="text-xs text-gray-500">Maximum number of pending requests a user can have at any one time before further requests are blocked.</p>
                    </div>
                    <div className="w-48">
                      <input
                        type="number"
                        className="w-full rounded-md border border-gray-200 px-3 py-2 shadow-sm text-sm"
                        value={maxPendingRequests}
                        onChange={(e) => setMaxPendingRequests(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="max-w-[68%]">
                      <h4 className="text-sm font-medium">Minimum days in advance for a request</h4>
                      <p className="text-xs text-gray-500">How many days before an event a request must be made. Use 0 to allow same-day requests.</p>
                    </div>
                    <div className="w-48">
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 shadow-sm text-sm"
                        value={minDaysAdvance}
                        onChange={(e) => setMinDaysAdvance(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium">Permanently blocked weekdays</h4>
                    <p className="text-xs text-gray-500 mb-2">Select weekdays that should never be available for requests (recurring weekly blocks).</p>
                    <div className="flex gap-2 flex-wrap">
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, idx) => (
                        <label key={d} className={`inline-flex items-center gap-2 px-2 py-1 rounded border ${blockedWeekdays[idx] ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'}`}>
                          <input type="checkbox" checked={blockedWeekdays[idx]} onChange={() => toggleWeekday(idx)} />
                          <span className="text-sm">{d}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium">Specific blocked dates</h4>
                    <p className="text-xs text-gray-500 mb-2">Add specific calendar dates that should be blocked from requests (one-off dates).</p>
                    <div className="flex items-center gap-2">
                      <div className="w-[220px]">
                        <DatePicker
                          value={datePickerValue}
                          onChange={setDatePickerValue}
                          granularity="day"
                          hideTimeZone
                          variant="bordered"
                          classNames={{ base: "w-full", inputWrapper: "border-default-200 hover:border-default-400 h-10", input: "text-sm" }}
                        />
                      </div>
                      <button type="button" onClick={addBlockedDate} className="px-3 py-1.5 rounded-md bg-gray-800 text-white text-sm">Add</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {blockedDates.map(d => (
                        <div key={d} className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm flex items-center gap-2">
                          <span>{d}</span>
                          <button type="button" onClick={() => removeBlockedDate(d)} className="text-red-500 text-xs">Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-sm text-gray-600">You do not have permission to view or edit settings. If you believe this is an error, contact a system administrator. Use the Log out button to sign out.</p>
              </div>
            )}
          </main>
          {/* Save confirmation modal */}
          <Modal isOpen={savedModalOpen} onClose={() => setSavedModalOpen(false)} size="md" placement="center">
            <ModalContent>
              <ModalHeader>
                <h3 className="text-lg font-medium">Settings</h3>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-gray-700">{savedMessage}</p>
              </ModalBody>
              <ModalFooter>
                <Button onPress={() => setSavedModalOpen(false)} variant="bordered">OK</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </div>
      </div>
    </div>
  );
}
