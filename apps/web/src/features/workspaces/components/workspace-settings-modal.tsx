"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { errorMessage } from "@/lib/api";
import {
  useDeleteWorkspace,
  useRenameWorkspace,
} from "@/features/workspaces/hooks/use-workspaces";

export function WorkspaceSettingsModal({
  workspaceId,
  currentName,
  open,
  onClose,
  onDeleted,
}: {
  workspaceId: string;
  currentName: string;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const rename = useRenameWorkspace(workspaceId);
  const remove = useDeleteWorkspace(workspaceId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    rename.mutate(name.trim(), {
      onSuccess: () => {
        toast.success("Workspace renamed");
        onClose();
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  const confirmDelete = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success("Workspace deleted");
        onDeleted();
      },
      onError: (err) => toast.error(errorMessage(err)),
    });

  return (
    <>
      <Modal open={open} onClose={onClose} title="Workspace settings">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <div className="flex justify-end">
            <Button type="submit" loading={rename.isPending} disabled={!name.trim()}>
              Save changes
            </Button>
          </div>
        </form>

        <div className="mt-6 border-t border-zinc-100 pt-4">
          <p className="text-sm font-medium text-zinc-800">Danger zone</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Deleting a workspace removes all its meetings and data.
          </p>
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setConfirmOpen(true)}>
            Delete workspace
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        title="Delete workspace"
        message={`Permanently delete "${currentName}" and everything in it? This cannot be undone.`}
      />
    </>
  );
}
