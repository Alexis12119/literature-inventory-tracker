"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Input } from "@/src/components/ui/controls";
import { PasswordInput } from "@/src/components/ui/PasswordInput";
import { createClient } from "@/src/lib/supabase/browser";
import { useIsAdmin } from "@/src/components/auth/session";
import { getPublicSettings, saveCongregation } from "@/src/features/settings/actions";

function ChangePasswordCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password.length < 8) {
      setMessage({ tone: "err", text: "Use at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setMessage({ tone: "err", text: "Passwords do not match." });
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage({ tone: "err", text: error.message });
        return;
      }
      setPassword("");
      setConfirm("");
      setMessage({ tone: "ok", text: "Password changed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold">Change password</h2>
      <form onSubmit={submit} className="mt-2 flex max-w-sm flex-col gap-2">
        <PasswordInput label="New password (min 8 characters)" value={password} onChange={setPassword} autoComplete="new-password" required />
        <PasswordInput label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" required />
        {message && (
          <p
            role={message.tone === "err" ? "alert" : "status"}
            className={`rounded-md px-3 py-2 text-sm ${message.tone === "err" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}
          >
            {message.text}
          </p>
        )}
        <Button type="submit" disabled={busy} className="self-start">
          {busy ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </section>
  );
}

function CongregationCard() {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getPublicSettings();
        if (!cancelled) {
          setName(s.congregationName);
          setNumber(s.congregationNumber);
        }
      } catch {
        /* shown on save instead */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold">Congregation</h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        Printed in report headers, e.g. San Francisco - San Pablo City LAG (30890).
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
          Congregation name
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="San Francisco - San Pablo City LAG" aria-label="Congregation name" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
          Number
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="30890" aria-label="Congregation number" />
        </label>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await saveCongregation(name, number);
              setSaved(true);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not save.");
            } finally {
              setBusy(false);
            }
          }}
          className="self-start"
        >
          {busy ? "Saving…" : "Save congregation"}
        </Button>
        {saved && !error && <span className="text-xs text-emerald-700">Saved.</span>}
        {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const isAdmin = useIsAdmin();
  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold tracking-tight">Settings</h1>
        <Badge tone="neutral">Shared database</Badge>
      </div>
      {isAdmin && <CongregationCard />}
      <ChangePasswordCard />
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Application</h2>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-zinc-500">Reporting cycles</dt><dd className="font-medium">Continuous from Mar 2024 · + adds a service year</dd></div>
          <div><dt className="text-zinc-500">Languages</dt><dd className="font-medium">English · Tagalog (separate)</dd></div>
          <div><dt className="text-zinc-500">Storage</dt><dd className="font-medium">Shared Supabase database</dd></div>
          <div><dt className="text-zinc-500">Accounts & roles</dt><dd className="font-medium">Supabase Auth · approval-gated</dd></div>
        </dl>
      </section>
    </div>
  );
}

