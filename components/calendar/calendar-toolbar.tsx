"use client";
import React, { useState } from "react";
import { Button, ButtonGroup } from "@heroui/button";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection } from "@heroui/dropdown";
import { Download, Filter, SlidersHorizontal, Ticket, ChevronDown } from "lucide-react";
import { CreateTrainingEventModal, CreateBloodDriveEventModal, CreateAdvocacyEventModal } from '@/components/calendar/event-creation-modal';

interface CalendarToolbarProps {
  onExport?: () => void;
  onQuickFilter?: (filter?: any) => void;
  onAdvancedFilter?: (filter?: any) => void;
  onCreateEvent?: (eventType: string, eventData: any) => void;
}

export default function CalendarToolbar({ onExport, onQuickFilter, onAdvancedFilter, onCreateEvent }: CalendarToolbarProps) {
  const [selectedEventType, setSelectedEventType] = useState(new Set(["blood-drive"]));
  const [selectedQuick, setSelectedQuick] = useState<string | undefined>(undefined);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [isBloodDriveModalOpen, setIsBloodDriveModalOpen] = useState(false);
  const [isAdvocacyModalOpen, setIsAdvocacyModalOpen] = useState(false);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [isTrainingSubmitting, setIsTrainingSubmitting] = useState(false);
  const [isBloodSubmitting, setIsBloodSubmitting] = useState(false);
  const [isAdvocacySubmitting, setIsAdvocacySubmitting] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [bloodDriveError, setBloodDriveError] = useState<string | null>(null);
  const [advocacyError, setAdvocacyError] = useState<string | null>(null);
  const [advStart, setAdvStart] = useState<any>(null);
  const [advCoordinator, setAdvCoordinator] = useState("");

  const eventLabelsMap: any = { "blood-drive": "Blood Drive", "training": "Training", "advocacy": "Advocacy" };
  const eventDescriptionsMap: any = { "blood-drive": "Organize a blood donation event", "training": "Schedule a training session", "advocacy": "Create an advocacy campaign" };

  const selectedEventTypeValue = Array.from(selectedEventType)[0] as string | undefined;
  const typedEventKey = selectedEventTypeValue as keyof typeof eventLabelsMap | undefined;
  const currentEventLabel = typedEventKey ? eventLabelsMap[typedEventKey] : "Event";

  const handleCreateEventClick = () => {
    // clear errors when opening modals
    setTrainingError(null);
    setBloodDriveError(null);
    setAdvocacyError(null);
    switch (selectedEventTypeValue) {
      case "blood-drive": setIsBloodDriveModalOpen(true); break;
      case "training": setIsTrainingModalOpen(true); break;
      case "advocacy": setIsAdvocacyModalOpen(true); break;
      default: setIsBloodDriveModalOpen(true);
    }
  };

  const handleTrainingEventConfirm = async (data: any) => {
    if (!onCreateEvent) return;
    setIsTrainingSubmitting(true);
    try {
      await onCreateEvent('training', data);
      setIsTrainingModalOpen(false);
      setTrainingError(null);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create training event';
      setTrainingError(errorMessage);
    } finally { setIsTrainingSubmitting(false); }
  };
  const handleBloodDriveEventConfirm = async (data: any) => {
    if (!onCreateEvent) return;
    setIsBloodSubmitting(true);
    try {
      await onCreateEvent('blood-drive', data);
      setIsBloodDriveModalOpen(false);
      setBloodDriveError(null);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create blood drive event';
      setBloodDriveError(errorMessage);
    } finally { setIsBloodSubmitting(false); }
  };
  const handleAdvocacyEventConfirm = async (data: any) => {
    if (!onCreateEvent) return;
    setIsAdvocacySubmitting(true);
    try {
      await onCreateEvent('advocacy', data);
      setIsAdvocacyModalOpen(false);
      setAdvocacyError(null);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create advocacy event';
      setAdvocacyError(errorMessage);
    } finally { setIsAdvocacySubmitting(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="faded" startContent={<Download className="w-4 h-4" />} onPress={onExport} radius="md" size="sm">Export</Button>

      <Dropdown>
        <DropdownTrigger>
          <Button variant="faded" startContent={<Filter className="w-4 h-4" />} endContent={<ChevronDown className="w-4 h-4" />} radius="md" size="sm">Quick Filter</Button>
        </DropdownTrigger>
        <DropdownMenu disallowEmptySelection selectionMode="single" selectedKeys={selectedQuick ? new Set([selectedQuick]) : new Set()} onSelectionChange={(keys: any) => {
          try { const arr = Array.from(keys as Iterable<any>); const val = arr[0] as string | undefined; setSelectedQuick(val); if (val === undefined || val === "") onQuickFilter?.({ category: undefined }); else onQuickFilter?.({ category: val }); } catch { setSelectedQuick(undefined); onQuickFilter?.({ category: undefined }); }
        }}>
          <DropdownSection title="Category">
            <DropdownItem key="">All</DropdownItem>
            <DropdownItem key="Blood Drive">Blood Drive</DropdownItem>
            <DropdownItem key="Training">Training</DropdownItem>
            <DropdownItem key="Advocacy">Advocacy</DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>

      <Button variant="faded" startContent={<SlidersHorizontal className="w-4 h-4" />} endContent={<ChevronDown className="w-4 h-4" />} onPress={() => setIsAdvancedModalOpen(true)} radius="md" size="sm">Advanced Filter</Button>

      <ButtonGroup variant="solid" radius="md" size="sm">
        <Button onPress={handleCreateEventClick} color="primary" startContent={<Ticket className="w-4 h-4" />}>{currentEventLabel}</Button>
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button isIconOnly color="primary"><ChevronDown className="w-4 h-4" /></Button>
          </DropdownTrigger>
          <DropdownMenu disallowEmptySelection aria-label="Event type options" className="max-w-2xl" selectedKeys={selectedEventType} selectionMode="single" onSelectionChange={(keys: any) => { try { const arr = Array.from(keys as Iterable<any>); setSelectedEventType(new Set(arr.map(String))); } catch { setSelectedEventType(new Set()); } }}>
            <DropdownItem key="blood-drive" description={eventDescriptionsMap["blood-drive"]}>{eventLabelsMap["blood-drive"]}</DropdownItem>
            <DropdownItem key="training" description={eventDescriptionsMap["training"]}>{eventLabelsMap["training"]}</DropdownItem>
            <DropdownItem key="advocacy" description={eventDescriptionsMap["advocacy"]}>{eventLabelsMap["advocacy"]}</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </ButtonGroup>

      {/* Creation modals */}
      <CreateTrainingEventModal isOpen={isTrainingModalOpen} onClose={() => { setIsTrainingModalOpen(false); setTrainingError(null); }} onConfirm={handleTrainingEventConfirm} isSubmitting={isTrainingSubmitting} error={trainingError} />
      <CreateBloodDriveEventModal isOpen={isBloodDriveModalOpen} onClose={() => { setIsBloodDriveModalOpen(false); setBloodDriveError(null); }} onConfirm={handleBloodDriveEventConfirm} isSubmitting={isBloodSubmitting} error={bloodDriveError} />
      <CreateAdvocacyEventModal isOpen={isAdvocacyModalOpen} onClose={() => { setIsAdvocacyModalOpen(false); setAdvocacyError(null); }} onConfirm={handleAdvocacyEventConfirm} isSubmitting={isAdvocacySubmitting} error={advocacyError} />

      {/* Advanced Filter Modal (simple inline form) */}
      {isAdvancedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-4 w-96">
            <h3 className="text-lg font-semibold">Advanced Filter</h3>
            <div className="space-y-3 mt-3">
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm">Date</label>
                <div className="w-full">
                  <DateInput value={advStart} onChange={setAdvStart} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm">Coordinator</label>
                <input className="border p-2 w-full text-sm" value={advCoordinator} onChange={(e) => setAdvCoordinator(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="bordered" onPress={() => setIsAdvancedModalOpen(false)}>Cancel</Button>
              <Button color="primary" onPress={() => { onAdvancedFilter?.({ start: advStart ? (new Date(advStart)).toISOString() : undefined, coordinator: advCoordinator || undefined }); setIsAdvancedModalOpen(false); }}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// tiny DateInput helper used above to avoid depending on DatePicker in this file
function DateInput({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return <input type="date" className="border p-2 text-sm w-full" value={value ? new Date(value).toISOString().split('T')[0] : ''} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} />;
}
