"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Eye, EyeSlash, Check } from "@gravity-ui/icons";
import { Select, SelectItem } from "@heroui/select";

export default function SignUp() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [codeValidated, setCodeValidated] = useState(false);
  const [validatedData, setValidatedData] = useState<any>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const [showModal, setShowModal] = useState(false);

  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const [formData, setFormData] = useState({
    First_Name: "",
    Middle_Name: "",
    Last_Name: "",
    Phone_Number: "",
    Password: "",
    ConfirmPassword: "",
    Province: "",
    District: "",
    Municipality: "",
    Organization_Institution: "",
    Field: "",
    Email: "",
    Verification_Code: "",
    Account_Type: "", 
  });

  const update = (patch: Partial<typeof formData>) =>
    setFormData((p) => ({ ...p, ...patch }));

  const inputClass =
    "text-sm h-10 bg-white border border-gray-200 rounded-lg placeholder-gray-400 px-3 shadow-sm";

  // Helper to move priority-named items to the top of a list while preserving
  // the relative order of the remaining items.
  const prioritize = (items: any[], priorities: string[] = []) => {
    if (!Array.isArray(items) || items.length === 0) return items;
    const set = new Set(priorities);
    const first = items.filter((i) => set.has(i?.name));
    const rest = items.filter((i) => !set.has(i?.name));
    return [...first, ...rest];
  };

  const validateStep = () => {
    if (step === 0) {
      return !!(
        formData.First_Name.trim() &&
        formData.Last_Name.trim() &&
        formData.Phone_Number.trim() &&
        formData.Email.trim() &&
        formData.Account_Type.trim() 
      );
    }
    if (step === 1) {
      return !!(formData.Account_Type && formData.Province && formData.District && formData.Municipality);
    }
    if (step === 2) {
      return (
        formData.Password.length >= 8 &&
        formData.Password === formData.ConfirmPassword
      );
    }
    if (step === 3) {
      return !!formData.Email.trim() && emailVerified;
    }
    return true;
  };

  // Fetch provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const res = await fetch(`${API_URL}/api/locations/provinces`);
        const data = await res.json();
        if (data.success) setProvinces(data.data);
      } catch (err) {
        console.error("Failed to fetch provinces", err);
      }
    };
    fetchProvinces();
  }, [API_URL]);

  // Fetch districts when province changes
  useEffect(() => {
    if (formData.Province) {
      const fetchDistricts = async () => {
        try {
          const res = await fetch(`${API_URL}/api/locations/provinces/${formData.Province}/districts`);
          const data = await res.json();
          if (data.success) setDistricts(data.data);
        } catch (err) {
          console.error("Failed to fetch districts", err);
        }
      };
      fetchDistricts();
      // Clear district and municipality
      update({ District: "", Municipality: "" });
      setMunicipalities([]);
    } else {
      setDistricts([]);
      setMunicipalities([]);
      update({ District: "", Municipality: "" });
    }
  }, [formData.Province, API_URL]);

  // Fetch municipalities when district changes
  useEffect(() => {
    if (formData.District) {
      const fetchMunicipalities = async () => {
        try {
          const res = await fetch(`${API_URL}/api/locations/districts/${formData.District}/municipalities`);
          const data = await res.json();
          if (data.success) setMunicipalities(data.data);
        } catch (err) {
          console.error("Failed to fetch municipalities", err);
        }
      };
      fetchMunicipalities();
      // Clear municipality
      update({ Municipality: "" });
    } else {
      setMunicipalities([]);
      update({ Municipality: "" });
    }
  }, [formData.District, API_URL]);

  const submitToServer = async () => {
    // Not used anymore - registration completes on verification page
  };

  const sendVerificationCode = async () => {
    if (!formData.Email.trim()) return;
    setValidatingCode(true);
    setError(null);
    try {
      const payload = {
        firstName: formData.First_Name,
        middleName: formData.Middle_Name || null,
        lastName: formData.Last_Name,
        email: formData.Email,
        phoneNumber: formData.Phone_Number,
        password: formData.Password,
        organization: formData.Organization_Institution || null,
        province: formData.Province,
        district: formData.District,
        municipality: formData.Municipality,
        accountType: formData.Account_Type, // Added account type to payload
      };
      const res = await fetch(`${API_URL}/api/signup-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body.message || "Failed to send code");
      setEmailSent(true);
      setShowSuccessAnim(true);
      setTimeout(() => setShowSuccessAnim(false), 1400);
    } catch (err: any) {
      setError(err?.message || "Failed to send code");
    } finally {
      setValidatingCode(false);
    }
  };

  const verifyCode = async () => {
    if (!formData.Verification_Code.trim()) return;
    setValidatingCode(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/signup-requests/verify-email?token=${encodeURIComponent(formData.Verification_Code)}`);
      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body.message || "Invalid code");
      setEmailVerified(true);
      setCodeValidated(true);
      setShowSuccessAnim(true);
      setTimeout(() => setShowSuccessAnim(false), 1400);
      // advance to final step (thank you) after successful verification
      setTimeout(() => setStep(4), 600);
    } catch (err: any) {
      setError(err?.message || "Invalid code");
      setCodeValidated(false);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateStep()) {
      setError("Please complete required fields for this step.");
      return;
    }
    // advance through steps; final step index is 4 (thank you)
    if (step < 4) {
      setDirection("next");
      setStep((s) => s + 1);
      return;
    }
    // final action on step 4: show success modal
    setRegistrationSuccess(true);
    setShowModal(true);
  };

  return (
    <div className="w-full max-w-[400px] mx-auto">
      {step < 3 && (
        <div className="space-y-1 mb-8">
          <h1 className="text-2xl font-semibold text-danger-600">Sign Up</h1>
          <p className="text-sm text-gray-600">
            Enter your details to get started
          </p>
        </div>
      )}
      <form onSubmit={handleFormSubmit}>
        {/* Form Content Area - This contains only the form fields */}
        <div className="relative min-h-[380px]">
          {/* Step boxes are absolutely positioned and animated via translate + opacity */}

          {/* Step 1 - Identity */}
          <div
            className={`absolute inset-0 ${step === 0 ? "block" : "hidden"}`}
          >
            <div className="space-y-3">
              <div>
                <label
                  className="text-sm font-medium block mb-1"

                  htmlFor="first-name"
                >
                  First name <span className="text-danger-500">*</span>
                </label>
                <input
                  className={`${inputClass} w-full`}
                  id="first-name"
                  value={formData.First_Name}
                  onChange={(e) => update({ First_Name: e.target.value })}
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="middle-name"
                >
                  Middle name
                </label>
                <input
                  className={`${inputClass} w-full`}
                  id="middle-name"
                  value={formData.Middle_Name}
                  onChange={(e) => update({ Middle_Name: e.target.value })}
                  placeholder="Enter your middle name"
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="last-name"
                >
                  Last name <span className="text-danger-500">*</span>
                </label>
                <input
                  className={`${inputClass} w-full`}
                  id="last-name"
                  value={formData.Last_Name}
                  onChange={(e) => update({ Last_Name: e.target.value })}
                  placeholder="Enter your last name"
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="phone-number"
                >
                  Phone number <span className="text-danger-500">*</span>
                </label>
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-16 h-10 bg-gray-50 border border-gray-200 border-r-0 rounded-l-lg flex items-center justify-center text-sm text-gray-600">
                    +63
                  </div>
                  <input
                    className={`${inputClass} flex-grow rounded-l-none`}
                    id="phone-number"
                    value={formData.Phone_Number}
                    onChange={(e) => update({ Phone_Number: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="email"
                >
                  Email <span className="text-danger-500">*</span>
                </label>
                <input
                  className={`${inputClass} w-full`}
                  id="email"
                  type="email"
                  value={formData.Email}
                  onChange={(e) => update({ Email: e.target.value })}
                  placeholder="Enter your email address"
                />
              </div>
              {/* Added Account Type dropdown */}
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="account-type"
                >
                  Account Type <span className="text-danger-500">*</span>
                </label>
                <Select
                  id="account-type"
                  className="h-10 text-gray-600"
                  placeholder="Select Account Type"
                  selectedKeys={formData.Account_Type ? [formData.Account_Type] : []}
                  radius="md"
                  size="md"
                  variant="bordered"
                  onChange={(e) => update({ Account_Type: e.target.value })}
                >
                  <SelectItem key="LGU">LGU</SelectItem>
                  <SelectItem key="Others">Others</SelectItem>
                </Select>
              </div>
            </div>
          </div>

          {/* Step 2 - Location */}
          <div
            className={`absolute inset-0 ${step === 1 ? "block" : "hidden"}`}
          >
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1" htmlFor="accountType">Account Type <span className="text-danger-500">*</span></label>
                <Select
                  id="accountType"
                  className="h-10"
                  placeholder="Select Account Type"
                  selectedKeys={formData.Account_Type ? [formData.Account_Type] : []}
                  radius="md"
                  size="sm"
                  variant="bordered"
                  onChange={(e) => {
                    const val = e.target.value;
                    update({ Account_Type: val, Province: "", District: "", Municipality: "" });
                    setDistricts([]);
                    setMunicipalities([]);
                  }}
                >
                  <SelectItem key="LGU">LGU</SelectItem>
                  <SelectItem key="Others">Others</SelectItem>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" htmlFor="province">Province <span className="text-danger-500">*</span></label>
                <Select
                  id="province"
                  className="h-10"
                  placeholder="Select Province"
                  selectedKeys={formData.Province ? [formData.Province] : []}
                  radius="md"
                  size="sm"
                  variant="bordered"
                  isDisabled={!formData.Account_Type}
                  onChange={(e) => {
                    const val = e.target.value;
                    update({ Province: val, District: "", Municipality: "" });
                  }}
                >
                  {provinces.map((prov) => (
                    <SelectItem key={prov._id}>{prov.name}</SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" htmlFor="district">District / City <span className="text-danger-500">*</span></label>
                <Select
                  id="district"
                  className="h-10"
                  placeholder="Select District / Category"
                  selectedKeys={formData.District ? [formData.District] : []}
                  radius="md"
                  size="sm"
                  variant="bordered"
                  isDisabled={!formData.Province || !formData.Account_Type}
                  onChange={(e) => {
                    const val = e.target.value;
                    update({ District: val, Municipality: "" });
                  }}
                >
                  {prioritize(districts, ["Blood Service Facilities", "NGO's & Gov't Agencies"]).map((dist) => (
                    <SelectItem key={dist._id}>{dist.name}</SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" htmlFor="municipality">Municipality / City <span className="text-danger-500">*</span></label>
                <Select
                  id="municipality"
                  className="h-10"
                  placeholder="Select City / Municipality / Type"
                  selectedKeys={formData.Municipality ? [formData.Municipality] : []}
                  radius="md"
                  size="sm"
                  variant="bordered"
                  isDisabled={!formData.District || !formData.Account_Type}
                  onChange={(e) => update({ Municipality: e.target.value })}
                >
                  {municipalities.map((mun) => (
                    <SelectItem key={mun._id}>{mun.name}</SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="organization"
                >
                  Organization / Institution
                </label>
                <input
                  className={`${inputClass} w-full`}
                  id="organization"
                  value={formData.Organization_Institution}
                  onChange={(e) =>
                    update({ Organization_Institution: e.target.value })
                  }
                />
              </div>
              {/* removed Field input as requested */}
            </div>
          </div>

          {/* Step 3 - Credentials */}
          <div
            className={`absolute inset-0 ${step === 2 ? "block" : "hidden"}`}
          >
            <div className="space-y-3">
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="password"
                >
                  Password <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <input
                    className={`${inputClass} w-full pr-10`}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.Password}
                    onChange={(e) => update({ Password: e.target.value })}
                  />
                  <button
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlash className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-default-500 mt-1">
                  Must be at least 8 characters
                </p>
              </div>
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="confirm-password"
                >
                  Confirm password <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <input
                    className={`${inputClass} w-full pr-10`}
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.ConfirmPassword}
                    onChange={(e) =>
                      update({ ConfirmPassword: e.target.value })
                    }
                  />
                  <button
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeSlash className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 - Email Verification */}
          <div className={`absolute inset-0 ${step === 3 ? "block" : "hidden"}`}>
            <div>
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold text-danger-600">Enter your code</h2>
                <p className="text-sm text-gray-500">Enter the code sent to your email {formData.Email ? formData.Email.replace(/(.{1})(.*)(@.*)/, (m,p1,p2,p3)=> p1 + '*'.repeat(Math.max(0,p2.length)) + p3) : ''}</p>

                <div className="mt-4 p-4 bg-white rounded-md">
                  <h3 className="text-sm font-medium text-gray-900">Verify account</h3>
                  <p className="text-xs text-gray-500 mt-1">We have sent a code to {formData.Email ? formData.Email.replace(/(.{1})(.*)(@.*)/, (m,p1,p2,p3)=> p1 + '*'.repeat(Math.max(0,p2.length)) + p3) : ''}</p>

                  <div className="mt-4 flex items-center justify-center gap-3">
                    {Array.from({ length: 6 }).map((_, i) => {
                      const digit = formData.Verification_Code?.[i] || "";
                      return (
                        <div key={i} className="flex items-center">
                          <input
                            className="w-12 h-12 text-center border border-gray-200 rounded-md text-lg bg-white"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, "");
                              const arr = (formData.Verification_Code || "").padEnd(6, "").split("").slice(0,6);
                              arr[i] = v ? v[0] : "";
                              update({ Verification_Code: arr.join("").trim() });
                              if (v && i < 5) {
                                const next = document.getElementById(`code-${i+1}`) as HTMLInputElement | null;
                                next?.focus();
                              }
                            }}
                            onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                              e.preventDefault();
                              const paste = e.clipboardData?.getData("text") || "";
                              const digits = paste.replace(/\D/g, "");
                              if (!digits) return;
                              // populate starting at current index
                              const arr = (formData.Verification_Code || "").padEnd(6, "").split("").slice(0,6);
                              for (let j = 0; j < digits.length && i + j < 6; j++) {
                                arr[i + j] = digits[j];
                              }
                              const newCode = arr.join("").trim();
                              update({ Verification_Code: newCode });
                              const lastFilled = Math.min(5, i + digits.length - 1);
                              setTimeout(() => {
                                const el = document.getElementById(`code-${lastFilled}`) as HTMLInputElement | null;
                                el?.focus();
                              }, 0);
                            }}
                            id={`code-${i}`}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace") {
                                const arr = (formData.Verification_Code || "").padEnd(6, "").split("").slice(0,6);
                                arr[i] = "";
                                update({ Verification_Code: arr.join("").trim() });
                                if (i > 0) {
                                  const prev = document.getElementById(`code-${i-1}`) as HTMLInputElement | null;
                                  prev?.focus();
                                }
                              }
                            }}
                          />
                          {i === 2 && <div className="mx-2 text-xl text-gray-400">-</div>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 text-sm text-gray-600 text-center">
                    <span>Didn't receive a code? </span>
                    <button
                      className="text-sm font-medium text-danger-600 underline"
                      type="button"
                      onClick={() => {
                        setError(null);
                        sendVerificationCode();
                      }}
                      disabled={validatingCode}
                    >
                      Resend
                    </button>
                  </div>

                  <div className="mt-6">
                    <button
                      className="w-full bg-danger-600 hover:bg-danger-700 text-white py-3 rounded-full"
                      type="button"
                      onClick={() => {
                        if (!emailSent) sendVerificationCode();
                        else verifyCode();
                      }}
                      disabled={!formData.Email.trim() || validatingCode || (emailSent && emailVerified)}
                    >
                      <span className="flex items-center justify-center gap-2">
                        {validatingCode && (
                          <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                        )}
                        {validatingCode ? (emailSent ? "Verifying..." : "Sending...") : !emailSent ? "Send Verification Code" : emailVerified ? "Code Verified" : "Verify"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5 (index 4) - Thank you / final step shown after verification */}
          <div className={`absolute inset-0 ${step === 4 ? "block" : "hidden"}`}>
            <div className="flex items-center justify-center min-h-[380px]">
              <div className="max-w-md w-full text-center px-4">
                <h2 className="text-3xl font-semibold text-danger-600 mb-4">Thank you</h2>
                <p className="text-sm text-gray-600 mb-4">Thank you for submitting your documents.</p>
                <p className="text-sm text-gray-500 mb-6">We are currently reviewing them and will notify you via email once your account has been confirmed and approved.</p>
                <p className="text-sm text-gray-500 mb-6">We appreciate your interest in UNITE and look forward to working with you as part of our ecosystem.</p>
                <div className="mb-6">
                  <Button
                    className="w-full bg-danger-600 hover:bg-danger-700 text-white py-3 rounded-full"
                    onClick={() => {
                      // final complete registration action: show success modal
                      setShowModal(true);
                    }}
                  >
                    Complete Registration
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20">
          {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

          {/* Hide bottom navigation when on verification step (step 3) or final step (step 4) */}
          {step !== 3 && step !== 4 && (
            <div className="flex justify-center">
              <div className="w-full max-w-[400px] flex items-center gap-3">
                {step > 0 ? (
                  <button
                    className="px-4 h-10 border border-gray-200 rounded-lg text-sm flex items-center justify-center"
                    type="button"
                    onClick={() => {
                      setDirection("prev");
                      setStep((s) => Math.max(0, s - 1));
                    }}
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex-1">
                  <Button
                    className="w-full bg-danger-600 hover:bg-danger-700 text-white h-10 min-h-10 py-0 rounded-lg"
                    color="primary"
                    isLoading={isLoading}
                    size="md"
                    type="submit"
                  >
                    {step < 4 ? "Next" : "Complete Registration"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Already have an account section - completely separate */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link
          className="text-danger-600 hover:underline font-medium"
          href="/auth/signin"
        >
          Sign in
        </Link>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Registration Successful!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Your sign-up request has been submitted successfully. It is now pending coordinator approval. You will be notified once it's approved.
              </p>
              <Button
                className="w-full bg-danger-600 hover:bg-danger-700 text-white"
                onClick={() => {
                  setShowModal(false);
                  router.push("/");
                }}
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}