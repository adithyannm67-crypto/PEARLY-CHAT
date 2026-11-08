'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Notification } from '@/context/NotificationContext';

const typeStyles: Record<
  Notification['type'],
  { bg: string; text: string; border: string; icon: string }
> = {
  error: {
    bg: 'bg-red-500/90',
    text: 'text-white',
    border: 'border-red-500',
    icon: 'text-white',
  },
  warning: {
    bg: 'bg-amber-500/90',
    text: 'text-white',
    border: 'border-amber-500',
    icon: 'text-white',
  },
  info: {
    bg: 'bg-blue-500/90',
    text: 'text-white',
    border: 'border-blue-500',
    icon: 'text-white',
  },
  success: {
    bg: 'bg-emerald-500/90',
    text: 'text-white',
    border: 'border-emerald-500',
    icon: 'text-white',
  },
};

const typeIcons: Record<Notification['type'], string> = {
  error: 'AlertTriangle',
  warning: 'AlertTriangle',
  info: 'Info',
  success: 'CheckCircle',
};

interface NotificationToastProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

export default function NotificationToast({
  notification,
  onRemove,
}: NotificationToastProps) {
  const [dismissed, setDismissed] = useState(false);

  const style = typeStyles[notification.type];

  useEffect(() => {
    if (!notification.persistent && notification.duration === undefined) {
      setTimeout(() => {
        setDismissed(true);
      }, 5000);
    }
  }, [notification.persistent, notification.duration]);

  if (dismissed) {
    return null;
  }

  const Icon =
    typeIcons[notification.type as keyof typeof typeIcons] === 'AlertTriangle' ? (
      <span className="w-5 h-5">⚠</span>
    ) : (
      <span className="w-5 h-5">ⓘ</span>
    );

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border border-white/20 shadow-lg animate-slide-in-right ${style.bg} ${style.text}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center {style.icon}">
        {Icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold">{notification.title}</h3>
        {notification.message && (
          <p className="text-xs text-opacity-90 mt-0.5">
            {notification.message}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        {notification.retry && (
          <button
            onClick={notification.retry}
            className="ml-2 p-1.5 text-white/70 hover:text-white rounded hover:bg-white/10 transition-colors"
            aria-label="Retry"
          >
            ↻
          </button>
        )}
        {notification.dismissible !== false && (
          <button
            onClick={() => onRemove(notification.id)}
            className="ml-1 p-1.5 text-white/70 hover:text-white rounded hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
