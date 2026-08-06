"use client";

import { toast } from "sonner";
import { Clock, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api";
import { SectionHeader } from "@/features/meetings/components/section-header";
import { useStartTranscript, useTranscript } from "@/features/meetings/hooks/use-transcript";

export function TranscriptSection({ meetingId }: { meetingId: string }) {
  const { data, isLoading } = useTranscript(meetingId);
  const start = useStartTranscript(meetingId);

  const run = () =>
    start.mutate(undefined, {
      onSuccess: () => toast.success("Transcription requested"),
      onError: (err) => toast.error(errorMessage(err)),
    });

  const ready = data?.status === "COMPLETED" && data.text;

  return (
    <Card>
      <SectionHeader
        icon={<FileText size={16} />}
        title="Transcript"
        action={
          <div className="flex items-center gap-2">
            {data && <StatusBadge status={data.status} />}
            <Button size="sm" variant="secondary" loading={start.isPending} onClick={run}>
              {data ? "Re-run" : "Transcribe"}
            </Button>
          </div>
        }
      />
      <div className="px-5 py-4">
        {isLoading ? (
          <Spinner />
        ) : !data ? (
          <p className="text-sm text-zinc-500">No transcript yet. Click Transcribe to generate one.</p>
        ) : ready ? (
          <p className="max-h-80 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {data.text}
          </p>
        ) : data.status === "FAILED" ? (
          <p className="text-sm text-red-600">{data.error ?? "Transcription failed."}</p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Clock size={15} /> Processing… this updates once the worker finishes.
          </p>
        )}
      </div>
    </Card>
  );
}
