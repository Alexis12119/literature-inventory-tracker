import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

export function Button({
  children,
  variant = "primary",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-white hover:bg-accent-hover",
        variant === "secondary" &&
          "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
        variant === "ghost" && "text-zinc-700 hover:bg-zinc-100",
        variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm shadow-zinc-900/[0.02]",
        "placeholder:text-zinc-400 focus:border-accent focus:outline-2 focus:outline-accent",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm shadow-zinc-900/[0.02]",
        "focus:border-accent focus:outline-2 focus:outline-accent",
        props.className,
      )}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "border-zinc-300 bg-zinc-50 text-zinc-700",
        tone === "success" && "border-emerald-300 bg-emerald-50 text-emerald-800",
        tone === "warning" && "border-amber-300 bg-amber-50 text-amber-800",
        tone === "danger" && "border-red-300 bg-red-50 text-red-800",
        tone === "info" && "border-[#cbd9cd] bg-[#edf4ee] text-[#315b4b]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center">
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-zinc-500">{hint}</p> : null}
      {action}
    </div>
  );
}

export function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-800">{label}</span>
      {children}
    </label>
  );
}

/**
 * Pinned filter/selector toolbar. Docks flush to the top of the scrolling
 * main column (the mobile header lives outside that scroll container, so no
 * top offset is needed) with a solid background and crisp bottom edge, so
 * table content slides underneath with no visible gap. Parent page padding
 * is cancelled with negative margins so the bar spans the full content width.
 */
export function StickyBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 -mx-3 border-b border-[#e1e7e1]/90 bg-[#f5f7f4]/95 px-3 py-3 backdrop-blur-md sm:-mx-5 sm:px-5 md:-mx-8 md:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
