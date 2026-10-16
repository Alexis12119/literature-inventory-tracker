import "server-only";

import { createClient as createAnonClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/src/lib/supabase/env";

/**
 * Service-role client for trusted server-side operations ONLY.
 * Bypasses grants — every use must follow an explicit requireUser/requireAdmin
 * authorization check in the same call path. Never import from client code.
 */
export function createServiceClient() {
  const { url } = supabaseEnv();
  // Server-only names only. Never read a NEXT_PUBLIC_ secret here: those are
  // bundled into browser JavaScript. Rename such entries to drop the prefix.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) {
    throw new Error(
      "Missing server secret: set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) without a NEXT_PUBLIC_ prefix.",
    );
  }
  return createAnonClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
