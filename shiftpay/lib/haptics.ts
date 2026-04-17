/**
 * Haptic signature — three weights, used sparingly at specific moments.
 * Per DESIGN.md §11.3.
 *
 *   light   — toggle accept/decline, pull-to-refresh, nav-tab-change
 *   medium  — OCR finished, calculation complete (something happened)
 *   heavy   — diff result revealed (weight to the moment)
 *
 * Safe on all platforms — Haptics.impactAsync silently no-ops on web /
 * emulators lacking a taptic engine, and we swallow errors regardless.
 */

import * as Haptics from "expo-haptics";

export async function hapticLight(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* no taptic, no problem */
  }
}

export async function hapticMedium(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    /* noop */
  }
}

export async function hapticHeavy(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    /* noop */
  }
}

/** Success notification — used when confirming a shift. */
export async function hapticSuccess(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* noop */
  }
}

/** Warning notification — used when flagging an unpaid amount. */
export async function hapticWarning(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    /* noop */
  }
}
