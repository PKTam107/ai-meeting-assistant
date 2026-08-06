import { request } from "@/lib/api";
import type { Meeting } from "@/lib/types";

export const meetingsApi = {
  listForWorkspace: (workspaceId: string) =>
    request<Meeting[]>({ method: "GET", url: `/workspaces/${workspaceId}/meetings` }),
  get: (id: string) => request<Meeting>({ method: "GET", url: `/meetings/${id}` }),
  upload: (workspaceId: string, form: FormData) =>
    request<Meeting>({
      method: "POST",
      url: `/workspaces/${workspaceId}/meetings`,
      data: form,
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id: string, data: { title?: string; description?: string }) =>
    request<Meeting>({ method: "PATCH", url: `/meetings/${id}`, data }),
  remove: (id: string) => request<void>({ method: "DELETE", url: `/meetings/${id}` }),
};
