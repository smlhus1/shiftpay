/**
 * Wall-clock abstraction.
 *
 * Anything that needs "what time is it now" should depend on a Clock instead
 * of calling `Date.now()` or `new Date()` directly. The default `realClock`
 * is the production implementation; tests inject a fixed or fast-forwarding
 * clock so behaviour is deterministic without a flaky timezone-sensitive
 * dance against the real system clock.
 *
 * Design choice: Clock is just `() => Date`. No interface, no class — it
 * stays callable, easy to type, and zero overhead. The few sites that need
 * "milliseconds since epoch" can still call `clock().getTime()`.
 *
 * Usage pattern: modules accept `clock: Clock = realClock` as the last
 * parameter so production callers don't need to thread it explicitly.
 */

export type Clock = () => Date;

/** Production wall clock — backed by the host's `Date` constructor. */
export const realClock: Clock = () => new Date();

/**
 * Helper for tests: pin the clock to a single instant. Returned function
 * yields a fresh Date on every call so callers can mutate the result safely.
 */
export function fixedClock(at: Date | string | number): Clock {
  const ms = typeof at === "number" ? at : new Date(at).getTime();
  return () => new Date(ms);
}
