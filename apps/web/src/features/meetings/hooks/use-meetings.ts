"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { meetingsApi } from "@/features/meetings/services/meetings.api";

export function useWorkspaceMeetings(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.meetings(workspaceId),
    queryFn: () => meetingsApi.listForWorkspace(workspaceId),
  });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: queryKeys.meeting(id),
    queryFn: () => meetingsApi.get(id),
  });
}

export function useUploadMeeting(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => meetingsApi.upload(workspaceId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings(workspaceId) });
    },
  });
}

export function useUpdateMeeting(meeting: { id: string; workspaceId: string }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; description?: string }) =>
      meetingsApi.update(meeting.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meeting(meeting.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings(meeting.workspaceId) });
    },
  });
}

export function useDeleteMeeting(meeting: { id: string; workspaceId: string }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => meetingsApi.remove(meeting.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings(meeting.workspaceId) });
    },
  });
}
