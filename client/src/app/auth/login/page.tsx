
"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

import { useSupabase } from "@/lib/supabase/context";
import AuthLayout from "@/components/AuthLayout";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useSupabase();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      let emailToUse = identifier.trim();

      // Resolve username to email
      if (!emailToUse.includes("@")) {
        const response = await fetch(
          "/api/auth/resolve-username",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: emailToUse,
            }),
          }
        );

        if (!response.ok) {
          setError("Invalid username or email");
          return;
        }

        const data = await response.json();
        emailToUse = data.email;

        if (!emailToUse) {
          setError("Invalid username or email");
          return;
        }
      }

      // Supabase login
      const { error: loginError } = await signIn(
        emailToUse,
        password
      );

      if (loginError) {
        switch (loginError.error) {
          case "Invalid login credentials":
            setError("Invalid email/username or password");
            break;

          case "Email not confirmed":
            setError(
              "Please confirm your email address before logging in"
            );
            break;

          default:
            setError(
              loginError.error || "Authentication failed"
            );
        }

        return;
      }

      // Supabase manages session persistence.
      // rememberMe is retained as UI state.
      void rememberMe;

      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
              onClick={() =>
                setShowPassword(!showPassword)
              }
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
              onChange={(e) =>
                setRememberMe(e.target.checked)
              }
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
            Don't have an account?{" "}
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
  );
}
