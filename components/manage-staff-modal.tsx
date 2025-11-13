"use client";
import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/utils/fetchWithAuth';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal';
import { Users, X } from 'lucide-react';
import { Spinner } from '@heroui/spinner';
import { Button } from '@heroui/button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // prefer requestId when available (campaign cards have it); otherwise eventId can be provided
  requestId?: string | null;
  eventId?: string | null;
  request?: any;
  onSaved?: () => void;
}

const API_BASE = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:3000';

export default function ManageStaffModal({ isOpen, onClose, requestId: propRequestId, eventId, request, onSaved }: Props) {
  const [staffMembers, setStaffMembers] = useState<Array<{ FullName: string; Role: string }>>([]);
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(propRequestId || null);

  useEffect(() => {
    setRequestId(propRequestId || null);
  }, [propRequestId]);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      try {
        setError(null);
        setLoading(true);

        // Determine requestId: prefer prop, then request object, then fetch from eventId
        let rid = propRequestId || null;
        if (!rid && request) {
          rid = request.Request_ID || request.RequestId || request._id || null;
        }

        if (!rid && eventId) {
          const res = await fetch(`${API_BASE}/api/events/${encodeURIComponent(eventId)}`, { credentials: 'include' });
          const body = await res.json();
          if (!res.ok) throw new Error(body.message || 'Failed to fetch event details');
          const data = body.data || body.event || body;
          rid = data?.request?.Request_ID || data?.Request_ID || data?.requestId || data?.request?.RequestId || null;
        }

        setRequestId(rid || null);

        if (rid) {
          const token = typeof window !== 'undefined' ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null;
          const headers: any = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const r = await fetch(`${API_BASE}/api/requests/${encodeURIComponent(rid)}`, { headers });
          const rb = await r.json();
          if (!r.ok) throw new Error(rb.message || 'Failed to fetch request details');
          const reqData = rb.data || rb.request || rb;
          const staff = reqData?.staff || [];
          if (mounted) {
            setStaffMembers(Array.isArray(staff) ? staff.map((s: any) => ({ FullName: s.FullName || s.Staff_FullName || s.Staff_Fullname || '', Role: s.Role || '' })) : []);
          }
        } else {
          if (mounted) setStaffMembers([]);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load staff');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [isOpen, propRequestId, eventId, request]);

  const addStaff = () => {
    if (!newFullName || !newRole) return setError('Name and role are required');
    setError(null);
    setStaffMembers([...staffMembers, { FullName: newFullName.trim(), Role: newRole.trim() }]);
    setNewFullName('');
    setNewRole('');
  };

  const removeStaff = (idx: number) => {
    setStaffMembers(staffMembers.filter((_, i) => i !== idx));
  };

  const save = async () => {
    const rid = requestId || (request && (request.Request_ID || request.RequestId || request._id)) || null;
    if (!rid) return setError('Request info not available');
    try {
      setSaving(true);
      setError(null);
      const rawUser = typeof window !== 'undefined' ? localStorage.getItem('unite_user') : null;
      const user = rawUser ? JSON.parse(rawUser as string) : null;
      const token = typeof window !== 'undefined' ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null;
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body: any = {
        adminId: user?.id || user?.Admin_ID || null,
        eventId: eventId || (request && (request.Event_ID || (request.event && request.event.Event_ID))) || null,
        staffMembers
      };

      let res;
      if (token) {
        res = await fetchWithAuth(`${API_BASE}/api/requests/${encodeURIComponent(rid)}/staff`, { method: 'POST', body: JSON.stringify(body) });
      } else {
        res = await fetch(`${API_BASE}/api/requests/${encodeURIComponent(rid)}/staff`, { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include' });
      }

      const resp = await res.json();
      if (!res.ok) throw new Error(resp.message || 'Failed to assign staff');

      if (onSaved) await onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" placement="center">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3 px-6 py-4 border-b border-default-200">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-default-100">
            <Users className="w-5 h-5 text-default-700" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-default-900">Add Staff</h2>
            <p className="text-sm text-default-500 font-normal">Start providing your information by selecting your blood type. Add details below to proceed.</p>
          </div>
        </ModalHeader>

        <ModalBody className="px-6 py-6">
          <div className="mb-6">
            <div className="grid grid-cols-12 gap-4 mb-6">
              <div className="col-span-5">
                <label className="block text-sm font-medium text-default-700 mb-2">
                  Name of Staff <span className="text-danger">*</span>
                </label>
                <input
                  value={newFullName}
                  onChange={(e) => setNewFullName((e.target as HTMLInputElement).value)}
                  placeholder="Enter name of staff"
                  className="w-full px-3 py-2 text-sm border border-default-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-default-400 focus:border-transparent bg-white"
                />
              </div>

              <div className="col-span-4">
                <label className="block text-sm font-medium text-default-700 mb-2">
                  Staff Role
                </label>
                <input
                  value={newRole}
                  onChange={(e) => setNewRole((e.target as HTMLInputElement).value)}
                  placeholder="Role"
                  className="w-full px-3 py-2 text-sm border border-default-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-default-400 focus:border-transparent bg-white"
                />
              </div>

              <div className="col-span-3 flex items-end">
                <button
                  onClick={addStaff}
                  className="w-full px-4 py-2 text-sm font-medium text-default-900 bg-default-100 hover:bg-default-200 rounded-lg transition-colors"
                >
                  Add Staff
                </button>
              </div>
            </div>

            <div className="border border-default-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-default-50">
                <div className="col-span-1 flex items-center">
                  <input 
                    type="checkbox" 
                    aria-label="select all"
                    className="w-4 h-4 rounded border-default-300"
                  />
                </div>
                <div className="col-span-6 text-xs font-semibold text-default-600 uppercase tracking-wide">
                  Name
                </div>
                <div className="col-span-3 text-xs font-semibold text-default-600 uppercase tracking-wide">
                  Role
                </div>
                <div className="col-span-2 text-xs font-semibold text-default-600 uppercase tracking-wide text-center">
                  Action
                </div>
              </div>

              <div className="bg-white">
                {loading && (
                  <div className="px-4 py-6 text-center text-sm text-default-600 border-t border-default-100">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner size="sm" />
                      <span>Loading staff...</span>
                    </div>
                  </div>
                )}

                {!loading && staffMembers.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-default-500">
                    No staff assigned yet.
                  </div>
                )}

                {staffMembers.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-default-100 hover:bg-default-50 transition-colors">
                    <div className="col-span-1 flex items-center">
                      <input 
                        type="checkbox" 
                        aria-label={`select-${idx}`}
                        className="w-4 h-4 rounded border-default-300"
                      />
                    </div>
                    <div className="col-span-6 text-sm text-default-900">
                      {s.FullName}
                    </div>
                    <div className="col-span-3 text-sm text-default-700">
                      {s.Role}
                    </div>
                    <div className="col-span-2 flex items-center justify-end pr-3">
                      <button 
                        onClick={() => removeStaff(idx)} 
                        aria-label="remove"
                        className="text-danger hover:bg-danger-50 p-1.5 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          {saving && (
            <div className="text-sm text-default-600">Saving...</div>
          )}
        </ModalBody>

        <ModalFooter className="px-6 py-4 border-t border-default-200">
          <Button 
            variant="bordered" 
            onPress={onClose}
            className="font-medium"
          >
            Close
          </Button>
          <Button 
            color="default"
            className="bg-black text-white font-medium hover:bg-default-800"
            onPress={save}
            isDisabled={saving}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
