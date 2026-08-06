import { request } from "@/lib/api";
import type { Workspace, WorkspaceMember } from "@/lib/types";

export const workspacesApi = {
  list: () => request<Workspace[]>({ method: "GET", url: "/workspaces" }),
  get: (id: string) => request<Workspace>({ method: "GET", url: `/workspaces/${id}` }),
  create: (name: string) =>
    request<Workspace>({ method: "POST", url: "/workspaces", data: { name } }),
  update: (id: string, name: string) =>
    request<Workspace>({ method: "PATCH", url: `/workspaces/${id}`, data: { name } }),
  remove: (id: string) => request<void>({ method: "DELETE", url: `/workspaces/${id}` }),
  members: (id: string) =>
    request<WorkspaceMember[]>({ method: "GET", url: `/workspaces/${id}/members` }),
  addMember: (id: string, email: string, role?: string) =>
    request<WorkspaceMember>({
      method: "POST",
      url: `/workspaces/${id}/members`,
      data: { email, role },
    }),
  removeMember: (id: string, userId: string) =>
    request<void>({ method: "DELETE", url: `/workspaces/${id}/members/${userId}` }),
};
