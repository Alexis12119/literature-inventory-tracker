"use client";

import { useCallback, useEffect, useState } from "react";

export interface AppSettings {
  congregationName: string;
  congregationNumber: string;
}

const STORAGE_KEY = "litinv:settings-v1";

const BLANK: AppSettings = { congregationName: "", congregationNumber: "" };

function load(): AppSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return BLANK;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      congregationName: typeof parsed.congregationName === "string" ? parsed.congregationName : "",
      congregationNumber: typeof parsed.congregationNumber === "string" ? parsed.congregationNumber : "",
    };
  } catch {
    return BLANK;
  }
}

/** Congregation identity used in report headers. Persisted locally. */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(BLANK);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setSettings(load());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* local preview cache only */
      }
      return next;
    });
  }, []);

  return { settings, update };
}

export function congregationLine(s: AppSettings): string {
  const name = s.congregationName.trim();
  const num = s.congregationNumber.trim();
  if (name && num) return `${name} (${num})`;
  return name || num;
}
