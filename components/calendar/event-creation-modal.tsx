"use client";
import React, { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { DatePicker } from "@heroui/date-picker";
import { Users, Droplet, Megaphone } from "lucide-react";
import { getUserInfo } from '@/utils/getUserInfo'
import { decodeJwt } from '@/utils/decodeJwt'

interface CreateTrainingEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

type Variant = 'training' | 'blood-drive' | 'advocacy';

interface GenericCreateEventModalProps extends CreateTrainingEventModalProps {
  variant?: Variant;
}

const GenericCreateEventModal: React.FC<GenericCreateEventModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  error,
  variant = 'training'
}) => {
  const [coordinator, setCoordinator] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [trainingType, setTrainingType] = useState("");
  const [date, setDate] = useState<any>(null);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [numberOfParticipants, setNumberOfParticipants] = useState("");
  const [goalCount, setGoalCount] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const [localSubmitting, setLocalSubmitting] = useState(false);

  const [coordinatorOptions, setCoordinatorOptions] = useState<{ key: string; label: string }[]>([]);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    const fetchCoordinators = async () => {
      try {
        const rawUser = localStorage.getItem("unite_user");
        const token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token");
        const headers: any = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const user = rawUser ? JSON.parse(rawUser) : null;
        const info = (() => { try { return getUserInfo() } catch (e) { return null } })()
        // robust admin detection (handle different property shapes/casing)
        const isAdmin = !!(
          // central getUserInfo flag takes precedence
          (info && info.isAdmin) ||
          (user && (
            (user.staff_type && String(user.staff_type).toLowerCase().includes('admin')) ||
            (user.role && String(user.role).toLowerCase().includes('admin'))
          ))
        );

        if (user && isAdmin) {
          const res = await fetch(`${API_URL}/api/coordinators`, { headers, credentials: 'include' });
          const body = await res.json();
          if (res.ok) {
            const list = body.data || body.coordinators || body;
            const opts = (Array.isArray(list) ? list : []).map((c: any) => {
              const staff = c.Staff || c.staff || null;
              const district = c.District || c.district || null;
              const fullName = staff ? [staff.First_Name, staff.Middle_Name, staff.Last_Name].filter(Boolean).join(' ').trim() : (c.StaffName || c.label || '');
              const districtLabel = district?.District_Number ? `District ${district.District_Number}` : (district?.District_Name || '');
              return {
                key: c.Coordinator_ID || (staff && staff.ID) || c.id,
                label: `${fullName}${districtLabel ? ' - ' + districtLabel : ''}`
              };
            });
            setCoordinatorOptions(opts);
          }
        } else if (user) {
          // For coordinators/stakeholders derive coordinator id from a number of possible user fields
          // Preserve backwards compatibility by trying common fields in order
          const candidateIds = [] as Array<string|number|undefined>;
          // If user is explicitly a Coordinator (staff_type) or role indicates coordinator, use their own id
          if ((user.staff_type && String(user.staff_type).toLowerCase().includes('coordinator')) || (info && String(info.role || '').toLowerCase().includes('coordinator'))) candidateIds.push(user.id || info?.raw?.id);
          // Common fields where coordinator id may be stored
          candidateIds.push(user.Coordinator_ID, user.CoordinatorId, user.CoordinatorID, user.role_data?.coordinator_id, user.MadeByCoordinatorID, info?.raw?.Coordinator_ID, info?.raw?.CoordinatorId);
          // Also accept IDs that look like COORD_... as the coordinator id
          if (!candidateIds.some(Boolean) && (user && user.id && String(user.id).toLowerCase().startsWith('coord_'))) candidateIds.push(user.id);
          let coordId = candidateIds.find(Boolean) as string | undefined;

          // Fallback: inspect token payload for id/role/coordinator info
          if (!coordId) {
            try {
              const t = token || (typeof window !== 'undefined' ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null)
              const payload = decodeJwt(t)
              if (payload) {
                coordId = payload.id || payload.ID || payload.Coordinator_ID || payload.coordinator_id || coordId
              }
            } catch (e) { }
          }

          if (coordId) {
            try {
              // If the resolved id looks like a stakeholder id (STKH_), fetch the stakeholder
              // to obtain the actual Coordinator_ID, then fetch that coordinator.
              let resolvedCoordId = String(coordId);
              if (/^stkh_/i.test(resolvedCoordId)) {
                try {
                      const stRes = await fetch(`${API_URL}/api/stakeholders/${encodeURIComponent(resolvedCoordId)}`, { headers, credentials: 'include' });
                  const stBody = await stRes.json();
                  if (stRes.ok && stBody.data) {
                    const stakeholder = stBody.data;
                    resolvedCoordId = stakeholder.Coordinator_ID || stakeholder.CoordinatorId || stakeholder.coordinator_id || resolvedCoordId;
                  }
                } catch (e) {
                  console.warn('Failed to fetch stakeholder to resolve coordinator id', resolvedCoordId, e);
                }
              }

              // Try coordinators endpoint with the resolved coordinator id
              const res = await fetch(`${API_URL}/api/coordinators/${encodeURIComponent(resolvedCoordId)}`, { headers, credentials: 'include' });
              const body = await res.json();
              if (res.ok && body.data) {
                const coord = body.data.coordinator || body.data || body.coordinator || body;
                const staff = coord?.Staff || null;
                const fullName = staff ? [staff.First_Name, staff.Middle_Name, staff.Last_Name].filter(Boolean).join(' ').trim() : '';
                const districtLabel = coord?.District?.District_Number ? `District ${coord.District.District_Number}` : (coord?.District?.District_Name || '');
                const name = `${fullName}${districtLabel ? ' - ' + districtLabel : ''}`;
                setCoordinatorOptions([{ key: coord?.Coordinator_ID || resolvedCoordId, label: name }]);
                setCoordinator(coord?.Coordinator_ID || resolvedCoordId);
              }
            } catch (e) {
              // swallow individual fetch errors but keep trying other flows
              console.error('Failed to fetch coordinator by id', coordId, e);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch coordinators', err);
      }
    };

    // Diagnostics: print centralized user info and raw stored user when modal opens
    if (isOpen) {
      try {
        const infoOuter = (() => { try { return getUserInfo() } catch (e) { return null } })()
        // eslint-disable-next-line no-console
        console.log('[CreateEventModal] getUserInfo():', infoOuter)
        const rawUserOuter = typeof window !== 'undefined' ? localStorage.getItem('unite_user') : null
        // eslint-disable-next-line no-console
        console.log('[CreateEventModal] raw unite_user (truncated):', rawUserOuter ? String(rawUserOuter).slice(0, 300) : null)
      } catch (e) { /* ignore */ }
      fetchCoordinators();
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (date) {
      const selected = new Date(date);
      selected.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (selected.getTime() < today.getTime()) {
        setErrorMessage('Event date cannot be in the past');
        return;
      }
    }

    let startISO = "";
    let endISO = "";
    if (date) {
      const d = new Date(date);
      if (startTime) {
        const [sh, sm] = startTime.split(":").map((s) => parseInt(s, 10));
        d.setHours(sh || 0, sm || 0, 0, 0);
        startISO = d.toISOString();
      }
      if (endTime) {
        const e = new Date(date);
        const [eh, em] = endTime.split(":").map((s) => parseInt(s, 10));
        e.setHours(eh || 0, em || 0, 0, 0);
        endISO = e.toISOString();
      }
    }

    setErrorMessage(null);
    setFieldErrors({});

    const base: any = {
      eventTitle,
      coordinator,
      date: date ? new Date(date).toDateString() : "",
      startTime: startISO,
      endTime: endISO,
      eventDescription,
      location,
      email,
      contactNumber,
    };

    if (variant === 'training') {
      base.trainingType = trainingType;
      base.numberOfParticipants = numberOfParticipants;
    } else if (variant === 'blood-drive') {
      base.goalCount = goalCount;
    } else if (variant === 'advocacy') {
      base.audienceType = audienceType;
      base.numberOfParticipants = numberOfParticipants;
    }

    // simple client-side validation for required fields used by backend
    const newFieldErrors: Record<string,string> = {};
    if (!base.eventTitle || !String(base.eventTitle).trim()) newFieldErrors['eventTitle'] = 'Event title is required.';
    if (!base.email || !String(base.email).trim()) newFieldErrors['email'] = 'Email is required.';
    else {
      // basic email format check
      const em = String(base.email).trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) newFieldErrors['email'] = 'Please enter a valid email address.';
    }
    if (!base.contactNumber || !String(base.contactNumber).trim()) newFieldErrors['contactNumber'] = 'Phone number is required.';

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setErrorMessage('Please fix the highlighted fields.');
      return;
    }

    // call parent handler and show inline errors if it fails
    setLocalSubmitting(true);
    try {
      await onConfirm(base);
    } catch (err: any) {
      // parse error message into friendly text
      const msg = err?.message || String(err || 'Failed to create event');
      // look for Mongoose style "Path `Email` is required" occurrences
      const re = /Path `([^`]+)` is required/g;
      const missing: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(msg)) !== null) {
        const field = m[1];
        if (/email/i.test(field)) { missing.push('email'); setFieldErrors(prev => ({...prev, email: 'Email is required.'})); }
        else if (/phone|Phone_Number|PhoneNumber/i.test(field)) { missing.push('phone number'); setFieldErrors(prev => ({...prev, contactNumber: 'Phone number is required.'})); }
        else { missing.push(field); setFieldErrors(prev => ({...prev, [field]: `${field} is required.`})); }
      }
      if (missing.length > 0) {
        setErrorMessage('Missing ' + missing.join(' and '));
      } else {
        // fallback: present shorter english message
        setErrorMessage(msg.replace(/Path `([^`]+)` is required,?/g, '').replace(/Event validation failed:?\s*/i, '').trim() || 'Failed to create event');
      }
      setLocalSubmitting(false);
      return;
    } finally {
      setLocalSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" placement="center" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3 pb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-default-100">
            <Users className="w-5 h-5 text-default-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{variant === 'training' ? 'Create a training event' : variant === 'blood-drive' ? 'Create a blood drive event' : 'Create an advocacy event'}</h2>
            <p className="text-xs text-default-500 font-normal mt-0.5">Add details below to proceed.</p>
          </div>
        </ModalHeader>

        <ModalBody className="py-6">
          <div className="space-y-5">
            {errorMessage && (
              <div className="rounded-md bg-red-50 border border-red-100 p-3 text-sm text-red-800">
                {errorMessage}
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Coordinator<span className="text-danger ml-1">*</span></label>
              {(() => {
                const rawUser = typeof window !== 'undefined' ? localStorage.getItem('unite_user') : null;
                const user = rawUser ? JSON.parse(rawUser) : null;
                const isAdmin = !!(
                  user && (
                    (user.staff_type && String(user.staff_type).toLowerCase().includes('admin')) ||
                    (user.role && String(user.role).toLowerCase().includes('admin'))
                  )
                );

                if (isAdmin) {
                  return (
                    <Select
                      placeholder="Select one"
                      selectedKeys={coordinator ? [coordinator] : []}
                      onSelectionChange={(keys) => setCoordinator(Array.from(keys)[0] as string)}
                      variant="bordered"
                      classNames={{ trigger: "border-default-200 hover:border-default-400 h-10", value: "text-sm" }}
                    >
                      {(coordinatorOptions.length ? coordinatorOptions : []).map((coord) => (
                        <SelectItem key={coord.key}>{coord.label}</SelectItem>
                      ))}
                    </Select>
                  );
                }

                const selected = coordinatorOptions[0];
                return (
                  <Input type="text" value={selected?.label || ''} disabled variant="bordered" classNames={{ inputWrapper: 'border-default-200 h-10 bg-default-100', input: 'text-sm' }} />
                );
              })()}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Event Title<span className="text-danger ml-1">*</span></label>
              <Input type="text" placeholder="Enter event title" value={eventTitle} onChange={(e) => setEventTitle((e.target as HTMLInputElement).value)} onBlur={() => setTitleTouched(true)} variant="bordered" classNames={{ input: "text-sm", inputWrapper: "border-default-200 hover:border-default-400 h-10" }} />
              {titleTouched && !eventTitle.trim() && (<p className="text-danger text-xs mt-1">Event title is required.</p>)}
            </div>

            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="col-span-1">
                <label className="text-sm font-medium mb-1.5 block">Date</label>
                <DatePicker value={date} onChange={setDate} granularity="day" hideTimeZone variant="bordered" classNames={{ base: "w-full", inputWrapper: "border-default-200 hover:border-default-400 h-10", input: "text-sm" }} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Start time</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime((e.target as HTMLInputElement).value)} variant="bordered" classNames={{ inputWrapper: "border-default-200 hover:border-default-400 h-10", input: "text-sm" }} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">End time</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime((e.target as HTMLInputElement).value)} variant="bordered" classNames={{ inputWrapper: "border-default-200 hover:border-default-400 h-10", input: "text-sm" }} />
              </div>
            </div>

            {/* Variant-specific fields */}
            {variant === 'training' && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Training Type</label>
                <Input type="text" placeholder="e.g. Basic Life Support" value={trainingType} onChange={(e) => setTrainingType(e.target.value)} variant="bordered" classNames={{ input: "text-sm", inputWrapper: "border-default-200 hover:border-default-400 h-10" }} />
                <div className="mt-3">
                  <label className="text-sm font-medium mb-1.5 block">Participant Count</label>
                  <Input type="text" placeholder="200" value={numberOfParticipants} onChange={(e) => setNumberOfParticipants(e.target.value)} variant="bordered" classNames={{ input: "text-sm", inputWrapper: "border-default-200 hover:border-default-400 h-10" }} />
                </div>
              </div>
            )}
            {variant === 'blood-drive' && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Goal Count</label>
                <Input type="text" placeholder="e.g. 100" value={goalCount} onChange={(e) => setGoalCount(e.target.value)} variant="bordered" classNames={{ input: "text-sm", inputWrapper: "border-default-200 hover:border-default-400 h-10" }} />
              </div>
            )}
            {variant === 'advocacy' && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Audience Type</label>
                <Input type="text" placeholder="e.g. Students" value={audienceType} onChange={(e) => setAudienceType(e.target.value)} variant="bordered" classNames={{ input: "text-sm", inputWrapper: "border-default-200 hover:border-default-400 h-10" }} />
                <div className="mt-3">
                  <label className="text-sm font-medium mb-1.5 block">Expected Audience</label>
                  <Input type="text" placeholder="200" value={numberOfParticipants} onChange={(e) => setNumberOfParticipants(e.target.value)} variant="bordered" classNames={{ input: "text-sm", inputWrapper: "border-default-200 hover:border-default-400 h-10" }} />
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="text-sm font-medium mb-1.5 block">Event Description</label>
              <Textarea placeholder="The event is about..." value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} variant="bordered" minRows={4} classNames={{ input: "text-sm", inputWrapper: "border-default-200 hover:border-default-400" }} />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Location<span className="text-danger ml-1">*</span></label>
              <Input type="text" placeholder="Enter location" value={location} onChange={(e) => setLocation(e.target.value)} variant="bordered" classNames={{ input: "text-sm", inputWrapper: "border-default-200 hover:border-default-400 h-10" }} />
            </div>
            {/* Contact fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email<span className="text-danger ml-1">*</span></label>
                <Input type="email" placeholder="name@domain.com" value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} variant="bordered" classNames={{ input: "text-sm", inputWrapper: "border-default-200 hover:border-default-400 h-10" }} />
                {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone<span className="text-danger ml-1">*</span></label>
                <Input type="text" placeholder="e.g. +63 912 345 6789" value={contactNumber} onChange={(e) => setContactNumber((e.target as HTMLInputElement).value)} variant="bordered" classNames={{ input: "text-sm", inputWrapper: "border-default-200 hover:border-default-400 h-10" }} />
                {fieldErrors.contactNumber && <p className="text-xs text-red-600 mt-1">{fieldErrors.contactNumber}</p>}
              </div>
            </div>
          </div>
          {/* Parent/passed-in error message (display near bottom like campaign modal) */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-danger-50 border border-danger-200">
              <p className="text-sm text-danger font-medium">Error</p>
              <p className="text-sm text-danger-700 mt-1">{error}</p>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="bordered" onPress={onClose} className="font-medium">Cancel</Button>
          <Button color="default" onPress={handleCreate} className={`bg-black text-white font-medium ${!eventTitle.trim() || (isSubmitting || localSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!eventTitle.trim() || !!(isSubmitting || localSubmitting)} aria-busy={!!(isSubmitting || localSubmitting)}>{(isSubmitting || localSubmitting) ? 'Creating...' : 'Create Event'}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export const CreateTrainingEventModal = (props: CreateTrainingEventModalProps) => <GenericCreateEventModal {...props} variant="training" />;
export const CreateBloodDriveEventModal = (props: CreateTrainingEventModalProps) => <GenericCreateEventModal {...props} variant="blood-drive" />;
export const CreateAdvocacyEventModal = (props: CreateTrainingEventModalProps) => <GenericCreateEventModal {...props} variant="advocacy" />;

export default function EventCreationModalsPlaceholder() {
  return null;
}
