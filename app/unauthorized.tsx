import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AuthLayout } from "@/src/components/auth/AuthLayout";

export default function Unauthorized() {
  return (
    <AuthLayout
      title="Administrator access required"
      hint="This area is for managing registrations and the publication catalog. Your account does not have administrator access."
    >
      <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-5 text-zinc-700">
        <ShieldAlert size={19} className="mt-0.5 shrink-0 text-[#587062]" aria-hidden />
        <p>You can still use the shared inventory, enter monthly counts, and view reports with your literature servant account.</p>
      </div>
      <Link href="/" className="auth-primary inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold">
        Return to inventory
      </Link>
    </AuthLayout>
  );
}
