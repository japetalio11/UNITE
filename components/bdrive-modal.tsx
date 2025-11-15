// components/bdrive-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Calendar as CalendarIcon, Clock, MapPin, Users, X, Droplet } from "lucide-react";

interface BdriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BloodDriveData) => void;
  initialData?: BloodDriveData;
  className?: string;
}

export interface BloodDriveData {
  coordinator: string;
  startDate: string;
  endDate: string;
  goalCount: string;
  location: string;
  eventDescription: string;
  contactInfo: string;
}

export default function BdriveModal({ isOpen, onClose, onSave, initialData }: BdriveModalProps) {
  const [formData, setFormData] = useState<BloodDriveData>({
    coordinator: "",
    startDate: "",
    endDate: "",
    goalCount: "",
    location: "",
    eventDescription: "",
    contactInfo: ""
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden"
        >
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <div className="flex items-center mb-4">
                  <div className="bg-gray-100 p-2.5 rounded-xl">
                    <Droplet className="w-6 h-6 text-gray-700" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create a blood drive event</h2>
                <p className="text-sm text-gray-500">
                  Start providing your information by selecting your blood type. Add details below to proceed
                </p>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-6">
                {/* Coordinator */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Coordinator</label>
                  <Input
                    name="coordinator"
                    value={formData.coordinator}
                    onChange={handleChange}
                    placeholder="Enter coordinator name"
                    classNames={{
                      inputWrapper: "h-11",
                      input: "text-sm"
                    }}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <Input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      classNames={{
                        inputWrapper: "h-11",
                        input: "text-sm"
                      }}
                      endContent={
                        <button type="button" className="text-gray-400 hover:text-gray-600">
                          <CalendarIcon className="w-4 h-4" />
                        </button>
                      }
                      required
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <Input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      classNames={{
                        inputWrapper: "h-11",
                        input: "text-sm"
                      }}
                      endContent={
                        <button type="button" className="text-gray-400 hover:text-gray-600">
                          <CalendarIcon className="w-4 h-4" />
                        </button>
                      }
                      required
                    />
                  </div>
                </div>

                {/* Goal Count */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Goal Count</label>
                  <Input
                    type="number"
                    name="goalCount"
                    value={formData.goalCount}
                    onChange={handleChange}
                    placeholder="Enter goal count"
                    classNames={{
                      inputWrapper: "h-11",
                      input: "text-sm"
                    }}
                    required
                  />
                </div>

                {/* Event Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Event Description</label>
                  <textarea
                    name="eventDescription"
                    value={formData.eventDescription}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
                    placeholder="Enter event description"
                    required
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <Input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Enter location"
                    classNames={{
                      inputWrapper: "h-11",
                      input: "text-sm"
                    }}
                    startContent={<MapPin className="w-4 h-4 text-gray-400" />}
                    required
                  />
                </div>

                {/* Contact Information */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Contact Information</label>
                  <Input
                    name="contactInfo"
                    value={formData.contactInfo}
                    onChange={handleChange}
                    placeholder="Enter contact information"
                    classNames={{
                      inputWrapper: "h-11",
                      input: "text-sm"
                    }}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 mt-8">
                <Button
                  type="button"
                  variant="light"
                  onClick={onClose}
                  className="px-8 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-8 h-11 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
                >
                  Create Event
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}