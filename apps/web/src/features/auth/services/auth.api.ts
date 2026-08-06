import { request } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>({ method: "POST", url: "/auth/login", data: { email, password } }),
  register: (email: string, password: string) =>
    request<AuthResponse>({ method: "POST", url: "/auth/register", data: { email, password } }),
};
