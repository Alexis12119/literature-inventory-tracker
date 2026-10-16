import Link from "next/link";

export default function Unauthorized() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-lg font-bold">Sign-in required</h1>
      <p className="text-sm text-zinc-500">
        Server-side accounts arrive with the backend milestone. This frontend
        preview does not enforce sign-in yet.
      </p>
      <Link
        href="/"
        className="inline-flex h-9 items-center rounded-md bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
      >
        Continue to dashboard
      </Link>
    </div>
  );
}
