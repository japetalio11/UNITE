"use client";

import { useEffect, useState } from "react";
// use native inputs here for tighter visual control
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Eye, EyeOff, Check } from "lucide-react";

export default function SignUp() {
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

  const provinces = [
    "",
    "Albay",
    "Camarines Sur",
    "Sorsogon",
    "Catanduanes",
    "Masbate",
  ];

  const [formData, setFormData] = useState({
    First_Name: "",
    Middle_Name: "",
    Last_Name: "",
    Email: "",
    Phone_Number: "",
    Password: "",
    ConfirmPassword: "",
    Province_Name: "",
    City_Municipality: "",
    Organization_Institution: "",
    Field: "",
    Registration_Code: "",
    District_ID: undefined as string | undefined,
    Coordinator_ID: undefined as string | undefined,
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
        formData.Email.trim() &&
        formData.Phone_Number.trim()
      );
    }
    if (step === 1) {
      return (
        formData.Password.length >= 8 &&
        formData.Password === formData.ConfirmPassword
      );
    }
    if (step === 2) {
      return !!formData.City_Municipality.trim();
    }

    return true;
  };

  const submitToServer = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload: any = {
        First_Name: formData.First_Name,
        Middle_Name: formData.Middle_Name || null,
        Last_Name: formData.Last_Name,
        Email: formData.Email,
        Phone_Number: formData.Phone_Number,
        Password: formData.Password,
        Province_Name: formData.Province_Name,
        City_Municipality: formData.City_Municipality,
        Organization_Institution: formData.Organization_Institution || null,
        Field: formData.Field || null,
        Registration_Code: formData.Registration_Code || null,
        District_ID: formData.District_ID || null,
        Coordinator_ID: formData.Coordinator_ID || null,
      };

      const res = await fetch(`${API_URL}/api/stakeholders/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body.message || "Registration failed");
      // show brief success message then redirect
      setRegistrationSuccess(true);
      setTimeout(() => {
        if (typeof window !== "undefined")
          window.location.assign("/auth/signin");
      }, 1800);
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setIsLoading(false);
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
    // final submit
    if (formData.Password !== formData.ConfirmPassword) {
      setError("Passwords do not match.");

      return;
    }

    // If a registration code is present but not yet validated, validate it automatically
    if (formData.Registration_Code?.trim() && !codeValidated) {
      setError(null);
      const r = await validateRegistrationCode(
        formData.Registration_Code.trim(),
      );

      if (!r.success) {
        setError(String(r.message || "Invalid registration code"));

        return;
      }
    }

    await submitToServer();
  };

  // validate registration code with backend and autofill province/district/coordinator
  const validateRegistrationCode = async (code: string) => {
    if (!code || !API_URL) return { success: false };
    setValidatingCode(true);
    try {
      const res = await fetch(
        `${API_URL}/api/registration-codes/validate?code=${encodeURIComponent(code)}`,
      );
      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(body.message || "Invalid code");
      // fill form fields
      setFormData((p) => ({
        ...p,
        Province_Name: body.data?.Province_Name || p.Province_Name,
        District_ID: body.data?.District_ID || p.District_ID,
        Coordinator_ID: body.data?.Coordinator_ID || p.Coordinator_ID,
      }));
      setCodeValidated(true);
      setValidatedData(body.data || null);
      // trigger short success animation
      setShowSuccessAnim(true);
      setTimeout(() => setShowSuccessAnim(false), 1400);
      setError(null);

      return { success: true, data: body.data };
    } catch (err: any) {
      setCodeValidated(false);
      setValidatedData(null);

      return { success: false, message: err?.message || "Invalid code" };
    } finally {
      setValidatingCode(false);
    }
  };

  // Auto-validate registration code after user types 6+ chars (debounced)
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const code = formData.Registration_Code?.trim() || "";

    // clear states when empty
    if (!code) {
      setRegistrationError(null);
      setCodeValidated(false);
      setValidatedData(null);

      return;
    }

    if (step === 3) {
      if (code.length >= 6) {
        // debounce before validating
        timer = setTimeout(async () => {
          const r = await validateRegistrationCode(code);

          if (!cancelled) {
            if (!r.success)
              setRegistrationError(
                String(r.message || "Invalid registration code"),
              );
            else setRegistrationError(null);
          }
        }, 450);
      } else {
        // too short: clear validation state
        setRegistrationError(null);
        setCodeValidated(false);
        setValidatedData(null);
      }
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [formData.Registration_Code, step]);

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

          {/* Step 2 - Credentials */}
          <div
            className={`absolute inset-0 ${step === 1 ? "block" : "hidden"}`}
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
                      <EyeOff className="w-4 h-4" />
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
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 - Location & Org */}
          <div
            className={`absolute inset-0 ${step === 2 ? "block" : "hidden"}`}
          >
            <div className="space-y-3 pb-20">
              {/* Province is determined by registration code (no UI input) */}
              <div>
                <label
                  className="text-sm font-medium block mb-1"
                  htmlFor="city-municipality"
                >
                  City / Municipality <span className="text-danger-500">*</span>
                </label>
                <input
                  className={`${inputClass} w-full`}
                  id="city-municipality"
                  value={formData.City_Municipality}
                  onChange={(e) =>
                    update({ City_Municipality: e.target.value })
                  }
                />
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

          {/* Step 4 - Registration Code */}
          <div
            className={`absolute inset-0 ${step === 3 ? "block" : "hidden"}`}
          >
            <div className="pb-20">
              <label
                className="text-sm font-medium block mb-1"
                htmlFor="registration-code"
              >
                Registration code
              </label>
              <div className="flex items-center gap-2">
                <input
                  className={`${inputClass} w-full`}
                  id="registration-code"
                  value={formData.Registration_Code}
                  onChange={(e) => {
                    update({ Registration_Code: e.target.value });
                    setCodeValidated(false);
                    setValidatedData(null);
                    setRegistrationError(null);
                  }}
                />
                <div className="flex items-center gap-2">
                  {validatingCode ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-t-transparent border-gray-300 animate-spin" />
                      Checking
                    </span>
                  ) : codeValidated ? (
                    <div className="relative inline-flex items-center">
                      {showSuccessAnim && (
                        <span className="absolute -inset-1 flex items-center justify-center">
                          <span className="w-9 h-9 rounded-full bg-green-400 opacity-30 animate-ping" />
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium relative">
                        <Check className="w-4 h-4" /> Verified
                      </span>
                    </div>
                  ) : registrationError ? (
                    <span className="text-sm text-red-600">
                      {registrationError}
                    </span>
                  ) : (
                    <span className="text-sm text-default-500">
                      Will validate automatically
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-default-500 mt-2">
                If you have a registration code from a coordinator, enter it
                here. District and coordinator assignment are done by the
                backend; the code is validated automatically on this step and
                before creating your account.
              </p>
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {registrationSuccess && (
          <div className="text-sm text-green-600">
            Account created successfully — redirecting to sign in...
          </div>
        )}

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
              {step < 3 ? "Next" : "Create account"}
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
    </div>
  );
}
