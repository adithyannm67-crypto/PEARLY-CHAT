"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import { useSupabase } from "@/components/AuthProvider";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { supabase } = useSupabase();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${SERVER_URL}/api/auth/signin`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.error) {
        setError(data.error || "Authentication failed");
        return;
      }

      // Keep the Supabase browser session in sync so the dashboard can
      // use the authenticated user's id when fetching data.
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
      } else {
        setError("Authentication failed. Please try again.");
        return;
      }

      // rememberMe is retained as UI state
      void rememberMe;

      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <AuthLayout
        title="Welcome back"
        subtitle="Sign in to continue"
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">

            {/* Username or Email */}
            <div className="relative">
              <User
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />

              <input
                type="text"
                placeholder="Username or email"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError("");
                }}
                autoComplete="username"
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
                autoComplete="current-password"
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
          </div>

          {/* Remember me and Forgot password */}
          <div className="flex items-center justify-between mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-primary rounded w-4 h-4"
              />

              <span className="text-sm text-text-secondary">
                Remember me
              </span>
            </label>

            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Error */}
          {error && (
            <p className="text-error text-sm mt-3" role="alert">
              {error}
            </p>
          )}

          {/* Login button */}
          <button
            type="submit"
            disabled={isLoading || !identifier.trim() || !password}
            className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {/* Signup navigation */}
          <div className="mt-6 text-center">
            <span className="text-sm text-text-secondary">
              Don&apos;t have an account?{" "}
            </span>

            <Link
              href="/auth/signup"
              className="text-sm text-primary hover:underline font-medium"
            >
              Create one
            </Link>
          </div>
        </form>
      </AuthLayout>
    </div>
  );
}
