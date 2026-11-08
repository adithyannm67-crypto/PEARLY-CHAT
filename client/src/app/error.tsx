'use client';

import { useEffect, useState } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log the error internally (server-side logs), but never expose details to the user
  useEffect(() => {
    console.error('[Global Error Boundary]', error);
  }, [error]);

  const [resetAttempted, setResetAttempted] = useState(false);

  const handleReset = () => {
    setResetAttempted(true);
    reset();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-main px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        <span className="material-symbols-outlined text-4xl">error</span>
      </div>

      <h2 className="mb-2 text-2xl font-semibold text-text-primary">
        Something went wrong
      </h2>

      <p className="mb-6 max-w-md text-sm text-text-secondary">
        An unexpected error occurred. Please try again.
      </p>

      <button
        onClick={handleReset}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        {resetAttempted ? 'Restoring...' : 'Try again'}
      </button>
    </div>
  );
}
