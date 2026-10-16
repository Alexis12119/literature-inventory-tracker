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
        className="inline-flex h-9 items-center rounded-md bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
