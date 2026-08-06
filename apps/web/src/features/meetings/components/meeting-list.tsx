"use client";

import Link from "next/link";
import { FileAudio, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/spinner";
import { formatBytes, formatDate } from "@/lib/utils";
import { useWorkspaceMeetings } from "@/features/meetings/hooks/use-meetings";

export function MeetingList({
  workspaceId,
  onUpload,
}: {
  workspaceId: string;
  onUpload: () => void;
}) {
  const { data: meetings, isLoading } = useWorkspaceMeetings(workspaceId);

  if (isLoading) return <PageLoader />;

  if (!meetings?.length) {
    return (
      <EmptyState
        icon={<FileAudio size={32} />}
        title="No meetings yet"
        description="Upload an audio or video recording to get a transcript, summary and action items."
        action={
          <Button onClick={onUpload}>
            <Upload size={16} />
            Upload meeting
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {meetings.map((m) => (
        <Link key={m.id} href={`/meetings/${m.id}`}>
          <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-md">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <FileAudio size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">{m.title}</p>
                <p className="truncate text-xs text-zinc-500">
                  {m.originalName} · {formatBytes(m.fileSize)} · {formatDate(m.createdAt)}
                </p>
              </div>
            </div>
            <StatusBadge status={m.status} />
          </Card>
        </Link>
      ))}
    </div>
  );
}
