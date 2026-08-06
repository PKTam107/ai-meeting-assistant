"use client";

import { use } from "react";

import { WorkspaceDetail } from "@/features/workspaces/components/workspace-detail";

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <WorkspaceDetail id={id} />;
}
