"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { errorMessage } from "@/lib/api";
import {
  useAddMember,
  useRemoveMember,
  useWorkspaceMembers,
} from "@/features/workspaces/hooks/use-members";

export function MembersModal({
  workspaceId,
  open,
  onClose,
}: {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const members = useWorkspaceMembers(workspaceId, { enabled: open });
  const add = useAddMember(workspaceId);
  const remove = useRemoveMember(workspaceId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    add.mutate(email.trim(), {
      onSuccess: () => {
        toast.success("Member added");
        setEmail("");
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  const removeMember = (userId: string) =>
    remove.mutate(userId, {
      onSuccess: () => toast.success("Member removed"),
      onError: (err) => toast.error(errorMessage(err)),
    });

  return (
    <Modal open={open} onClose={onClose} title="Workspace members">
      <div className="flex flex-col gap-4">
        <form onSubmit={submit} className="flex items-end gap-2">
          <Input
            label="Add by email"
            type="email"
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" loading={add.isPending} disabled={!email.trim()}>
            Add
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          {members.isLoading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            members.data?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2"
              >
                <span className="truncate text-sm text-zinc-700">
                  {member.user?.email ?? member.userId}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400">{member.role}</span>
                  {member.role !== "OWNER" && (
                    <button
                      onClick={() => removeMember(member.userId)}
                      className="text-zinc-300 hover:text-red-600"
                      aria-label="Remove member"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
