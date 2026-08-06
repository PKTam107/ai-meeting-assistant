"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { errorMessage } from "@/lib/api";
import type { Meeting } from "@/lib/types";
import { useUpdateMeeting } from "@/features/meetings/hooks/use-meetings";

export function EditMeetingModal({
  meeting,
  open,
  onClose,
}: {
  meeting: Meeting;
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(meeting.title);
  const [description, setDescription] = useState(meeting.description ?? "");
  const update = useUpdateMeeting(meeting);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    update.mutate(
      { title: title.trim(), description: description.trim() },
      {
        onSuccess: () => {
          toast.success("Meeting updated");
          onClose();
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit meeting">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={update.isPending} disabled={!title.trim()}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
