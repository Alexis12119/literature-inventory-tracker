import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { buildDisplayName } from "@/src/lib/domain/display-name";

export type AppRole = "administrator" | "literature_servant";

export interface SessionUser {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string;
  /** Null when the role store is unreachable — standard UI stays visible,
   *  privileged UI stays hidden. */
  role: AppRole | null;
}

export function displayNameOf(parts: {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
}): string {
  return buildDisplayName(parts);
}

/**
 * Best-effort session user for layouts/shell. Returns null only when logged
 * out, pending, or suspended. When the service key is missing/unreachable it
 * degrades to session identity with an unknown role instead of logging the
 * user out of the shell — standard navigation keeps working while admin
 * features (which fail closed) wait for configuration.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const fallback: SessionUser = {
    id: user.id,
    firstName: str(meta["first_name"]),
    middleName: str(meta["middle_name"]) || null,
    lastName: str(meta["last_name"]),
    displayName:
      [str(meta["first_name"]), str(meta["last_name"])].filter(Boolean).join(" ") ||
      user.email ||
      "Account",
    role: null,
  };
  try {
    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("first_name, middle_name, last_name, is_deactivated")
      .eq("id", user.id)
      .single();
    const { data: roleRow } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (!profile || profile.is_deactivated || !roleRow) return null;
    return {
      id: user.id,
      firstName: profile.first_name,
      middleName: profile.middle_name,
      lastName: profile.last_name,
      displayName: displayNameOf(profile),
      role: roleRow.role as AppRole,
    };
  } catch {
    return fallback;
  }
}

/**
 * Authenticate + authorize a standard user. New registrations land
 * deactivated (pending admin approval): they are signed out and sent back
 * with an explanatory flag instead of entering the app.
 */
export async function requireUser(): Promise<SessionUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("first_name, middle_name, last_name, is_deactivated")
    .eq("id", user.id)
    .single();
  if (!profile || profile.is_deactivated) {
    await supabase.auth.signOut();
    redirect("/sign-in?pending=1");
  }
  const { data: roleRow } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (!roleRow) {
    await supabase.auth.signOut();
    redirect("/sign-in?pending=1");
  }
  return {
    id: user.id,
    firstName: profile.first_name,
    middleName: profile.middle_name,
    lastName: profile.last_name,
    displayName: displayNameOf(profile),
    role: roleRow.role as AppRole,
  };
}

/** Administrator tier for user approval, catalog, and settings. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "administrator") redirect("/unauthorized");
  return user;
}
