/**
 * useDbMutation — counterpart to useDbQuery for writes.
 *
 * Lifecycle:
 *   1. caller invokes `mutate(vars)`
 *   2. `onMutate` runs synchronously and may return a context value used by
 *      onSuccess/onError (e.g. a snapshot for rollback)
 *   3. `fn(vars)` runs; on resolve → onSuccess + invalidate; on reject →
 *      onError + invalidate (we still invalidate so partially-applied
 *      side effects don't show stale data)
 *
 * Status transitions: idle → loading → (success | error). Re-fires reset
 * to loading. The hook resolves the mutation promise either way so callers
 * can `await mutate(...)` without try/catch (status is the source of
 * truth).
 *
 * Optimistic updates: keep them in `onMutate` (mutate the cache via your
 * own helper) and roll back in `onError`. We deliberately do not embed an
 * optimistic API into this hook — it stays small and predictable.
 */

import { useCallback, useRef, useState } from "react";
import { invalidateQuery } from "./useDbQuery";

export type MutationStatus = "idle" | "loading" | "success" | "error";

export interface MutationOptions<TVars, TResult, TContext> {
  /**
   * Synchronous hook fired before `fn`. Return a context value that will
   * be passed to onSuccess/onError. Useful for snapshotting state before
   * an optimistic update.
   */
  onMutate?: (vars: TVars) => TContext | undefined;
  onSuccess?: (result: TResult, vars: TVars, context: TContext | undefined) => void;
  onError?: (err: unknown, vars: TVars, context: TContext | undefined) => void;
  /**
   * Query keys to invalidate after the mutation settles (success OR
   * error). Pass arrays; each is fed to `invalidateQuery`.
   */
  invalidates?: readonly (readonly unknown[])[];
}

export interface MutationResult<TVars, TResult> {
  mutate: (vars: TVars) => Promise<TResult | undefined>;
  status: MutationStatus;
  error: unknown;
  reset: () => void;
}

export function useDbMutation<TVars, TResult, TContext = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  opts?: MutationOptions<TVars, TResult, TContext>
): MutationResult<TVars, TResult> {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const [status, setStatus] = useState<MutationStatus>("idle");
  const [error, setError] = useState<unknown>(null);

  const mutate = useCallback(async (vars: TVars): Promise<TResult | undefined> => {
    const o = optsRef.current;
    setStatus("loading");
    setError(null);
    const context = o?.onMutate ? o.onMutate(vars) : undefined;
    try {
      const result = await fnRef.current(vars);
      setStatus("success");
      o?.onSuccess?.(result, vars, context);
      // Invalidate after success so subsequent reads see the new state.
      o?.invalidates?.forEach((k) => invalidateQuery(k));
      return result;
    } catch (e) {
      setError(e);
      setStatus("error");
      o?.onError?.(e, vars, context);
      // Even on error, invalidate — a partial write may have hit storage.
      o?.invalidates?.forEach((k) => invalidateQuery(k));
      return undefined;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { mutate, status, error, reset };
}
