"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/src/lib/supabase/browser";
import { Button, Input } from "@/src/components/ui/controls";
import { AuthLayout } from "@/src/components/auth/AuthLayout";
import { PasswordInput } from "@/src/components/ui/PasswordInput";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const pending = params.get("pending") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        setError(
          /confirm/i.test(signInError.message)
            ? "Confirm your email address first (check your inbox), then sign in."
            : signInError.message,
        );
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" hint="Sign in to continue to the shared literature inventory.">
      {pending && (
        <p role="status" className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          That account is pending administrator approval or has been suspended. You will be able
          to sign in once it is approved.
        </p>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
          Email<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <PasswordInput
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <Link href="/register" className="text-sm font-medium text-blue-700 hover:underline">
        New here? Register
      </Link>
    </AuthLayout>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
