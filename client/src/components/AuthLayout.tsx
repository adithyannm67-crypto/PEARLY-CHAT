
"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { Lock, MessageCircle, Shield } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function AuthLayout({
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative flex min-h-screen bg-bg-main">
      {/* Left branding section */}
      <div className="hidden lg:flex lg:w-1/2 bg-bg-secondary flex-col items-center justify-center p-12 border-r border-border-custom/40">
        <MessageCircle size={80} className="text-primary opacity-80" />

        <h1 className="text-4xl font-bold text-text-primary mt-6 tracking-tight">
          Peerly
        </h1>

        <p className="text-lg text-text-secondary mt-2 text-center">
          Conversations Without Boundaries.
        </p>

        <div className="mt-12 space-y-4">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-primary shrink-0" />
            <span className="text-sm text-text-secondary">
              End-to-end encrypted messaging
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Lock size={20} className="text-primary shrink-0" />
            <span className="text-sm text-text-secondary">
              Peer-to-peer architecture
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Shield size={20} className="text-primary shrink-0" />
            <span className="text-sm text-text-secondary">
              No data collection
            </span>
          </div>
        </div>
      </div>

      {/* Right form section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 pb-20">
        <div
          className={`w-full max-w-md transition-opacity duration-300 ${
            mounted ? "opacity-100 animate-fade-in" : "opacity-0"
          }`}
        >
          <div className="flex items-center gap-2 mb-8">
            <MessageCircle size={28} className="text-primary" />
            <span className="text-2xl font-bold text-text-primary tracking-tight">
              Peerly
            </span>
          </div>

          <h2 className="text-xl font-semibold text-text-primary">
            {title}
          </h2>

          <p className="text-sm text-text-secondary mt-1 mb-6">
            {subtitle}
          </p>

          {children}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 w-full text-center py-4 pointer-events-none">
        <p className="text-text-secondary/40 text-xs">
          © 2026 Peerly. Conversations Without Boundaries.
        </p>
      </footer>
    </div>
  );
}
