import { request } from "@/lib/api";
import type { ActionItem, ActionItemStatus } from "@/lib/types";

export interface CreateActionItemInput {
  content: string;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateActionItemInput {
  content?: string;
  status?: ActionItemStatus;
  // null clears the field; undefined leaves it unchanged.
  assigneeId?: string | null;
  dueDate?: string | null;
}

export const actionItemsApi = {
  list: (meetingId: string) =>
    request<ActionItem[]>({ method: "GET", url: `/meetings/${meetingId}/action-items` }),
  create: (meetingId: string, data: CreateActionItemInput) =>
    request<ActionItem>({
      method: "POST",
      url: `/meetings/${meetingId}/action-items`,
      data,
    }),
  update: (id: string, data: UpdateActionItemInput) =>
    request<ActionItem>({ method: "PATCH", url: `/action-items/${id}`, data }),
  remove: (id: string) => request<void>({ method: "DELETE", url: `/action-items/${id}` }),
};
