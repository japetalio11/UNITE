"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// use native inputs here for tighter visual control
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Eye, EyeSlash, Check } from "@gravity-ui/icons";

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
  });

  const update = (patch: Partial<typeof formData>) =>
    setFormData((p) => ({ ...p, ...patch }));

  const inputClass =
    "text-sm h-10 bg-white border border-gray-200 rounded-lg placeholder-gray-400 px-3 shadow-sm";

  const validateStep = () => {
    if (step === 0) {
      return !!(
        formData.First_Name.trim() &&
        formData.Last_Name.trim() &&
        formData.Phone_Number.trim()
      );
    }
    if (step === 1) {
      return !!(formData.Province && formData.District && formData.Municipality);
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
    if (step < 3) {
      setDirection("next");
      setStep((s) => s + 1);
      return;
    }
    // Email verification step - just show that email was sent
    if (!emailSent) {
      setError("Please send the verification email first.");
      return;
    }
    setRegistrationSuccess(true);
    setShowModal(true);
  };

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <div className="space-y-1 mb-8">
        <h1 className="text-2xl font-semibold text-danger-600">Sign Up</h1>
        <p className="text-sm text-gray-600">
          Enter your details to get started
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleFormSubmit}>
        <div className="relative min-h-[380px] pb-40">
          {/* Step boxes are absolutely positioned and animated via translate + opacity */}

          {/* Step 1 - Identity */}
          <div
            className={`absolute inset-0 ${step === 0 ? "block" : "hidden"}`}
          >
            <div className="space-y-3 pb-20">
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
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="phone-number"
                >
                  Phone number <span className="text-danger-500">*</span>
                </label>
                <input
                  className={`${inputClass} w-full`}
                  id="phone-number"
                  value={formData.Phone_Number}
                  onChange={(e) => update({ Phone_Number: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Step 2 - Location */}
          <div
            className={`absolute inset-0 ${step === 1 ? "block" : "hidden"}`}
          >
            <div className="space-y-3 pb-20">
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="province"
                >
                  Province <span className="text-danger-500">*</span>
                </label>
                <select
                  className={`${inputClass} w-full`}
                  id="province"
                  value={formData.Province}
                  onChange={(e) => update({ Province: e.target.value })}
                >
                  <option value="">Select Province</option>
                  {provinces.map((prov) => (
                    <option key={prov._id} value={prov._id}>
                      {prov.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="district"
                >
                  District <span className="text-danger-500">*</span>
                </label>
                <select
                  className={`${inputClass} w-full`}
                  id="district"
                  value={formData.District}
                  onChange={(e) => update({ District: e.target.value })}
                  disabled={!formData.Province}
                >
                  <option value="">Select District</option>
                  {districts.map((dist) => (
                    <option key={dist._id} value={dist._id}>
                      {dist.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="municipality"
                >
                  Municipality <span className="text-danger-500">*</span>
                </label>
                <select
                  className={`${inputClass} w-full`}
                  id="municipality"
                  value={formData.Municipality}
                  onChange={(e) => update({ Municipality: e.target.value })}
                  disabled={!formData.District}
                >
                  <option value="">Select Municipality</option>
                  {municipalities.map((mun) => (
                    <option key={mun._id} value={mun._id}>
                      {mun.name}
                    </option>
                  ))}
                </select>
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
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="field"
                >
                  Field
                </label>
                <input
                  className={`${inputClass} w-full`}
                  id="field"
                  value={formData.Field}
                  onChange={(e) => update({ Field: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Step 3 - Credentials */}
          <div
            className={`absolute inset-0 ${step === 2 ? "block" : "hidden"}`}
          >
            <div className="space-y-3 pb-20">
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
          <div
            className={`absolute inset-0 ${step === 3 ? "block" : "hidden"}`}
          >
            <div className="pb-20">
              <div className="space-y-3">
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
                    onChange={(e) => {
                      update({ Email: e.target.value });
                      setEmailSent(false);
                      setEmailVerified(false);
                      setCodeValidated(false);
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                    type="button"
                    onClick={sendVerificationCode}
                    disabled={!formData.Email.trim() || emailSent}
                  >
                    {validatingCode ? "Sending..." : emailSent ? "Code Sent" : "Send Verification Code"}
                  </button>
                </div>
                {emailSent && (
                  <p className="text-sm text-gray-600 mt-2">
                    Check your email for the verification code to complete your signup.
                  </p>
                )}
                {emailSent && !emailVerified && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      A verification code has been sent to your email. Please check your inbox and enter the code below to complete your registration.
                    </p>
                    <div className="mt-3">
                      <label
                        className="text-sm font-medium block mb-1"
                        htmlFor="verification-code"
                      >
                        Verification Code
                      </label>
                      <input
                        className={`${inputClass} w-full`}
                        id="verification-code"
                        value={formData.Verification_Code}
                        onChange={(e) => update({ Verification_Code: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm"
                        onClick={verifyCode}
                        disabled={validatingCode}
                      >
                        {validatingCode ? "Verifying..." : "Verify Code"}
                      </button>
                    </div>
                  </div>
                )}
                {emailSent && emailVerified && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <Check className="w-5 h-5" />
                      <p className="text-sm font-medium">Email verified successfully!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
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
              className="w-full bg-danger-600 hover:bg-danger-700 text-white"
              color="primary"
              isLoading={isLoading}
              size="md"
              type="submit"
            >
              {step < 3 ? "Next" : "Complete Registration"}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link
          className="text-danger-600 hover:underline font-medium"
          href="/auth/signin"
        >
          Sign in
        </Link>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
