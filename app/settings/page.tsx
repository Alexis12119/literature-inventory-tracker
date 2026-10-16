import { Badge } from "@/src/components/ui/controls";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold tracking-tight">Settings</h1>
        <Badge tone="neutral">Frontend preview</Badge>
      </div>
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Application</h2>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-zinc-500">Reporting cycles</dt><dd className="font-medium">Continuous from Mar 2024 · + adds a service year</dd></div>
          <div><dt className="text-zinc-500">Languages</dt><dd className="font-medium">English · Tagalog (separate)</dd></div>
          <div><dt className="text-zinc-500">Storage</dt><dd className="font-medium">This browser (localStorage)</dd></div>
          <div><dt className="text-zinc-500">Accounts & roles</dt><dd className="font-medium">Backend milestone (Supabase Auth)</dd></div>
        </dl>
      </section>
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
        Server-managed settings (access control, snapshots, database) will appear here once the
        backend milestone is implemented. Nothing here writes to the remote database.
      </section>
    </div>
  );
}
