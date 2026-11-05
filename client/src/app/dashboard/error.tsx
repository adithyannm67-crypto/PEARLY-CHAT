'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        <span className="material-symbols-outlined text-4xl">
          error
        </span>
      </div>

      <h2 className="mb-2 text-2xl font-semibold">
        Something went wrong!
      </h2>

      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>

      <button
        onClick={() => reset()}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}