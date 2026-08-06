"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorkspaceList } from "@/features/workspaces/components/workspace-list";
import { NewWorkspaceModal } from "@/features/workspaces/components/new-workspace-modal";

export default function DashboardPage() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Workspaces</h1>
          <p className="text-sm text-zinc-500">Your meeting workspaces.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} />
          New workspace
        </Button>
      </div>

      <WorkspaceList onCreate={() => setOpen(true)} />
      <NewWorkspaceModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
