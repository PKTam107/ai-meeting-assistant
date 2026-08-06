"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getOrNull } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { transcriptApi } from "@/features/meetings/services/transcript.api";

export function useTranscript(meetingId: string) {
  return useQuery({
    queryKey: queryKeys.transcript(meetingId),
    queryFn: () => getOrNull(transcriptApi.get(meetingId)),
  });
}

export function useStartTranscript(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => transcriptApi.start(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transcript(meetingId) });
    },
  });
}
