"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Eye, EyeSlash, Check } from "@gravity-ui/icons";

export default function ActivateAccount() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const inputClass =
    "text-sm h-10 bg-white border border-gray-200 rounded-lg placeholder-gray-400 px-3 shadow-sm";

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError("Activation token is missing");
      setLoading(false);
      return;
    }
    setToken(tokenParam);
    verifyToken(tokenParam);
  }, [searchParams]);

  const verifyToken = async (tokenValue: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/auth/activate-account?token=${encodeURIComponent(tokenValue)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Invalid or expired activation token");
      }

      setUserInfo(data.data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to verify activation token");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("Password is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setActivating(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/activate-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to activate account");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/signin");
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Failed to activate account");
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[400px] mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 border-4 border-danger-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-600">Verifying activation token...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !userInfo) {
    return (
      <div className="w-full max-w-[400px] mx-auto">
        <div className="space-y-1 mb-8">
          <h1 className="text-2xl font-semibold text-danger-600">
            Activation Failed
          </h1>
          <p className="text-sm text-gray-600">
            Unable to verify your activation link
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
        <div className="text-center">
          <Link
            className="text-danger-600 hover:underline font-medium"
            href="/auth/signin"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-[400px] mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Account Activated!
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Your account has been successfully activated. Redirecting to sign in...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <div className="space-y-1 mb-8">
        <h1 className="text-2xl font-semibold text-danger-600">
          Activate Your Account
        </h1>
        <p className="text-sm text-gray-600">
          Set your password to complete account activation
        </p>
      </div>

      {userInfo && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Account:</span> {userInfo.fullName || userInfo.email}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {userInfo.email}
          </p>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleActivate}>
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
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
            Confirm Password <span className="text-danger-500">*</span>
          </label>
          <div className="relative">
            <input
              className={`${inputClass} w-full pr-10`}
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
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

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <Button
          className="w-full bg-danger-600 hover:bg-danger-700 text-white"
          color="primary"
          isLoading={activating}
          size="md"
          type="submit"
        >
          {activating ? "Activating..." : "Activate Account"}
        </Button>
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

