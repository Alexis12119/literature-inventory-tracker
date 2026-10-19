"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/src/lib/supabase/browser";
import { useConfirm } from "@/src/components/ui/confirm";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  return (
    <button
      type="button"
      aria-label="Sign out"
      title="Sign out"
      onClick={async () => {
        if (
          !(await confirm({
            title: "Sign out?",
            message: "You will need to sign in again to access the inventory.",
            confirmLabel: "Sign out",
          }))
        ) {
          return;
        }
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
      className={
        compact
          ? "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-white hover:text-zinc-800"
          : "inline-flex min-h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold hover:bg-zinc-50"
      }
    >
      <LogOut size={14} aria-hidden /> {!compact && "Sign out"}
    </button>
  );
}
