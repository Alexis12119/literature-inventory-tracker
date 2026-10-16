"use client";

import { createContext, useContext } from "react";
import type { AppRole } from "@/src/lib/auth/gates";

export interface ShellUser {
  displayName: string;
  role: AppRole | null;
}

const SessionContext = createContext<ShellUser | null>(null);

export const SessionProvider = SessionContext.Provider;

/** Session of the signed-in user, or null when logged out. */
export function useSession(): ShellUser | null {
  return useContext(SessionContext);
}

/** True only for a confirmed administrator — gate all privileged UI on this. */
export function useIsAdmin(): boolean {
  return useContext(SessionContext)?.role === "administrator";
}
