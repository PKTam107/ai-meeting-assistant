"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

/**
 * Last-resort boundary for errors thrown in the root layout/template, where the
 * segment-level error.tsx files can't reach. Must render its own <html>/<body>.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">Something went wrong</h2>
          <p className="text-sm text-zinc-500">
            The app hit an unexpected error. Please try again.
          </p>
          <button
            onClick={() => unstable_retry()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
