import { cn } from "@/lib/utils";
import type { MeetingStatus, ProcessingStatus, ActionItemStatus } from "@/lib/types";

type AnyStatus = MeetingStatus | ProcessingStatus | ActionItemStatus;

const styles: Record<string, string> = {
  // Meeting
  UPLOADED: "bg-zinc-100 text-zinc-600",
  PROCESSING: "bg-amber-100 text-amber-700",
  READY: "bg-sky-100 text-sky-700",
  TRANSCRIBED: "bg-blue-100 text-blue-700",
  SUMMARIZED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  // Processing
  PENDING: "bg-zinc-100 text-zinc-600",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  // Action item
  OPEN: "bg-zinc-100 text-zinc-600",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  DONE: "bg-emerald-100 text-emerald-700",
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status] ?? "bg-zinc-100 text-zinc-600",
      )}
    >
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}
