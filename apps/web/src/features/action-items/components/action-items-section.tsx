"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, ListChecks, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api";
import type { ActionItem, ActionItemStatus, WorkspaceMember } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { SectionHeader } from "@/features/meetings/components/section-header";
import { useWorkspaceMembers } from "@/features/workspaces/hooks/use-members";
import {
  useActionItems,
  useCreateActionItem,
  useDeleteActionItem,
  useUpdateActionItem,
} from "@/features/action-items/hooks/use-action-items";

// OPEN → IN_PROGRESS → DONE → OPEN
const nextStatus = (s: ActionItemStatus): ActionItemStatus =>
  s === "OPEN" ? "IN_PROGRESS" : s === "IN_PROGRESS" ? "DONE" : "OPEN";

export function ActionItemsSection({
  meetingId,
  workspaceId,
}: {
  meetingId: string;
  workspaceId: string;
}) {
  const [content, setContent] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data: items, isLoading } = useActionItems(meetingId);
  // Members power the assignee dropdowns; fall back gracefully if forbidden.
  const { data: members } = useWorkspaceMembers(workspaceId);

  const create = useCreateActionItem(meetingId);
  const update = useUpdateActionItem(meetingId);
  const remove = useDeleteActionItem(meetingId);

  const emailFor = (id: string | null) =>
    members?.find((m: WorkspaceMember) => m.userId === id)?.user?.email ?? null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    create.mutate(
      {
        content: content.trim(),
        assigneeId: assigneeId || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          setContent("");
          setAssigneeId("");
          setDueDate("");
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  const toggleStatus = (item: ActionItem) =>
    update.mutate(
      { id: item.id, status: nextStatus(item.status) },
      { onError: (err) => toast.error(errorMessage(err)) },
    );

  const deleteItem = (id: string) =>
    remove.mutate(id, { onError: (err) => toast.error(errorMessage(err)) });

  return (
    <Card>
      <SectionHeader icon={<ListChecks size={16} />} title="Action items" />
      <div className="px-5 py-4">
        <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-2">
          <Input
            placeholder="Add an action item…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-w-[12rem] flex-1"
          />
          <Select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            aria-label="Assignee"
          >
            <option value="">Unassigned</option>
            {members?.map((m: WorkspaceMember) => (
              <option key={m.userId} value={m.userId}>
                {m.user?.email ?? m.userId}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Due date"
            className="w-40"
          />
          <Button type="submit" size="sm" loading={create.isPending} disabled={!content.trim()}>
            <Plus size={16} />
            Add
          </Button>
        </form>

        {isLoading ? (
          <Spinner />
        ) : !items?.length ? (
          <p className="text-sm text-zinc-500">No action items yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {items.map((item: ActionItem) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2"
              >
                <button
                  onClick={() => toggleStatus(item)}
                  className="shrink-0 text-zinc-400 hover:text-indigo-600"
                  aria-label="Toggle status"
                >
                  {item.status === "DONE" ? (
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  ) : (
                    <Circle size={18} />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${
                      item.status === "DONE" ? "text-zinc-400 line-through" : "text-zinc-700"
                    }`}
                  >
                    {item.content}
                  </span>
                  {(emailFor(item.assigneeId) || item.dueDate) && (
                    <span className="text-xs text-zinc-400">
                      {emailFor(item.assigneeId) && <>👤 {emailFor(item.assigneeId)} </>}
                      {item.dueDate && <>· 📅 {formatDate(item.dueDate)}</>}
                    </span>
                  )}
                </div>
                <StatusBadge status={item.status} />
                <button
                  onClick={() => deleteItem(item.id)}
                  className="shrink-0 text-zinc-300 hover:text-red-600"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
