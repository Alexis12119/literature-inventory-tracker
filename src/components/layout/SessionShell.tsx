import type { ReactNode } from "react";
import { connection } from "next/server";
import { AppShell } from "@/src/components/layout/AppShell";
import { getSessionUser } from "@/src/lib/auth/gates";

/**
 * Session boundary: resolves the user (cookies) inside Suspense so public
 * pages still prerender. `connection()` opts this subtree out of static
 * rendering (required: the auth session clock is request-time data, and the
 * `dynamic` segment config is incompatible with cacheComponents).
 */
export default async function SessionShell({ children }: { children: ReactNode }) {
  await connection();
  const user = await getSessionUser().catch(() => null);
  return (
    <AppShell user={user ? { displayName: user.displayName, role: user.role } : null}>
      {children}
    </AppShell>
  );
}
