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
              s.done ? "border-zinc-200 bg-white text-zinc-700" : "border-[#d9e5dd] bg-[#f2f7f3] text-[#294b3b]"
            }`}
          >
            <span
              aria-hidden
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                s.done ? "bg-[#557a66] text-white" : "bg-[#315b4b] text-white"
              }`}
            >
              {s.done ? <Check size={13} /> : <Clock size={13} />}
            </span>
            <span className="font-medium">{s.label}</span>
            {!s.done && <span className="ml-auto rounded-full bg-white px-2 py-1 text-xs font-medium text-[#315b4b]">In progress</span>}
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
          className="inline-flex min-h-10 items-center rounded-lg bg-[#315b4b] px-4 text-sm font-semibold text-white hover:bg-[#284c3e]"
        >
          Try again
        </Link>
      </div>
    </AuthLayout>
  );
}
