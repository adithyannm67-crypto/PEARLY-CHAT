"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "../../../components/AuthLayout";
import { useSupabase } from "../../../context/AuthProvider";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { supabase } = useSupabase();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL
  if(!SERVER_URL) {
    throw new Error("NEXT_PUBLIC_SERVER_URL is not defined");
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // Validate password length
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      // Call external server for authentication
      const response = await fetch(`${SERVER_URL}/api/auth/signup`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
          username: username.trim().toLowerCase(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.error) {
        setError(data.error || "Signup failed");
        return;
      }

      // When email confirmation is disabled Supabase returns a session,
      // so sign the browser in and go straight to the dashboard.
      const sessionData = data?.data?.session ?? data?.session;

      if (sessionData?.access_token && sessionData?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });

        if (sessionError) {
          setError("Could not start your session. Please try again.");
          return;
        }

        router.push("/dashboard");
        return;
      }

      // Email confirmation is required - don't send the user to the
      // dashboard without a session.
      setSuccess(
        "Account created. Check your email to confirm your account, then log in."
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <AuthLayout
        title="Create your account"
        subtitle="Join Peerly today"
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">

            {/* Full name */}
            <div className="relative">
              <User
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />

              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                autoComplete="name"
                required
                className="w-full bg-surface border border-border-custom rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
              />
            </div>

            {/* Username */}
            <div className="relative">
              <User
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />

              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                autoComplete="username"
                required
                className="w-full bg-surface border border-border-custom rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />

              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                autoComplete="email"
                required
                className="w-full bg-surface border border-border-custom rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                autoComplete="new-password"
                required
                className="w-full bg-surface border border-border-custom rounded-lg pl-10 pr-10 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {/* Confirm password */}
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />

              <input
                type={
                  showConfirmPassword ? "text" : "password"
                }
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                autoComplete="new-password"
                required
                className="w-full bg-surface border border-border-custom rounded-lg pl-10 pr-10 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-error text-sm mt-3" role="alert">
              {error}
            </p>
          )}

          {/* Success */}
          {success && (
            <p className="text-green-600 text-sm mt-3" role="status">
              {success}
            </p>
          )}

          {/* Signup button */}
          <button
            type="submit"
            disabled={
              isLoading ||
              !name.trim() ||
              !username.trim() ||
              !email.trim() ||
              !password ||
              !confirmPassword
            }
            className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span>Creating account...</span>
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {/* Login navigation */}
          <div className="mt-6 text-center">
            <span className="text-sm text-text-secondary">
              Already have an account?{" "}
            </span>

            <Link
              href="/auth/login"
              className="text-sm text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </form>
      </AuthLayout>
    </div>
  );
}
