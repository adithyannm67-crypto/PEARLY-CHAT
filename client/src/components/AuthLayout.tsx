
"use client";

import { ReactNode } from "react";
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
  return (
    <div className="relative flex min-h-screen bg-bg-main">
      {/* Left branding section (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-bg-secondary flex-col items-center justify-center p-6 border-r border-border-custom/40 safe-area-inset-top">
        <MessageCircle size={64} className="text-primary opacity-80" />

        <h1 className="text-3xl font-bold text-text-primary mt-4 tracking-tight">
          Peerly
        </h1>

        <p className="text-base text-text-secondary mt-2 text-center">
          Conversations Without Boundaries.
        </p>

        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-primary shrink-0" />
            <span className="text-sm text-text-secondary">
              End-to-end encrypted messaging
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Lock size={18} className="text-primary shrink-0" />
            <span className="text-sm text-text-secondary">
              Peer-to-peer architecture
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Shield size={18} className="text-primary shrink-0" />
            <span className="text-sm text-text-secondary">
              No data collection
            </span>
          </div>
        </div>
      </div>

      {/* Right form section */}
      <div className="w-full flex items-center justify-center p-4 lg:p-12 pb-6 safe-area-inset-bottom safe-area-inset-top">
        <div className="w-full max-w-md opacity-100 animate-fade-in">
          <div className="flex items-center gap-2 mb-6">
            <MessageCircle size={24} className="text-primary" />
            <span className="text-xl font-bold text-text-primary tracking-tight">
              Peerly
            </span>
          </div>

          <h2 className="text-lg font-semibold text-text-primary">
            {title}
          </h2>

          <p className="text-sm text-text-secondary mt-1 mb-6">
            {subtitle}
          </p>

          {children}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 w-full text-center py-4 pointer-events-none safe-area-inset-bottom">
        <p className="text-text-secondary/40 text-xs">
          © 2026 Peerly. Conversations Without Boundaries.
        </p>
      </footer>
    </div>
  );
}
