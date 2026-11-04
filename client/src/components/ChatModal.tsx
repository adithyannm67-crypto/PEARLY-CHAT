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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl bg-bg-secondary border border-border-custom shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border-custom">
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
