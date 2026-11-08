'use client';

export default function TypingIndicator() {
  return (
    <div className="typing-bubble bg-surface border border-border-custom/50">
      <span className="text-[11px] text-text-secondary font-medium">typing</span>
      <div className="flex gap-1.5 ml-2">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}