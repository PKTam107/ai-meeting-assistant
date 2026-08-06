"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { errorMessage } from "@/lib/api";
import { useCreateWorkspace } from "@/features/workspaces/hooks/use-workspaces";

export function NewWorkspaceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const create = useCreateWorkspace();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(name.trim(), {
      onSuccess: () => {
        toast.success("Workspace created");
        setName("");
        onClose();
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="New workspace">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label="Workspace name"
          placeholder="e.g. Product Team"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
