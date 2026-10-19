"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/src/lib/supabase/browser";
import { registrationSchema } from "@/src/lib/validation/inventory";
import { Button, Input } from "@/src/components/ui/controls";
import { AuthLayout } from "@/src/components/auth/AuthLayout";
import { PasswordInput } from "@/src/components/ui/PasswordInput";

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = registrationSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            first_name: parsed.data.firstName.trim(),
            middle_name: parsed.data.middleName?.trim() || null,
            last_name: parsed.data.lastName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthLayout
        title="Registration received"
        hint="Your account is created. Two short steps remain."
      >
        <ol className="flex flex-col gap-3 text-sm leading-5 text-zinc-700">
          <li className="flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
            <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#315b4b] text-xs font-bold text-white">1</span>
            Confirm your email address via the link just sent to it.
          </li>
          <li className="flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
            <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#315b4b] text-xs font-bold text-white">2</span>
            An administrator reviews the registration. You can sign in once the account is approved.
          </li>
        </ol>
        <Link href="/sign-in" className="text-sm font-semibold text-[#315b4b] hover:underline">
          Go to sign-in
        </Link>
      </AuthLayout>
    );
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AuthLayout
      title="Create your account"
      hint="Literature servants register here. Accounts start pending until an administrator approves them."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            First name *<Input value={form.firstName} onChange={set("firstName")} autoComplete="given-name" required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            Middle name<Input value={form.middleName} onChange={set("middleName")} autoComplete="additional-name" />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          Last name *<Input value={form.lastName} onChange={set("lastName")} autoComplete="family-name" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          Email *<Input type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
        </label>
        <PasswordInput
          label="Password (min 8 characters) *"
          value={form.password}
          onChange={(v) => setForm((f) => ({ ...f, password: v }))}
          autoComplete="new-password"
          required
        />
        <PasswordInput
          label="Confirm password *"
          value={form.confirmPassword}
          onChange={(v) => setForm((f) => ({ ...f, confirmPassword: v }))}
          autoComplete="new-password"
          required
        />
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="auth-primary w-full">
          {busy ? "Registering…" : "Register"}
        </Button>
      </form>
      <p className="border-t border-zinc-200 pt-4 text-sm text-zinc-600">
        Already registered?{" "}
        <Link href="/sign-in" className="font-semibold text-[#315b4b] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
