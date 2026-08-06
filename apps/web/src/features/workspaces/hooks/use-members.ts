"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { workspacesApi } from "@/features/workspaces/services/workspaces.api";

export function useWorkspaceMembers(workspaceId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.members(workspaceId),
    queryFn: () => workspacesApi.members(workspaceId),
    enabled: options?.enabled,
  });
}

export function useAddMember(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => workspacesApi.addMember(workspaceId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(workspaceId) });
    },
  });
}

export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => workspacesApi.removeMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(workspaceId) });
    },
  });
}
