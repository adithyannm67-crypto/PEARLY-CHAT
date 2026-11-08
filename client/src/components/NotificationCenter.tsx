'use client';

import { useCallback } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import NotificationToast from '@/components/NotificationToast';

export default function NotificationCenter() {
  const { notifications, removeNotification } = useNotifications();

  const handleRemove = useCallback((id: string) => {
    removeNotification(id);
  }, [removeNotification]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationToast
            notification={notification}
            onRemove={removeNotification}
          />
        </div>
      ))}
    </div>
  );
}
