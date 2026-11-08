'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [lastOnlineState, setLastOnlineState] = useState(isOnline);
  const [hasCheckedConnection, setHasCheckedConnection] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setHasCheckedConnection(true);
  }, []);

  // Detect transition from offline → online and show a temporary restoration notice
  useEffect(() => {
    if (lastOnlineState === false && isOnline === true) {
      setShowOnlineToast(true);
      setTimeout(() => setShowOnlineToast(false), 5000);
    }
    setTimeout(() => setLastOnlineState(isOnline), 0);
  }, [isOnline, lastOnlineState]);

  // Only show offline banner after we've confirmed the browser's online state
  // and the user hasn't dismissed it. This prevents showing the banner on
  // initial load when navigator.onLine may be unreliable.
  if (dismissed) {
    return null;
  }

  if (!hasCheckedConnection) {
    return null;
  }

  // Persistent offline banner
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-center px-4 py-2 shadow-lg font-medium">
        <div className="flex items-center justify-between">
          <span>You are offline. Some features may not work until you reconnect.</span>
          <button
            onClick={() => setDismissed(true)}
            className="ml-2 p-1 text-white/80 hover:text-white rounded hover:bg-white/20"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
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
