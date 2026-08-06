"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, Upload, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/features/workspaces/hooks/use-workspaces";
import { MeetingList } from "@/features/meetings/components/meeting-list";

// All three live behind a click — load each chunk on demand.
const UploadMeetingModal = dynamic(() =>
  import("@/features/meetings/components/upload-meeting-modal").then((m) => m.UploadMeetingModal),
);
const MembersModal = dynamic(() =>
  import("@/features/workspaces/components/members-modal").then((m) => m.MembersModal),
);
const WorkspaceSettingsModal = dynamic(() =>
  import("@/features/workspaces/components/workspace-settings-modal").then(
    (m) => m.WorkspaceSettingsModal,
  ),
);

export function WorkspaceDetail({ id }: { id: string }) {
  const router = useRouter();
  const workspace = useWorkspace(id);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft size={16} />
        Workspaces
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">{workspace.data?.name ?? "Workspace"}</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <Settings size={16} />
          </Button>
          <Button variant="secondary" onClick={() => setMembersOpen(true)}>
            <UserPlus size={16} />
            Members
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload size={16} />
            Upload meeting
          </Button>
        </div>
      </div>

      <MeetingList workspaceId={id} onUpload={() => setUploadOpen(true)} />

      {uploadOpen && (
        <UploadMeetingModal workspaceId={id} open onClose={() => setUploadOpen(false)} />
      )}
      {membersOpen && (
        <MembersModal workspaceId={id} open onClose={() => setMembersOpen(false)} />
      )}
      {settingsOpen && (
        <WorkspaceSettingsModal
          workspaceId={id}
          currentName={workspace.data?.name ?? ""}
          open
          onClose={() => setSettingsOpen(false)}
          onDeleted={() => router.replace("/dashboard")}
        />
      )}
    </div>
  );
}
