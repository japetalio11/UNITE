"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Checkbox } from "@heroui/checkbox";
import Image from "next/image";
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
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      let body = await res.json().catch(() => ({}));

      // If staff login failed, try stakeholder login
      if (!res.ok || body.success === false) {
        res = await fetch(`${API_URL}/api/stakeholders/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
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

      // Persist auth details: token + user
      const storage = rememberMe ? localStorage : sessionStorage;
      if (token) storage.setItem("unite_token", token);
      if (data) storage.setItem("unite_user", JSON.stringify(data));

      // Also write a sanitized legacy `unite_user` object to localStorage
      // (development compatibility). This ensures the UNITE Sidebar's
      // client-side getUserInfo() can reliably detect roles during
      // hydration even when the app used sessionStorage or a different key.
      try {
        const legacy = {
          role: data?.staff_type || data?.role || null,
          isAdmin:
            !!data?.isAdmin ||
            String(data?.staff_type || "").toLowerCase().includes("admin") ||
            (String(data?.role || "").toLowerCase().includes("sys") &&
              String(data?.role || "").toLowerCase().includes("admin")),
          First_Name: data?.First_Name || data?.first_name || null,
          email: data?.Email || data?.email || null,
          id: data?.id || data?.ID || null,
        };
        if (typeof window !== "undefined") localStorage.setItem("unite_user", JSON.stringify(legacy));
      } catch (e) {
        // swallow any client storage errors
      }

      // Emit an in-window event to notify client-side components of an
      // auth change (useful for SPA flows where storage events don't fire
      // in the same window). Then navigate to dashboard. For maximum
      // reliability we still perform a full navigation so SSR can read
      // HttpOnly cookies when present.
      try {
        if (typeof window !== 'undefined') {
          try { window.dispatchEvent(new CustomEvent('unite:auth-changed', { detail: { role: data?.role, isAdmin: data?.isAdmin } })); } catch (e) {}
        }
      } catch (e) {}

      // Use a full navigation so the browser sends the HttpOnly cookie and
      // the Next.js server-layout can read it during SSR.
      if (typeof window !== 'undefined') {
        window.location.assign('/dashboard');
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium mb-1.5 block"
              >
                Email
                <span className="text-danger ml-1" aria-label="required">
                  *
                </span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="johndoe@email.com"
                size="md"
                variant="bordered"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                isRequired
                autoComplete="email"
                classNames={{
                  input: "text-sm",
                  inputWrapper: "border-default-200 hover:border-default-400",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium mb-1.5 block"
              >
                Password
                <span className="text-danger ml-1" aria-label="required">
                  *
                </span>
              </label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                size="md"
                variant="bordered"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isRequired
                autoComplete="current-password"
                classNames={{
                  input: "text-sm",
                  inputWrapper: "border-default-200 hover:border-default-400",
                }}
                endContent={
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="focus:outline-none"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
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
              />
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Checkbox
                id="remember"
                isSelected={rememberMe}
                onValueChange={setRememberMe}
                size="sm"
                color="default"
                classNames={{
                  label: "text-sm text-danger font-medium",
                }}
              >
                Keep me signed in
              </Checkbox>
              <p className="text-[11px] text-default-800 ml-6">
                Recommended on trusted devices
              </p>
            </div>

            <Link
              href="/auth/forgot-password"
              className="text-sm text-danger font-medium hover:opacity-80 transition-opacity whitespace-nowrap"
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
              type="submit"
              size="md"
              color="danger"
              className="w-full text-white"
              isLoading={isLoading}
              endContent={!isLoading}
            >
              Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
