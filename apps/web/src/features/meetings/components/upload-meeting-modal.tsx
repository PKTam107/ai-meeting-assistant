"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { errorMessage } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { useUploadMeeting } from "@/features/meetings/hooks/use-meetings";

export function UploadMeetingModal({
  workspaceId,
  open,
  onClose,
}: {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const upload = useUploadMeeting(workspaceId);

  const reset = () => {
    setTitle("");
    setDescription("");
    setFile(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !file) return;
    const form = new FormData();
    form.append("title", title.trim());
    if (description.trim()) form.append("description", description.trim());
    form.append("file", file);
    upload.mutate(form, {
      onSuccess: () => {
        toast.success("Meeting uploaded");
        reset();
        onClose();
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload meeting">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label="Title"
          placeholder="e.g. Weekly sync"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <Input
          label="Description (optional)"
          placeholder="Short context"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Recording</label>
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {file && (
            <p className="text-xs text-zinc-500">
              {file.name} · {formatBytes(file.size)}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={upload.isPending} disabled={!title.trim() || !file}>
            Upload
          </Button>
        </div>
      </form>
    </Modal>
  );
}
