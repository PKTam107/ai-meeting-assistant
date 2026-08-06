import { request } from "@/lib/api";
import type { Transcript } from "@/lib/types";

export const transcriptApi = {
  get: (meetingId: string) =>
    request<Transcript>({ method: "GET", url: `/meetings/${meetingId}/transcript` }),
  start: (meetingId: string) =>
    request<Transcript>({ method: "POST", url: `/meetings/${meetingId}/transcript` }),
};
