'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type NotificationType = 'error' | 'warning' | 'info' | 'success';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  retry?: () => void;
  persistent?: boolean;
  dismissible?: boolean;
  duration?: number; // ms before auto-dismiss (undefined = never)
}

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

const DEFAULT_DURATION = 5000;
const MAX_NOTIFICATIONS = 5;

export function NotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
const [notifications, setNotifications] = useState<Notification[]>([]);

const removeNotification = useCallback((id: string) => {
  setNotifications((prev) => prev.filter((n) => n.id !== id));
}, []);

const clearAll = useCallback(() => {
  setNotifications([]);
}, []);

const addNotification = useCallback(
  (notification: Omit<Notification, 'id'>) => {
    const id = crypto.randomUUID();

    setNotifications((prev) => {
      // Avoid duplicate notifications of the same type and title
      const exists = prev.some(
        (n) => n.type === notification.type && n.title === notification.title
      );
      if (exists && !notification.persistent) {
        return prev;
      }

      const next = [...prev, { ...notification, id }];

      // Limit number of notifications
      if (next.length > MAX_NOTIFICATIONS) {
        next.shift();
      }

      return next;
    });

    // Auto-dismiss non-persistent notifications
    if (
      !notification.persistent &&
      notification.duration !== undefined
    ) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    } else if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, DEFAULT_DURATION);
    }
  },
  [removeNotification]
);

  const value = useMemo<NotificationContextValue>(
    () => ({ notifications, addNotification, removeNotification, clearAll }),
    [notifications, addNotification, removeNotification, clearAll]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export type { Notification, NotificationType };
export { NotificationContext };
