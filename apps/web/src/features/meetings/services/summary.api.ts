import { request } from "@/lib/api";
import type { Summary } from "@/lib/types";

export const summaryApi = {
  get: (meetingId: string) =>
    request<Summary>({ method: "GET", url: `/meetings/${meetingId}/summary` }),
  start: (meetingId: string) =>
    request<Summary>({ method: "POST", url: `/meetings/${meetingId}/summary` }),
};
