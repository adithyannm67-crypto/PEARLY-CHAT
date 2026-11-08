'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-main px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        <span className="material-symbols-outlined text-4xl">error</span>
      </div>

      <h2 className="mb-2 text-2xl font-semibold text-text-primary">
        Page not found
      </h2>

      <p className="mb-6 max-w-md text-sm text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>

      <Link
        href="/dashboard"
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
