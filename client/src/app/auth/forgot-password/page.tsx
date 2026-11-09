"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "../../../components/AuthLayout";
import { useSupabase } from "../../../context/AuthProvider";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { supabase } = useSupabase();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo,
        },
      );

      if (resetError) {
        setError(resetError.message || "Failed to send password reset email");
        return;
      }

      setSuccess(
        "If an account exists for this email, you will receive a password reset link shortly.",
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
        title="Forgot password"
        subtitle="Enter your email to reset your password"
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
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

            {error && (
              <p className="text-error text-sm mt-3" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="text-green-600 text-sm mt-3" role="status">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Sending...</span>
              ) : (
                <>
                  <span>Send reset link</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6 text-center">
            <span className="text-sm text-text-secondary">
              Remember your password?{" "}
            </span>

            <Link
              href="/auth/login"
              className="text-sm text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              <span>Back to home</span>
            </Link>
          </div>
        </form>
      </AuthLayout>
    </div>
  );
}
