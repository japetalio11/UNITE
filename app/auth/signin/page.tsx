"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Checkbox } from "@heroui/checkbox";
import { Eye, EyeOff } from "lucide-react";

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const payload = { email, password };

    try {
      // Try staff/admin/coordinator login first
      // Note: backend mounts auth routes at /api (not /api/auth)
      let res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      let body = await res.json().catch(() => ({}));

      // If staff login failed, try stakeholder login
      if (!res.ok || body.success === false) {
        res = await fetch(`${API_URL}/api/stakeholders/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        body = await res.json().catch(() => ({}));
      }

      if (!res.ok || body.success === false) {
        setError(body.message || "Invalid credentials");
        setIsLoading(false);

        return;
      }

      const { token, data } = body;

      // Debug: Log response data to help diagnose production issues
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Response data:", {
          hasToken: !!token,
          hasData: !!data,
          staffType: data?.StaffType || data?.staff_type || data?.role,
          isAdmin: data?.isAdmin,
          dataKeys: data ? Object.keys(data) : [],
        });
      }

      // Persist auth details: token + user
      const storage = rememberMe ? localStorage : sessionStorage;

      if (token) storage.setItem("unite_token", token);
      if (data) storage.setItem("unite_user", JSON.stringify(data));

      // Also write a sanitized legacy `unite_user` object to localStorage
      // (development compatibility). This ensures the UNITE Sidebar's
      // client-side getUserInfo() can reliably detect roles during
      // hydration even when the app used sessionStorage or a different key.
      try {
        // Get StaffType from response - backend now includes this field
        const staffType =
          data?.StaffType || data?.staff_type || data?.role || null;
        const staffTypeStr = String(staffType || "").toLowerCase();

        // Determine if user is Admin: StaffType === 'Admin' or explicit isAdmin flag
        // This is critical for sidebar to show correct icons
        const isAdminUser =
          !!data?.isAdmin ||
          staffType === "Admin" ||
          staffTypeStr === "admin" ||
          (staffTypeStr.includes("sys") && staffTypeStr.includes("admin"));

        const legacy = {
          role: staffType,
          StaffType: staffType, // CRITICAL: Sidebar needs this exact field name
          staff_type: staffType, // Also include lowercase variant for compatibility
          isAdmin: isAdminUser,
          First_Name:
            data?.First_Name || data?.first_name || data?.FirstName || null,
          email: data?.Email || data?.email || null,
          id:
            data?.id ||
            data?.ID ||
            data?._id ||
            data?.Stakeholder_ID ||
            data?.StakeholderId ||
            data?.stakeholder_id ||
            data?.Coordinator_ID ||
            data?.CoordinatorId ||
            data?.coordinator_id ||
            data?.user_id ||
            null,
          // Include all original data for full compatibility
          ...data,
        };

        if (typeof window !== "undefined") {
          localStorage.setItem("unite_user", JSON.stringify(legacy));

          // Debug: Verify what was stored
          if (process.env.NODE_ENV === "development") {
            console.log("[Login] Stored legacy object:", {
              StaffType: legacy.StaffType,
              role: legacy.role,
              isAdmin: legacy.isAdmin,
              hasStaffType: !!legacy.StaffType,
            });
          }
        }
      } catch (e) {
        // Log error in development to help debug production issues
        console.error("Error storing user info:", e);
      }

      // Emit an in-window event to notify client-side components of an
      // auth change (useful for SPA flows where storage events don't fire
      // in the same window). Then navigate to dashboard. For maximum
      // reliability we still perform a full navigation so SSR can read
      // HttpOnly cookies when present.
      try {
        if (typeof window !== "undefined") {
          try {
            window.dispatchEvent(
              new CustomEvent("unite:auth-changed", {
                detail: { role: data?.role, isAdmin: data?.isAdmin },
              }),
            );
          } catch (e) {}
        }
      } catch (e) {}

      // Use a full navigation so the browser sends the HttpOnly cookie and
      // the Next.js server-layout can read it during SSR.
      if (typeof window !== "undefined") {
        window.location.assign("/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const [error, setError] = useState("");

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="w-full max-w-[360px]">
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold mb-6 text-danger">Sign in</h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                className="text-sm font-medium mb-1.5 block"
                htmlFor="email"
              >
                Email
                <span aria-label="required" className="text-danger ml-1">
                  *
                </span>
              </label>
              <Input
                isRequired
                autoComplete="email"
                classNames={{
                  input: "text-sm",
                  inputWrapper: "border-default-200 hover:border-default-400",
                }}
                id="email"
                placeholder="johndoe@email.com"
                size="md"
                type="email"
                value={email}
                variant="bordered"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label
                className="text-sm font-medium mb-1.5 block"
                htmlFor="password"
              >
                Password
                <span aria-label="required" className="text-danger ml-1">
                  *
                </span>
              </label>
              <Input
                isRequired
                autoComplete="current-password"
                classNames={{
                  input: "text-sm",
                  inputWrapper: "border-default-200 hover:border-default-400",
                }}
                endContent={
                  <button
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="focus:outline-none"
                    type="button"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <Eye
                        className="text-default-800 pointer-events-none"
                        size={20}
                      />
                    ) : (
                      <EyeOff
                        className="text-default-800 pointer-events-none"
                        size={20}
                      />
                    )}
                  </button>
                }
                id="password"
                placeholder="Enter password"
                size="md"
                type={showPassword ? "text" : "password"}
                value={password}
                variant="bordered"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Checkbox
                classNames={{
                  label: "text-sm text-danger font-medium",
                }}
                color="default"
                id="remember"
                isSelected={rememberMe}
                size="sm"
                onValueChange={setRememberMe}
              >
                Keep me signed in
              </Checkbox>
              <p className="text-[11px] text-default-800 ml-6">
                Recommended on trusted devices
              </p>
            </div>

            <Link
              className="text-sm text-danger font-medium hover:opacity-80 transition-opacity whitespace-nowrap"
              href="/auth/forgot-password"
            >
              Forgot Password?
            </Link>
          </div>

          {error && (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          )}

          <div>
            <Button
              className="w-full text-white"
              color="danger"
              endContent={!isLoading}
              isLoading={isLoading}
              size="md"
              type="submit"
            >
              Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
