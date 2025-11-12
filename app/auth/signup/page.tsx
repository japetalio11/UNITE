"use client";

import { useState } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Checkbox } from "@heroui/checkbox";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNumber: "",
    accountType: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Sign up:", formData);
    } catch (error) {
      console.error("Sign up error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const target = e.target as HTMLInputElement; // Type assertion for checked property
    const checked = 'checked' in target ? target.checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <div className="space-y-1 mb-8">
        <Link href="/auth/signin" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to login
        </Link>
        <h1 className="text-2xl font-semibold text-danger-600">Sign Up</h1>
        <p className="text-sm text-gray-600">Enter your details to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-1.5">
            Name <span className="text-danger-500">*</span>
          </label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={handleChange}
            isRequired
            classNames={{
              input: "text-sm h-10",
              inputWrapper: "border-gray-200 hover:border-gray-400"
            }}
          />
        </div>
        
        <div>
          <label htmlFor="contactNumber" className="text-sm font-medium text-gray-700 block mb-1.5">
            Contact Number <span className="text-danger-500">*</span>
          </label>
          <Input
            id="contactNumber"
            name="contactNumber"
            type="tel"
            placeholder="Enter your contact number"
            value={formData.contactNumber}
            onChange={handleChange}
            isRequired
            classNames={{
              input: "text-sm h-10",
              inputWrapper: "border-gray-200 hover:border-gray-400"
            }}
          />
        </div>
        
        <div>
          <label htmlFor="accountType" className="text-sm font-medium text-gray-700 block mb-1.5">
            Account Type <span className="text-danger-500">*</span>
          </label>
          <select
            id="accountType"
            name="accountType"
            value={formData.accountType}
            onChange={handleChange}
            className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select account type</option>
            <option value="hospital">Hospital</option>
            <option value="stakeholder">Stakeholder</option>
          </select>
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-1.5">
            Email Address <span className="text-danger-500">*</span>
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="johndoe@email.com"
            value={formData.email}
            onChange={handleChange}
            isRequired
            classNames={{
              input: "text-sm h-10",
              inputWrapper: "border-gray-200 hover:border-gray-400"
            }}
          />
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-1.5">
            Create Password <span className="text-danger-500">*</span>
          </label>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            isRequired
            classNames={{
              input: "text-sm h-10",
              inputWrapper: "border-gray-200 hover:border-gray-400"
            }}
            endContent={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
          />
          <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 block mb-1.5">
            Confirm Password <span className="text-danger-500">*</span>
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            isRequired
            classNames={{
              input: "text-sm h-10",
              inputWrapper: "border-gray-200 hover:border-gray-400"
            }}
            endContent={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="focus:outline-none text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
          />
        </div>

        <div className="flex items-center justify-center p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="captcha" required 
              className="w-4 h-4 text-danger-600 border-gray-300 rounded focus:ring-danger-500"
            />
            <label htmlFor="captcha" className="text-sm font-medium text-gray-700">
              I'm not a robot
            </label>
          </div>
        </div>

        <div>
          <Button
            type="submit"
            size="md"
            color="primary"
            className="w-full bg-danger-600 hover:bg-danger-700 text-white"
            isLoading={isLoading}
          >
            Let's get you started
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/auth/signin" className="text-danger-600 hover:underline font-medium">
          Sign in
        </Link>
      </div>
    </div>
  );
}