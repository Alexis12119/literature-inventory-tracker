import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-lg font-bold">Page not found</h1>
      <p className="text-sm text-zinc-500">
        The page you opened does not exist in this inventory workspace.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
