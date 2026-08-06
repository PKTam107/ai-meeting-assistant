"use client";

import { toast } from "sonner";
import { Clock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api";
import { SectionHeader } from "@/features/meetings/components/section-header";
import { useStartSummary, useSummary } from "@/features/meetings/hooks/use-summary";

export function SummarySection({ meetingId }: { meetingId: string }) {
  const { data, isLoading } = useSummary(meetingId);
  const start = useStartSummary(meetingId);

  const run = () =>
    start.mutate(undefined, {
      onSuccess: () => toast.success("Summary requested"),
      onError: (err) => toast.error(errorMessage(err)),
    });

  const ready = data?.status === "COMPLETED" && data.content;

  return (
    <Card>
      <SectionHeader
        icon={<Sparkles size={16} />}
        title="Summary"
        action={
          <div className="flex items-center gap-2">
            {data && <StatusBadge status={data.status} />}
            <Button size="sm" variant="secondary" loading={start.isPending} onClick={run}>
              {data ? "Re-run" : "Summarize"}
            </Button>
          </div>
        }
      />
      <div className="px-5 py-4">
        {isLoading ? (
          <Spinner />
        ) : !data ? (
          <p className="text-sm text-zinc-500">No summary yet. Click Summarize to generate one.</p>
        ) : ready ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{data.content}</p>
        ) : data.status === "FAILED" ? (
          <p className="text-sm text-red-600">{data.error ?? "Summarization failed."}</p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Clock size={15} /> Processing…
          </p>
        )}
      </div>
    </Card>
  );
}
