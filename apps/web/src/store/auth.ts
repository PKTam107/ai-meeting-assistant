import { create } from "zustand";

import { request, setAccessToken } from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  /** True until the initial session bootstrap (refresh + /me) finishes. */
  loading: boolean;
  setSession: (auth: AuthResponse) => void;
  /** Try to restore a session from the refresh-token cookie on app load. */
  bootstrap: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setSession: ({ user, accessToken }) => {
    setAccessToken(accessToken);
    set({ user, loading: false });
  },

  bootstrap: async () => {
    try {
      // No access token in memory yet — ask for a fresh one via the cookie.
      const { accessToken } = await request<{ accessToken: string }>({
        method: "POST",
        url: "/auth/refresh",
      });
      setAccessToken(accessToken);
      const user = await request<User>({ method: "GET", url: "/auth/me" });
      set({ user, loading: false });
    } catch {
      setAccessToken(null);
      set({ user: null, loading: false });
    }
  },

  logout: async () => {
    try {
      await request({ method: "POST", url: "/auth/logout" });
    } catch {
      // Ignore — clear local state regardless.
    }
    setAccessToken(null);
    set({ user: null });
  },
}));
