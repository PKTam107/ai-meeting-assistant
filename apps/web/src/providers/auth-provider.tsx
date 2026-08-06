"use client";

import { ReactNode, useEffect } from "react";

import { setOnAuthFailure } from "@/lib/api";
import { useAuth } from "@/store/auth";

/**
 * Restores the session on first load (via the refresh cookie) and wires the
 * axios "refresh failed" hook to clear the store so guarded pages bounce to
 * /login.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const bootstrap = useAuth((s) => s.bootstrap);

  useEffect(() => {
    setOnAuthFailure(() => useAuth.setState({ user: null }));
    void bootstrap();
  }, [bootstrap]);

  return <>{children}</>;
}
