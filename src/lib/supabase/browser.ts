"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/src/lib/supabase/env";

export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
