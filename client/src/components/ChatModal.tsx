'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ChatModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function ChatModal({ title, onClose, children }: ChatModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 p-4 sm:p-6 dvh"
      onMouseDown={onClose}
      role="presentation"
      onTouchMove={(e) => e.preventDefault()}
    >
      <div
        className="w-full max-w-md sm:max-w-lg rounded-2xl bg-bg-secondary border border-border-custom shadow-2xl sm:mx-auto sm:my-auto sm:rounded-xl mobile-bottom-sheet"
        onMouseDown={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between px-5 py-4 sm:px-6 border-b border-border-custom">
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer touch-target"
          >
            <X size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
