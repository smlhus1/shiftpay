/**
 * RolledNumber — animates a numeric value from 0 (or a start) to target with
 * ease-out-cubic over ~1.4s. Used for diff-display on Summary (DESIGN.md §11)
 * and any KPI moment where the reveal itself carries weight.
 *
 * Respects prefers-reduced-motion via AccessibilityInfo.
 */

import { useEffect, useRef, useState } from "react";
import { Text, type TextProps, AccessibilityInfo } from "react-native";

interface RolledNumberProps extends TextProps {
  value: number;
  /** Duration in ms. Default 1400. */
  duration?: number;
  /** Start value to animate from. Default 0. */
  from?: number;
  /** Formatter — e.g. (n) => `${Math.round(n)} kr`. Default: Math.round + " kr". */
  format?: (n: number) => string;
  /** Called once when animation completes (e.g. to trigger haptic). */
  onComplete?: () => void;
}

/**
 * Ease-out-cubic: starts fast, decelerates. Matches web landing site's diff-teller
 * implementation (shiftpay-site/index.html).
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const DEFAULT_FORMAT = (n: number): string =>
  `${Math.round(n)
    .toLocaleString("nb-NO")
    .replace(/\u202F/g, "\u00A0")}\u00A0kr`;

export function RolledNumber({
  value,
  duration = 1400,
  from = 0,
  format = DEFAULT_FORMAT,
  onComplete,
  ...textProps
}: RolledNumberProps) {
  const [display, setDisplay] = useState(from);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Respect reduced-motion preference — snap to final value.
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        setDisplay(value);
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onComplete?.();
        }
        return;
      }

      startRef.current = null;
      hasCompletedRef.current = false;
      const span = value - from;

      const tick = (timestamp: number) => {
        if (cancelled) return;
        if (startRef.current === null) startRef.current = timestamp;
        const elapsed = timestamp - startRef.current;
        const t = Math.min(1, elapsed / duration);
        const eased = easeOutCubic(t);
        setDisplay(from + span * eased);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onComplete?.();
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <Text {...textProps}>{format(display)}</Text>;
}
