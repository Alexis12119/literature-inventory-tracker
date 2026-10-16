"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-lg font-bold">Something went wrong</h1>
      <p className="text-sm text-zinc-500">
        {error.message || "The workspace could not be loaded. Your entered data stays in this browser."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="h-9 rounded-md bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
      >
        Try again
      </button>
    </div>
  );
}
