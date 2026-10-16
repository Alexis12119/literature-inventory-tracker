import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { AuthLayout } from "@/src/components/auth/AuthLayout";
import { SignOutButton } from "@/src/components/auth/SignOutButton";

const STEPS = [
  { label: "Registered", done: true },
  { label: "Email confirmed", done: true },
  { label: "Administrator approval", done: false },
];

export default function PendingPage() {
  return (
    <AuthLayout
      title="Awaiting approval"
      hint="Your registration was received. Access to the inventory opens once an administrator approves the account."
    >
      <ol className="flex flex-col gap-2">
        {STEPS.map((s) => (
          <li
            key={s.label}
            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${
              s.done ? "border-zinc-200 bg-zinc-50 text-zinc-700" : "border-amber-300 bg-amber-50 text-amber-900"
            }`}
          >
            <span
              aria-hidden
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                s.done ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
              }`}
            >
              {s.done ? <Check size={13} /> : <Clock size={13} />}
            </span>
            <span className="font-medium">{s.label}</span>
            {!s.done && <span className="ml-auto text-xs">in progress</span>}
          </li>
        ))}
      </ol>
      <p className="text-xs text-zinc-500">
        If you believe this is a mistake, contact the congregation literature servant.
      </p>
      <div className="flex gap-2">
        <SignOutButton />
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
        >
          Try again
        </Link>
      </div>
    </AuthLayout>
  );
}
