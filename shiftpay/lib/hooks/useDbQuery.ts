/**
 * useDbQuery — minimal keyed-cache fetch hook for ShiftPay.
 *
 * Replaces the imperative useState + useEffect + manual refetch pattern
 * that every screen reinvented. ~120 LOC, no React Query dep, keeps the
 * runtime cost negligible.
 *
 * Behaviour:
 *   - Calls `fetcher` on mount and on every `key` change. Stores the result
 *     in a module-level cache keyed by `JSON.stringify(key)`.
 *   - All subscribers to the same key share the cached entry, so two
 *     components that ask for the same data only fetch once.
 *   - `invalidate(key)` triggers a re-fetch and pushes new data to every
 *     subscriber. Call from useDbMutation (or directly) after writes.
 *   - Refetches automatically on `useFocusEffect` so a screen returning
 *     from a child screen always sees fresh data.
 *   - Stale-while-revalidate: a re-fetch keeps the previous `data` visible
 *     while loading; only `status` flips to "loading" if there is no
 *     cached data yet.
 *
 * Non-goals:
 *   - No retry, no exponential backoff, no auto-pause on offline.
 *   - No infinite queries / pagination.
 *   - No Suspense.
 *   - No global devtools.
 *
 * Open these up later if a screen actually needs them.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

export type QueryStatus = "idle" | "loading" | "success" | "error";

export interface QueryResult<T> {
  data: T | undefined;
  status: QueryStatus;
  error: unknown;
  refetch: () => Promise<void>;
}

interface CacheEntry<T> {
  data: T | undefined;
  status: QueryStatus;
  error: unknown;
  /** Active subscriber callbacks (one per useDbQuery instance). */
  subscribers: Set<(entry: CacheEntry<T>) => void>;
  /** In-flight fetch promise, deduped across concurrent subscribers. */
  inflight: Promise<void> | null;
  /**
   * Wrapper that calls the most recently subscribed fetcher. Stored on
   * the entry so invalidateQuery can re-fetch even when no useDbQuery
   * effect-rerun is around to do it. Cleared when the last subscriber
   * unmounts.
   */
  lastFetch: (() => Promise<unknown>) | null;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getOrCreateEntry<T>(key: string): CacheEntry<T> {
  let entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    entry = {
      data: undefined,
      status: "idle",
      error: null,
      subscribers: new Set(),
      inflight: null,
      lastFetch: null,
    };
    cache.set(key, entry as CacheEntry<unknown>);
  }
  return entry;
}

function notify<T>(entry: CacheEntry<T>): void {
  for (const cb of entry.subscribers) cb(entry);
}

async function runFetch<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
  const entry = getOrCreateEntry<T>(key);
  if (entry.inflight) return entry.inflight;

  // First-load → loading state. Subsequent fetches keep the previous data
  // visible (stale-while-revalidate) so screens don't flicker on refocus.
  if (entry.data === undefined) {
    entry.status = "loading";
    entry.error = null;
    notify(entry);
  }

  const p = (async () => {
    try {
      const data = await fetcher();
      entry.data = data;
      entry.status = "success";
      entry.error = null;
    } catch (err) {
      entry.error = err;
      entry.status = "error";
    } finally {
      entry.inflight = null;
      notify(entry);
    }
  })();

  entry.inflight = p;
  return p;
}

/**
 * Subscribe to a cached query. Re-fetches on key change and on
 * `useFocusEffect`. The `enabled` flag short-circuits everything so callers
 * can defer fetches until prerequisites are ready.
 */
export function useDbQuery<T>(
  key: readonly unknown[],
  fetcher: () => Promise<T>,
  opts?: { enabled?: boolean }
): QueryResult<T> {
  const enabled = opts?.enabled ?? true;
  const keyStr = JSON.stringify(key);
  // Stable reference to the latest fetcher — avoids stale-closure bugs
  // without forcing callers to wrap in useCallback.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [snapshot, setSnapshot] = useState<{
    data: T | undefined;
    status: QueryStatus;
    error: unknown;
  }>(() => {
    const entry = getOrCreateEntry<T>(keyStr);
    return { data: entry.data, status: entry.status, error: entry.error };
  });

  useEffect(() => {
    if (!enabled) return;
    const entry = getOrCreateEntry<T>(keyStr);
    // Stable wrapper that always calls the latest fetcher — gives
    // invalidateQuery a way to re-run the fetch without needing a hook
    // effect to fire again.
    const stableFetch = () => fetcherRef.current();
    entry.lastFetch = stableFetch as () => Promise<unknown>;

    const cb = (e: CacheEntry<T>) => {
      setSnapshot({ data: e.data, status: e.status, error: e.error });
    };
    entry.subscribers.add(cb);
    // Sync UI to whatever cache holds right now (covers re-mounts).
    cb(entry);
    // Kick off a fetch unless one is already running and we have data.
    if (entry.status === "idle" || entry.data === undefined) {
      void runFetch(keyStr, stableFetch);
    }
    return () => {
      entry.subscribers.delete(cb);
      // Clear lastFetch only if WE installed it; another subscriber may
      // have replaced it with their own fetcher.
      if (entry.lastFetch === stableFetch) entry.lastFetch = null;
    };
  }, [enabled, keyStr]);

  // Refetch when the screen regains focus (e.g. user returns from a child).
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      void runFetch(keyStr, fetcherRef.current);
    }, [enabled, keyStr])
  );

  const refetch = useCallback(async () => {
    if (!enabled) return;
    await runFetch(keyStr, fetcherRef.current);
  }, [enabled, keyStr]);

  return { ...snapshot, refetch };
}

/**
 * Drop the cache for `key` and re-fetch from the most recent `fetcher`
 * known for it (the last one a useDbQuery subscribed with). All current
 * subscribers receive the new data via their setState callbacks.
 *
 * Safe to call even if no one is currently subscribed — it just clears
 * the entry so the next mount fetches fresh.
 */
export function invalidateQuery(key: readonly unknown[]): void {
  const keyStr = JSON.stringify(key);
  const entry = cache.get(keyStr);
  if (!entry) return;
  // Drop cached data so the next subscriber kicks off a fetch from idle.
  entry.data = undefined;
  entry.status = "idle";
  entry.error = null;
  entry.inflight = null;
  notify(entry);
  // If we still have an active subscriber, immediately re-fetch using its
  // last-known fetcher. Without this, a screen sitting on the page would
  // show stale-because-cleared until something else triggered a remount.
  if (entry.lastFetch && entry.subscribers.size > 0) {
    void runFetch(keyStr, entry.lastFetch as () => Promise<unknown>);
  }
}

/**
 * Test-only: wipe the cache between tests so module state doesn't leak.
 */
export function _resetQueryCache(): void {
  cache.clear();
}
