"use client";

import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { DatePicker } from "@heroui/date-picker";
import { Select, SelectItem } from "@heroui/select";
import { Check } from "@gravity-ui/icons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isSysAdmin?: boolean;
  userCoordinatorId?: string | null;
  userDistrictId?: string | null;
  onCreated?: (code: any) => void;
}

export default function GenerateCodeModal({
  isOpen,
  onClose,
  isSysAdmin = false,
  userCoordinatorId = null,
  userDistrictId = null,
  onCreated,
}: Props) {
  const [districts, setDistricts] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    userDistrictId || null,
  );
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<
    string | null
  >(userCoordinatorId || null);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [expiresAt, setExpiresAt] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generated, setGenerated] = useState<any | null>(null);
  const [coordinatorName, setCoordinatorName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/districts?limit=1000`
          : `/api/districts?limit=1000`;
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        const headers: any = {};

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(url, { headers });
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;

        setDistricts(json?.data || []);
      } catch (e) {
        setDistricts([]);
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    // when district changes and admin, load coordinators for that district
    if (!isOpen) return;
    if (!isSysAdmin) return;
    if (!selectedDistrictId) {
      setCoordinators([]);

      return;
    }
    (async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/coordinators?district_id=${encodeURIComponent(String(selectedDistrictId))}&limit=1000`
          : `/api/coordinators?district_id=${encodeURIComponent(String(selectedDistrictId))}&limit=1000`;
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        const headers: any = {};

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(url, { headers });
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        const items = json?.data || json?.coordinators || [];

        setCoordinators(items);
        // auto-select the first coordinator when district is picked (admin flow)
        if (Array.isArray(items) && items.length > 0) {
          const first = items[0];
          const firstId =
            first?.Coordinator_ID ||
            first?.id ||
            first?._id ||
            (first?.Staff && (first.Staff.ID || first.Staff._id)) ||
            null;

          if (firstId) setSelectedCoordinatorId(String(firstId));
        }
      } catch (e) {
        setCoordinators([]);
      }
    })();
  }, [selectedDistrictId, isSysAdmin, isOpen]);

  useEffect(() => {
    setSelectedCoordinatorId(userCoordinatorId || null);
    setSelectedDistrictId(userDistrictId || null);
  }, [userCoordinatorId, userDistrictId]);

  // fallback: try to infer coordinatorId/district from localStorage if props were not passed
  useEffect(() => {
    if (selectedCoordinatorId && selectedDistrictId) return;
    try {
      const raw = localStorage.getItem("unite_user");
      const parsed = raw ? JSON.parse(raw) : null;

      if (!selectedCoordinatorId) {
        const candidate =
          parsed?.id ||
          parsed?.ID ||
          parsed?.Coordinator_ID ||
          parsed?.coordinator_id ||
          parsed?.Staff_ID ||
          parsed?.staff_id ||
          parsed?._id ||
          (parsed?.user &&
            (parsed.user.id ||
              parsed.user.ID ||
              parsed.user.Coordinator_ID ||
              parsed.user._id)) ||
          null;

        if (candidate) setSelectedCoordinatorId(candidate);
      }
      if (!selectedDistrictId) {
        const d =
          parsed?.District_ID ||
          parsed?.DistrictId ||
          parsed?.districtId ||
          parsed?.role_data?.district_id ||
          parsed?.role_data?.districtId ||
          (parsed?.District &&
            (parsed.District.District_ID || parsed.District._id)) ||
          null;

        if (d) setSelectedDistrictId(d);
      }
    } catch (e) {
      /* ignore */
    }
  }, [selectedCoordinatorId, selectedDistrictId]);

  // helper to format ordinal district like "1st District"
  const ordinalSuffix = (n: number | string) => {
    const num = Number(n);

    if (Number.isNaN(num)) return String(n);
    const j = num % 10,
      k = num % 100;

    if (j === 1 && k !== 11) return `${num}st`;
    if (j === 2 && k !== 12) return `${num}nd`;
    if (j === 3 && k !== 13) return `${num}rd`;

    return `${num}th`;
  };

  const formatDistrict = (d: any) => {
    if (!d) return "";
    if (d.District_Number)
      return `${ordinalSuffix(d.District_Number)} District`;
    if (d.District_Name) return d.District_Name;

    return String(d.District_ID || "");
  };

  // When opened as a coordinator (non-admin), try to fetch coordinator full name for display
  useEffect(() => {
    if (!isOpen) return;
    if (isSysAdmin) return;
    if (!selectedCoordinatorId) {
      // try to read from local storage as fallback
      try {
        const raw = localStorage.getItem("unite_user");
        const parsed = raw ? JSON.parse(raw) : null;
        const name =
          parsed?.First_Name ||
          parsed?.firstName ||
          parsed?.FirstName ||
          parsed?.first_name ||
          parsed?.name ||
          (parsed?.user && (parsed.user.First_Name || parsed.user.firstName));
        const last =
          parsed?.Last_Name ||
          parsed?.lastName ||
          parsed?.LastName ||
          parsed?.last_name ||
          (parsed?.user && (parsed.user.Last_Name || parsed.user.lastName));

        if (name || last)
          setCoordinatorName([name, last].filter(Boolean).join(" "));
      } catch (e) {
        /* ignore */
      }

      return;
    }

    (async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        const url = base
          ? `${base}/api/coordinators/${encodeURIComponent(String(selectedCoordinatorId))}`
          : `/api/coordinators/${encodeURIComponent(String(selectedCoordinatorId))}`;
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("unite_token") ||
              sessionStorage.getItem("unite_token")
            : null;
        const headers: any = {};

        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(url, { headers });

        if (!res.ok) return;
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        const data = json?.data || json?.coordinator || json || null;

        if (data) {
          const staff = data.Staff || data.staff || data.user || null;
          const fname =
            data.First_Name ||
            data.firstName ||
            (staff && (staff.First_Name || staff.firstName)) ||
            data.name ||
            "";
          const lname =
            data.Last_Name ||
            data.lastName ||
            (staff && (staff.Last_Name || staff.lastName)) ||
            "";
          const full = [fname, lname].filter(Boolean).join(" ");

          if (full) setCoordinatorName(full);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [isOpen, isSysAdmin, selectedCoordinatorId]);

  const handleSubmit = async () => {
    try {
      // clear previous messages
      setErrorMessage(null);
      setSuccessMessage(null);
      if (!selectedCoordinatorId) {
        setErrorMessage(
          "Please choose a coordinator before creating a registration code.",
        );

        return;
      }
      // validate expiresAt is not in the past (if provided)
      if (expiresAt) {
        const selected = new Date(expiresAt);

        selected.setHours(0, 0, 0, 0);
        const today = new Date();

        today.setHours(0, 0, 0, 0);
        if (selected.getTime() < today.getTime()) {
          setErrorMessage(
            "The expiration date cannot be earlier than today. Please choose today or a future date.",
          );

          return;
        }
      }
      setIsSubmitting(true);
      const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      const url = base
        ? `${base}/api/coordinators/${encodeURIComponent(String(selectedCoordinatorId))}/registration-codes`
        : `/api/coordinators/${encodeURIComponent(String(selectedCoordinatorId))}/registration-codes`;
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("unite_token") ||
            sessionStorage.getItem("unite_token")
          : null;
      const headers: any = { "Content-Type": "application/json" };

      if (token) headers["Authorization"] = `Bearer ${token}`;
      const payload: any = {
        districtId: selectedDistrictId,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      };
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) {
        // show friendly message, include small detail if available
        const msg =
          json?.message || `Failed to create code (status ${res.status})`;

        setErrorMessage(
          "Could not create the registration code. " +
            (msg ? `Server says: ${msg}` : "Please try again."),
        );

        return;
      }
      const code = json?.data || null;

      setGenerated(code);
      setSuccessMessage("Registration code created successfully.");
      onCreated && onCreated(code);
    } catch (err: any) {
      // Show a friendly error message to the user
      const detail = err?.message
        ? ` (${String(err.message).slice(0, 200)})`
        : "";

      setErrorMessage(
        "Could not create the registration code. Please try again later" +
          detail,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    const codeStr = generated?.Code || generated?.Code || "";

    if (!codeStr) {
      setErrorMessage("No code available to copy.");

      return;
    }
    try {
      await navigator.clipboard.writeText(String(codeStr));
      setSuccessMessage(
        "Code copied to your clipboard. You can now paste it where needed.",
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      setErrorMessage(
        "Automatic copying is blocked by your browser. Please copy the code manually from the box.",
      );
    }
  };

  return (
    <Modal isOpen={isOpen} placement="center" size="md" onClose={onClose}>
      <ModalContent>
        <ModalHeader className="pb-2">
          <h3 className="text-lg font-semibold">Generate registration code</h3>
          <p className="text-xs text-default-500">
            Create a one-time / limited-use code for stakeholder signup
          </p>
        </ModalHeader>
        <ModalBody>
          {!generated ? (
            <div className="space-y-3">
              {errorMessage && (
                <div className="text-sm text-danger p-2 bg-default-100 rounded">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="flex items-center gap-2 text-sm p-2 bg-green-50 text-green-800 rounded border border-green-100 transition-opacity duration-200">
                  <Check className="w-4 h-4" />
                  <div>{successMessage}</div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">District</label>
                {isSysAdmin ? (
                  <Select
                    placeholder="Select district"
                    selectedKeys={
                      selectedDistrictId ? [String(selectedDistrictId)] : []
                    }
                    onSelectionChange={(keys: any) => {
                      const id = Array.from(keys)[0] as string;

                      setSelectedDistrictId(id);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                  >
                    <SelectItem key="">Select district</SelectItem>
                    {
                      districts.map((d) => (
                        <SelectItem key={d.District_ID || d.id || d._id}>
                          {formatDistrict(d)}
                        </SelectItem>
                      )) as unknown as any
                    }
                  </Select>
                ) : (
                  <Input
                    disabled
                    value={
                      formatDistrict(
                        districts.find(
                          (d) =>
                            String(d.District_ID) ===
                            String(selectedDistrictId),
                        ) || null,
                      ) || String(selectedDistrictId || "")
                    }
                    variant="bordered"
                  />
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Coordinator</label>
                {isSysAdmin ? (
                  <Select
                    placeholder="Select coordinator"
                    selectedKeys={
                      selectedCoordinatorId
                        ? [String(selectedCoordinatorId)]
                        : []
                    }
                    onSelectionChange={(keys: any) => {
                      const id = Array.from(keys)[0] as string;

                      setSelectedCoordinatorId(id);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                  >
                    <SelectItem key="">Select coordinator</SelectItem>
                    {
                      coordinators.map((c) => {
                        // possible name locations (coordinator service returns Staff with capital S)
                        const staff = c.Staff || c.staff || c.user || null;
                        const first =
                          c.First_Name ||
                          c.firstName ||
                          c.FirstName ||
                          c.first_name ||
                          (staff &&
                            (staff.First_Name ||
                              staff.firstName ||
                              staff.firstName)) ||
                          "";
                        const last =
                          c.Last_Name ||
                          c.lastName ||
                          c.LastName ||
                          c.last_name ||
                          (staff &&
                            (staff.Last_Name ||
                              staff.lastName ||
                              staff.lastName)) ||
                          "";
                        const name = [first, last].filter(Boolean).join(" ");
                        const fallback =
                          c.name ||
                          c.label ||
                          c.email ||
                          c.Coordinator_ID ||
                          c._id ||
                          c.id;

                        return (
                          <SelectItem key={c.Coordinator_ID || c.id || c._id}>
                            {name || fallback}
                          </SelectItem>
                        );
                      }) as unknown as any
                    }
                  </Select>
                ) : (
                  <Input
                    disabled
                    value={
                      coordinatorName || String(selectedCoordinatorId || "")
                    }
                    variant="bordered"
                  />
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Max uses</label>
                <Input
                  type="number"
                  value={String(maxUses)}
                  variant="bordered"
                  onChange={(e) =>
                    setMaxUses(
                      Math.max(
                        1,
                        Number((e.target as HTMLInputElement).value || 1),
                      ),
                    )
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Expires at (optional)
                </label>
                {/* Use the shared DatePicker used elsewhere and prevent past dates via client-side validation */}
                <DatePicker
                  hideTimeZone
                  classNames={{
                    base: "w-full",
                    inputWrapper:
                      "border-default-200 hover:border-default-400 h-10",
                    input: "text-sm",
                  }}
                  granularity="day"
                  value={expiresAt}
                  variant="bordered"
                  onChange={setExpiresAt}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">Generated code:</p>
              <div className="p-3 bg-default-100 rounded text-lg font-mono">
                {generated?.Code}
              </div>
              <div className="flex gap-2">
                <Button onPress={handleCopy}>Copy</Button>
                <Button
                  variant="bordered"
                  onPress={() => {
                    setGenerated(null);
                  }}
                >
                  Create another
                </Button>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {!generated ? (
            <>
              <Button variant="bordered" onPress={onClose}>
                Cancel
              </Button>
              <Button
                className="bg-black text-white"
                color="default"
                isDisabled={isSubmitting || !selectedCoordinatorId}
                onPress={handleSubmit}
              >
                {isSubmitting ? "Creating..." : "Generate"}
              </Button>
            </>
          ) : (
            <Button onPress={onClose}>Close</Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
