"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function PasswordInput({
  value,
  onChange,
  label,
  autoComplete,
  required,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700">
      {label}
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          className={cn(
            "h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 pr-10 text-sm text-zinc-900",
            "placeholder:text-zinc-400 focus:border-blue-700 focus:outline-2 focus:outline-blue-700",
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          {visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </span>
    </label>
  );
}
