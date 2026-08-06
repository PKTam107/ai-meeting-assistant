"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getOrNull } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { summaryApi } from "@/features/meetings/services/summary.api";

export function useSummary(meetingId: string) {
  return useQuery({
    queryKey: queryKeys.summary(meetingId),
    queryFn: () => getOrNull(summaryApi.get(meetingId)),
  });
}

export function useStartSummary(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => summaryApi.start(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.summary(meetingId) });
    },
  });
}
