"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Catches render/runtime errors thrown by any page under the (app) group so a
 * single broken component shows a recoverable fallback instead of a blank app.
 * Wraps the pages but not (app)/layout.tsx, so the header/nav stay mounted.
 */
export default function AppError({
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
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <AlertTriangle size={24} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Something went wrong</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
      </div>
      <Button onClick={() => unstable_retry()}>Try again</Button>
    </div>
  );
}
