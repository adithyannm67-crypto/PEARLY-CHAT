'use client';

import { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [lastOnlineState, setLastOnlineState] = useState(isOnline);

  // Detect transition from offline → online and show a temporary restoration notice
  useEffect(() => {
    if (lastOnlineState === false && isOnline === true) {
      setShowOnlineToast(true);
      setTimeout(() => setShowOnlineToast(false), 5000);
    }
    setLastOnlineState(isOnline);
  }, [isOnline, lastOnlineState]);

  // Persistent offline banner
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-center px-4 py-2 shadow-lg font-medium">
        You are offline. Some features may not work until you reconnect.
      </div>
    );
  }

  // Temporary online restoration toast
  if (showOnlineToast) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white text-center px-4 py-2 shadow-lg font-medium">
        Connection restored. You are back online.
      </div>
    );
  }

  return null;
}
