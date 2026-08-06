"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import {
  actionItemsApi,
  type CreateActionItemInput,
  type UpdateActionItemInput,
} from "@/features/action-items/services/action-items.api";

export function useActionItems(meetingId: string) {
  return useQuery({
    queryKey: queryKeys.actionItems(meetingId),
    queryFn: () => actionItemsApi.list(meetingId),
  });
}

export function useCreateActionItem(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateActionItemInput) => actionItemsApi.create(meetingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actionItems(meetingId) });
    },
  });
}

export function useUpdateActionItem(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateActionItemInput) =>
      actionItemsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actionItems(meetingId) });
    },
  });
}

export function useDeleteActionItem(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => actionItemsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actionItems(meetingId) });
    },
  });
}
