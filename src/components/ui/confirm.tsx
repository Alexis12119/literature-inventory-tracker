"use client";

import { createContext, useCallback, useContext, useRef, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/src/components/ui/controls";
import { cn } from "@/src/lib/utils";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface PendingRequest {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Ask the user to confirm. Resolves true on confirm, false on cancel/dismiss. */
export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider.");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Omit<PendingRequest, "resolve"> | null>(null);
  const resolveRef = useRef<(ok: boolean) => void>(() => {});

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setRequest({ confirmLabel: "Confirm", ...opts });
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolveRef.current(ok);
    setRequest(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center"
          role="alertdialog"
          aria-modal="true"
          aria-label={request.title}
          onClick={() => settle(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") settle(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold">{request.title}</h2>
            {request.message && <p className="mt-1 text-sm text-zinc-600">{request.message}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" autoFocus onClick={() => settle(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={request.danger ? "danger" : "primary"}
                onClick={() => settle(true)}
              >
                {request.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

type ConfirmActionProps = {
  run: () => void | Promise<void>;
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  className?: string;
  disabled?: boolean;
  label: string;
  children: ReactNode;
};

/**
 * Button that confirms first, then runs (typically a Server Action).
 * For use inside Server Components that cannot call hooks themselves.
 */
export function ConfirmAction({
  run,
  title,
  message,
  confirmLabel,
  danger,
  className,
  disabled,
  label,
  children,
}: ConfirmActionProps) {
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={disabled || pending}
      title={label}
      aria-label={label}
      onClick={async () => {
        if (await confirm({ title, message, confirmLabel, danger })) {
          startTransition(() => {
            void run();
          });
        }
      }}
      className={cn(
        "rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50",
        danger && "border-red-300 text-red-700 hover:bg-red-50",
        className,
      )}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
