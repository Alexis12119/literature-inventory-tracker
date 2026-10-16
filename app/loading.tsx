export default function Loading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      <div className="h-6 w-48 animate-pulse rounded bg-zinc-200" />
      <div className="h-40 animate-pulse rounded-lg border border-zinc-200 bg-white" />
      <div className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-white" />
    </div>
  );
}
