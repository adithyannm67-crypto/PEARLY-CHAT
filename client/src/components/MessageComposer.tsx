'use client';

import { useCallback, useRef, useState } from 'react';
import { Paperclip, Smile, SendHorizontal } from 'lucide-react';

interface MessageComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function MessageComposer({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}: MessageComposerProps) {
  const [messageInput, setMessageInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasContent, setHasContent] = useState(false);

  const handleSend = useCallback(() => {
    const trimmed = messageInput.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessageInput('');
    setHasContent(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [messageInput, disabled, onSend]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessageInput(e.target.value);
      setHasContent(e.target.value.trim().length > 0);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleTextareaInput = useCallback(
    (e: React.InputEvent<HTMLTextAreaElement>) => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
    },
    [],
  );

  return (
    <div className="bg-bg-secondary border-t border-border-custom p-3 shrink-0 safe-area-inset-bottom">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-end gap-2"
      >
        {/* Attachment button */}
        <button
          type="button"
          aria-label="Attach file"
          disabled={disabled}
          className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer touch-target disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Paperclip size={18} />
        </button>

        {/* Input field */}
        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={messageInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onInput={handleTextareaInput}
          className="composer-textarea flex-1 bg-surface rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 border-none max-h-[120px] min-h-[8px]"
        />

        {/* Emoji button */}
        <button
          type="button"
          aria-label="Insert emoji"
          disabled={disabled}
          className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer touch-target disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Smile size={18} />
        </button>

        {/* Send button */}
        <button
          type="submit"
          disabled={!hasContent || disabled}
          aria-label="Send message"
          className={`p-2.5 rounded-full transition-all ${hasContent && !disabled
            ? 'bg-primary text-white hover:bg-primary/90 cursor-pointer shadow-sm touch-target'
            : 'bg-surface text-text-secondary cursor-not-allowed touch-target'
          }`}
        >
          <SendHorizontal size={18} />
        </button>
      </form>
    </div>
  );
}