"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api";
import { formatBytes, formatDate, formatDuration } from "@/lib/utils";
import { useDeleteMeeting, useMeeting } from "@/features/meetings/hooks/use-meetings";
import { TranscriptSection } from "@/features/meetings/components/transcript-section";
import { SummarySection } from "@/features/meetings/components/summary-section";
import { ActionItemsSection } from "@/features/action-items/components/action-items-section";

// Behind an "Edit" click — split into its own chunk.
const EditMeetingModal = dynamic(() =>
  import("@/features/meetings/components/edit-meeting-modal").then((m) => m.EditMeetingModal),
);

export function MeetingDetail({ id }: { id: string }) {
  const router = useRouter();
  const meeting = useMeeting(id);
  const remove = useDeleteMeeting({
    id,
    workspaceId: meeting.data?.workspaceId ?? "",
  });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (meeting.isLoading) return <PageLoader />;
  if (!meeting.data) return <p className="text-sm text-zinc-500">Meeting not found.</p>;

  const m = meeting.data;

  const confirmDelete = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success("Meeting deleted");
        router.replace(`/workspaces/${m.workspaceId}`);
      },
      onError: (err) => toast.error(errorMessage(err)),
    });

  return (
    <div>
      <Link
        href={`/workspaces/${m.workspaceId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft size={16} />
        Back to workspace
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-zinc-900">{m.title}</h1>
          {m.description && <p className="mt-1 text-sm text-zinc-600">{m.description}</p>}
          <p className="mt-1 text-xs text-zinc-500">
            {m.originalName} · {formatBytes(m.fileSize)}
            {formatDuration(m.durationSec) && ` · ${formatDuration(m.durationSec)}`} ·{" "}
            {formatDate(m.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={m.status} />
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)} aria-label="Edit">
            <Pencil size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete"
            className="text-zinc-400 hover:text-red-600"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <TranscriptSection meetingId={id} />
        <SummarySection meetingId={id} />
        <ActionItemsSection meetingId={id} workspaceId={m.workspaceId} />
      </div>

      {editOpen && <EditMeetingModal meeting={m} open onClose={() => setEditOpen(false)} />}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        title="Delete meeting"
        message="This permanently removes the meeting and its transcript, summary and action items."
      />
    </div>
  );
}
