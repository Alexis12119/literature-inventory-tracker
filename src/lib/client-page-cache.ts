"use client";

interface CacheEntry<T> {
  value?: T;
  pending?: Promise<T>;
}

/** Small per-view cache that lets pagination warm nearby pages before a click. */
export class ClientPageCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  has(key: string): boolean {
    return this.entries.get(key)?.value !== undefined;
  }

  get(key: string, load: () => Promise<T>): Promise<T> {
    const existing = this.entries.get(key);
    if (existing?.value !== undefined) return Promise.resolve(existing.value);
    if (existing?.pending) return existing.pending;

    const entry: CacheEntry<T> = {};
    const pending = load().then(
      (value) => {
        entry.value = value;
        entry.pending = undefined;
        return value;
      },
      (error: unknown) => {
        this.entries.delete(key);
        throw error;
      },
    );
    entry.pending = pending;
    this.entries.set(key, entry);
    return pending;
  }

  clear(): void {
    this.entries.clear();
  }
}
