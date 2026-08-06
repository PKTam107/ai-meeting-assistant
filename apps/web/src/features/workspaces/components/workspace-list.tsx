"use client";

import Link from "next/link";
import { FolderPlus, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";
import { useWorkspaces } from "@/features/workspaces/hooks/use-workspaces";

export function WorkspaceList({ onCreate }: { onCreate: () => void }) {
  const { data: workspaces, isLoading } = useWorkspaces();

  if (isLoading) return <PageLoader />;

  if (!workspaces?.length) {
    return (
      <EmptyState
        icon={<FolderPlus size={32} />}
        title="No workspaces yet"
        description="Create a workspace to start uploading and analyzing meetings."
        action={
          <Button onClick={onCreate}>
            <Plus size={16} />
            New workspace
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {workspaces.map((ws) => (
        <Link key={ws.id} href={`/workspaces/${ws.id}`}>
          <Card className="h-full p-5 transition-shadow hover:shadow-md">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Users size={18} />
            </div>
            <h3 className="truncate font-medium text-zinc-900">{ws.name}</h3>
            <p className="mt-1 text-xs text-zinc-500">Created {formatDate(ws.createdAt)}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
